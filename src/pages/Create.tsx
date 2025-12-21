import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { Address, parseUnits, isAddress, maxUint256 } from 'viem';
import Button from '../components/Button';
import { FACTORY_ADDRESS, DURATION_PRESETS, DURATION_UNITS } from '../lib/constants';
import TokenAmount from '../components/TokenAmount';

const factoryAbi = [
  {
    name: 'deploy_vesting_contract',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'recipient', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'vesting_duration', type: 'uint256' },
      { name: 'vesting_start', type: 'uint256' },
      { name: 'cliff_length', type: 'uint256' },
      { name: 'open_claim', type: 'bool' },
      { name: 'support_vyper', type: 'uint256' },
      { name: 'owner', type: 'address' },
    ],
    outputs: [{ type: 'address' }],
  },
] as const;

// Vyper donation amount in basis points (100 = 1%)
const VYPER_DONATION_BPS = 100n;

const erc20Abi = [
  {
    name: 'symbol',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'string' }],
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint8' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
] as const;

type Step = 'form' | 'approve' | 'deploy' | 'success';

export default function Create() {
  const navigate = useNavigate();
  const { address: userAddress, isConnected } = useAccount();

  // Form state
  const [tokenAddress, setTokenAddress] = useState('');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [durationValue, setDurationValue] = useState('1');
  const [durationUnit, setDurationUnit] = useState(DURATION_UNITS[2].value); // years
  const [cliffValue, setCliffValue] = useState('0');
  const [cliffUnit, setCliffUnit] = useState(DURATION_UNITS[1].value); // months
  const [startNow, setStartNow] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [openClaim, setOpenClaim] = useState(false);
  const [supportVyper, setSupportVyper] = useState(false);

  const [step, setStep] = useState<Step>('form');
  const [createdEscrow, setCreatedEscrow] = useState<string>('');

  // Token data
  const validTokenAddress = isAddress(tokenAddress) ? tokenAddress : undefined;

  const { data: tokenSymbol } = useReadContract({
    address: validTokenAddress as Address,
    abi: erc20Abi,
    functionName: 'symbol',
    query: { enabled: !!validTokenAddress },
  });

  const { data: tokenDecimals } = useReadContract({
    address: validTokenAddress as Address,
    abi: erc20Abi,
    functionName: 'decimals',
    query: { enabled: !!validTokenAddress },
  });

  const { data: tokenBalance } = useReadContract({
    address: validTokenAddress as Address,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [userAddress as Address],
    query: { enabled: !!validTokenAddress && !!userAddress },
  });

  const { data: tokenAllowance, refetch: refetchAllowance } = useReadContract({
    address: validTokenAddress as Address,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [userAddress as Address, FACTORY_ADDRESS],
    query: { enabled: !!validTokenAddress && !!userAddress },
  });

  // Calculated values
  const decimals = tokenDecimals ?? 18;
  const duration = Number(durationValue) * durationUnit;
  const cliff = Number(cliffValue) * cliffUnit;
  const startTime = startNow
    ? Math.floor(Date.now() / 1000)
    : Math.floor(new Date(startDate).getTime() / 1000);

  const amountParsed = useMemo(() => {
    try {
      if (!amount || isNaN(Number(amount))) return 0n;
      return parseUnits(amount, decimals);
    } catch {
      return 0n;
    }
  }, [amount, decimals]);

  const needsApproval = tokenAllowance !== undefined && amountParsed > tokenAllowance;
  const hasBalance = tokenBalance !== undefined && amountParsed <= tokenBalance;

  // Approve transaction
  const {
    data: approveHash,
    isPending: approvePending,
    writeContract: approve,
    error: approveError,
  } = useWriteContract();

  const { isLoading: approveConfirming, isSuccess: approveSuccess } =
    useWaitForTransactionReceipt({ hash: approveHash });

  // Deploy transaction
  const {
    data: deployHash,
    isPending: deployPending,
    writeContract: deploy,
    error: deployError,
  } = useWriteContract();

  const { isLoading: deployConfirming, isSuccess: deploySuccess, data: deployReceipt } =
    useWaitForTransactionReceipt({ hash: deployHash });

  // Handle approve
  const handleApprove = () => {
    if (!validTokenAddress) return;
    setStep('approve');
    approve({
      address: validTokenAddress as Address,
      abi: erc20Abi,
      functionName: 'approve',
      args: [FACTORY_ADDRESS, maxUint256],
    });
  };

  // Handle deploy
  const handleDeploy = () => {
    if (!validTokenAddress || !isAddress(recipient) || !userAddress) return;
    setStep('deploy');
    deploy({
      address: FACTORY_ADDRESS,
      abi: factoryAbi,
      functionName: 'deploy_vesting_contract',
      args: [
        validTokenAddress as Address,
        recipient as Address,
        amountParsed,
        BigInt(duration),
        BigInt(startTime),
        BigInt(cliff),
        openClaim,
        supportVyper ? VYPER_DONATION_BPS : 0n,
        userAddress as Address,
      ],
    });
  };

  // Effect: After approval success, refetch allowance and continue
  if (approveSuccess && step === 'approve') {
    refetchAllowance();
    setStep('form');
  }

  // Effect: After deploy success, extract created escrow address
  if (deploySuccess && deployReceipt && step === 'deploy') {
    // Find the VestingEscrowCreated event
    const eventTopic = '0x99fd02dbc65944923f77d3e5d3e77e8c4c1b4026201be5445a8e827183e993e2';
    const log = deployReceipt.logs.find((l) => l.topics[0] === eventTopic);
    if (log && log.data) {
      // The escrow address is in the data field (first 32 bytes, address padded)
      const escrowAddress = '0x' + log.data.slice(26, 66);
      setCreatedEscrow(escrowAddress);
      setStep('success');
    }
  }

  // Validation
  const isValidForm =
    isAddress(tokenAddress) &&
    isAddress(recipient) &&
    amountParsed > 0n &&
    duration > 0 &&
    (startNow || startDate) &&
    cliff <= duration;

  if (!isConnected) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-primary mb-4">Create Escrow</h1>
        <p className="text-secondary">Connect your wallet to create a vesting escrow.</p>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="max-w-xl mx-auto text-center py-12">
        <h1 className="text-2xl font-bold text-primary mb-4">Escrow Created!</h1>
        <p className="text-secondary mb-6">
          Your vesting escrow has been deployed successfully.
        </p>
        <Button onClick={() => navigate(`/vest/${createdEscrow}`, { state: { fromApp: true } })}>
          View Escrow
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold text-primary mb-2">Create Escrow</h1>
      <p className="text-secondary mb-8">
        Deploy a new vesting escrow with custom parameters.
      </p>

      <div className="space-y-6">
        {/* Token Address */}
        <div>
          <label className="block text-sm font-medium text-primary mb-2">
            Token Address
          </label>
          <input
            type="text"
            value={tokenAddress}
            onChange={(e) => setTokenAddress(e.target.value)}
            placeholder="0x..."
            className="w-full px-4 py-2 border border-divider-strong rounded bg-background focus:outline-none focus:border-primary font-mono"
          />
          {validTokenAddress && tokenSymbol && (
            <p className="mt-2 text-sm text-secondary">
              {tokenSymbol} - Balance:{' '}
              {tokenBalance !== undefined
                ? <TokenAmount value={tokenBalance} decimals={decimals} />
                : '...'}
            </p>
          )}
        </div>

        {/* Recipient */}
        <div>
          <label className="block text-sm font-medium text-primary mb-2">
            Recipient Address
          </label>
          <input
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="0x..."
            className="w-full px-4 py-2 border border-divider-strong rounded bg-background focus:outline-none focus:border-primary font-mono"
          />
        </div>

        {/* Amount */}
        <div>
          <label className="block text-sm font-medium text-primary mb-2">
            Amount
          </label>
          <input
            type="text"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.0"
            className="w-full px-4 py-2 border border-divider-strong rounded bg-background focus:outline-none focus:border-primary"
          />
          {!hasBalance && amountParsed > 0n && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">Insufficient balance</p>
          )}
        </div>

        {/* Duration */}
        <div>
          <label className="block text-sm font-medium text-primary mb-2">
            Vesting Duration
          </label>
          <div className="flex gap-4 mb-2">
            {DURATION_PRESETS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                onClick={() => {
                  const years = preset.value / (365 * 24 * 60 * 60);
                  const months = preset.value / (30 * 24 * 60 * 60);
                  if (years >= 1 && years === Math.floor(years)) {
                    setDurationValue(years.toString());
                    setDurationUnit(DURATION_UNITS[2].value);
                  } else {
                    setDurationValue(months.toString());
                    setDurationUnit(DURATION_UNITS[1].value);
                  }
                }}
                className="px-3 py-1 text-sm border border-divider-strong rounded hover:border-primary transition-colors"
              >
                {preset.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              min="1"
              value={durationValue}
              onChange={(e) => setDurationValue(e.target.value)}
              className="flex-1 px-4 py-2 border border-divider-strong rounded bg-background focus:outline-none focus:border-primary"
            />
            <select
              value={durationUnit}
              onChange={(e) => setDurationUnit(Number(e.target.value))}
              className="px-4 py-2 border border-divider-strong rounded bg-background focus:outline-none focus:border-primary"
            >
              {DURATION_UNITS.map((unit) => (
                <option key={unit.value} value={unit.value}>
                  {unit.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Cliff */}
        <div>
          <label className="block text-sm font-medium text-primary mb-2">
            Cliff Period (optional)
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              min="0"
              value={cliffValue}
              onChange={(e) => setCliffValue(e.target.value)}
              className="flex-1 px-4 py-2 border border-divider-strong rounded bg-background focus:outline-none focus:border-primary"
            />
            <select
              value={cliffUnit}
              onChange={(e) => setCliffUnit(Number(e.target.value))}
              className="px-4 py-2 border border-divider-strong rounded bg-background focus:outline-none focus:border-primary"
            >
              {DURATION_UNITS.map((unit) => (
                <option key={unit.value} value={unit.value}>
                  {unit.label}
                </option>
              ))}
            </select>
          </div>
          {cliff > duration && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">
              Cliff cannot be longer than duration
            </p>
          )}
        </div>

        {/* Start Time */}
        <div>
          <label className="block text-sm font-medium text-primary mb-2">
            Start Time
          </label>
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={startNow}
                onChange={() => setStartNow(true)}
                className="text-primary"
              />
              <span className="text-secondary">Start immediately</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={!startNow}
                onChange={() => setStartNow(false)}
                className="text-primary"
              />
              <span className="text-secondary">Start at specific date</span>
            </label>
            {!startNow && (
              <input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2 border border-divider-strong rounded bg-background focus:outline-none focus:border-primary"
              />
            )}
          </div>
        </div>

        {/* Open Claim */}
        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={openClaim}
              onChange={(e) => setOpenClaim(e.target.checked)}
              className="text-primary"
            />
            <span className="text-secondary">
              Allow anyone to claim on behalf of recipient
            </span>
          </label>
        </div>

        {/* Support Vyper */}
        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={supportVyper}
              onChange={(e) => setSupportVyper(e.target.checked)}
              className="text-primary"
            />
            <span className="text-secondary">
              Donate 1% to Vyper development
            </span>
          </label>
        </div>

        {/* Actions */}
        <div className="pt-4 border-t border-divider-subtle">
          {needsApproval ? (
            <Button
              onClick={handleApprove}
              loading={approvePending || approveConfirming}
              disabled={!isValidForm || !hasBalance}
              className="w-full"
            >
              {approvePending
                ? 'Confirm in wallet...'
                : approveConfirming
                ? 'Approving...'
                : `Approve ${tokenSymbol || 'Token'}`}
            </Button>
          ) : (
            <Button
              onClick={handleDeploy}
              loading={deployPending || deployConfirming}
              disabled={!isValidForm || !hasBalance}
              className="w-full"
            >
              {deployPending
                ? 'Confirm in wallet...'
                : deployConfirming
                ? 'Deploying...'
                : 'Create Escrow'}
            </Button>
          )}

          {(approveError || deployError) && (
            <p className="mt-4 text-sm text-red-600 dark:text-red-400 text-center">
              {(approveError || deployError)?.message.includes('User rejected')
                ? 'Transaction rejected'
                : 'Transaction failed'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
