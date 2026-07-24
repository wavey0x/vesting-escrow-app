import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { Address, decodeEventLog, parseUnits, isAddress, maxUint256 } from 'viem';
import Button from '../components/Button';
import { FACTORY_ADDRESS, DURATION_PRESETS, DURATION_UNITS } from '../lib/constants';
import TokenAmount from '../components/TokenAmount';
import { erc20Abi, erc4626VaultAbi, v04FactoryAbi } from '../lib/contracts';
import { EscrowKind } from '../lib/types';

type Step = 'form' | 'approve' | 'deploy' | 'success';

export default function Create() {
  const navigate = useNavigate();
  const { address: userAddress, isConnected } = useAccount();

  // Form state
  const [escrowKind, setEscrowKind] = useState<EscrowKind>('token');
  const [tokenAddress, setTokenAddress] = useState('');
  const [recipient, setRecipient] = useState('');
  const [yieldRecipient, setYieldRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [durationValue, setDurationValue] = useState('1');
  const [durationUnit, setDurationUnit] = useState(DURATION_UNITS[2].value); // years
  const [cliffValue, setCliffValue] = useState('0');
  const [cliffUnit, setCliffUnit] = useState(DURATION_UNITS[1].value); // months
  const [startNow, setStartNow] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [openClaim, setOpenClaim] = useState(false);

  const [step, setStep] = useState<Step>('form');
  const [createdEscrow, setCreatedEscrow] = useState<string>('');

  useEffect(() => {
    if (userAddress && !yieldRecipient) {
      setYieldRecipient(userAddress);
    }
  }, [userAddress, yieldRecipient]);

  // Funding token or vault data
  const validTokenAddress = isAddress(tokenAddress) ? tokenAddress : undefined;

  const { data: vaultAsset } = useReadContract({
    address: validTokenAddress as Address,
    abi: erc4626VaultAbi,
    functionName: 'asset',
    query: { enabled: escrowKind === 'erc4626' && !!validTokenAddress },
  });

  const principalTokenAddress = escrowKind === 'erc4626'
    ? vaultAsset
    : validTokenAddress;

  const { data: fundingSymbol } = useReadContract({
    address: validTokenAddress as Address,
    abi: erc20Abi,
    functionName: 'symbol',
    query: { enabled: !!validTokenAddress },
  });

  const { data: fundingDecimals } = useReadContract({
    address: validTokenAddress as Address,
    abi: erc20Abi,
    functionName: 'decimals',
    query: { enabled: !!validTokenAddress },
  });

  const { data: fundingBalance } = useReadContract({
    address: validTokenAddress as Address,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [userAddress as Address],
    query: { enabled: !!validTokenAddress && !!userAddress },
  });

  const { data: fundingAllowance, refetch: refetchAllowance } = useReadContract({
    address: validTokenAddress as Address,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [userAddress as Address, FACTORY_ADDRESS],
    query: { enabled: !!validTokenAddress && !!userAddress },
  });

  const { data: principalSymbol } = useReadContract({
    address: principalTokenAddress as Address,
    abi: erc20Abi,
    functionName: 'symbol',
    query: { enabled: !!principalTokenAddress },
  });

  const { data: principalDecimals } = useReadContract({
    address: principalTokenAddress as Address,
    abi: erc20Abi,
    functionName: 'decimals',
    query: { enabled: !!principalTokenAddress },
  });

  // Calculated values
  const decimals = principalDecimals ?? 18;
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

  const { data: quotedShares } = useReadContract({
    address: FACTORY_ADDRESS,
    abi: v04FactoryAbi,
    functionName: 'preview_erc4626_funding',
    args: [validTokenAddress as Address, amountParsed],
    query: {
      enabled: escrowKind === 'erc4626' && !!validTokenAddress && amountParsed > 0n,
    },
  });

  const fundingAmount = escrowKind === 'erc4626'
    ? quotedShares ?? 0n
    : amountParsed;
  const needsApproval = fundingAllowance !== undefined && fundingAmount > fundingAllowance;
  const hasBalance = fundingBalance !== undefined && fundingAmount > 0n && fundingAmount <= fundingBalance;
  const recipientIsValid = isAddress(recipient)
    && recipient.toLowerCase() !== tokenAddress.toLowerCase()
    && recipient.toLowerCase() !== userAddress?.toLowerCase();
  const yieldRecipientIsValid = escrowKind === 'token' || (
    isAddress(yieldRecipient)
    && yieldRecipient.toLowerCase() !== tokenAddress.toLowerCase()
    && yieldRecipient.toLowerCase() !== vaultAsset?.toLowerCase()
  );

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
    if (escrowKind === 'erc4626') {
      if (!quotedShares || !isAddress(yieldRecipient)) return;
      deploy({
        address: FACTORY_ADDRESS,
        abi: v04FactoryAbi,
        functionName: 'deploy_erc4626_vesting',
        args: [
          validTokenAddress as Address,
          recipient as Address,
          amountParsed,
          quotedShares,
          BigInt(duration),
          BigInt(startTime),
          BigInt(cliff),
          openClaim,
          userAddress as Address,
          yieldRecipient as Address,
        ],
      });
      return;
    }

    deploy({
      address: FACTORY_ADDRESS,
      abi: v04FactoryAbi,
      functionName: 'deploy_vesting_contract',
      args: [
        validTokenAddress as Address,
        recipient as Address,
        amountParsed,
        BigInt(duration),
        BigInt(startTime),
        BigInt(cliff),
        openClaim,
        userAddress as Address,
      ],
    });
  };

  // Effect: After approval success, refetch allowance and continue
  useEffect(() => {
    if (approveSuccess && step === 'approve') {
      refetchAllowance();
      setStep('form');
    }
  }, [approveSuccess, refetchAllowance, step]);

  // Effect: After deploy success, extract created escrow address
  useEffect(() => {
    if (!deploySuccess || !deployReceipt || step !== 'deploy') return;

    const expectedEvent = escrowKind === 'erc4626'
      ? 'ERC4626VestingEscrowCreated'
      : 'TokenVestingEscrowCreated';

    for (const log of deployReceipt.logs) {
      try {
        const decoded = decodeEventLog({
          abi: v04FactoryAbi,
          data: log.data,
          topics: log.topics,
        });
        if (decoded.eventName === expectedEvent && 'escrow' in decoded.args) {
          setCreatedEscrow(decoded.args.escrow as string);
          setStep('success');
          return;
        }
      } catch {
        // Ignore unrelated receipt logs.
      }
    }
  }, [deployReceipt, deploySuccess, escrowKind, step]);

  // Validation
  const isValidForm =
    isAddress(tokenAddress) &&
    recipientIsValid &&
    principalDecimals !== undefined &&
    fundingDecimals !== undefined &&
    fundingAllowance !== undefined &&
    fundingBalance !== undefined &&
    amountParsed > 0n &&
    (escrowKind === 'token' || (
      !!vaultAsset
      && !!quotedShares
      && quotedShares > 0n
      && yieldRecipientIsValid
    )) &&
    Number.isFinite(duration) &&
    duration > 0 &&
    (startNow || startDate) &&
    Number.isFinite(startTime) &&
    startTime + duration > Math.floor(Date.now() / 1000) &&
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
        <div>
          <label className="block text-sm font-medium text-primary mb-2">
            Escrow Type
          </label>
          <div className="grid grid-cols-2 gap-2">
            {([
              ['token', 'ERC-20 Token'],
              ['erc4626', 'ERC-4626 Vault'],
            ] as const).map(([kind, label]) => (
              <button
                key={kind}
                type="button"
                onClick={() => {
                  setEscrowKind(kind);
                  setTokenAddress('');
                  setAmount('');
                  setStep('form');
                }}
                className={`px-4 py-2 border rounded transition-colors ${
                  escrowKind === kind
                    ? 'border-primary text-primary'
                    : 'border-divider-strong text-secondary hover:border-primary'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Token or vault address */}
        <div>
          <label className="block text-sm font-medium text-primary mb-2">
            {escrowKind === 'erc4626' ? 'Vault Address' : 'Token Address'}
          </label>
          <input
            type="text"
            value={tokenAddress}
            onChange={(e) => setTokenAddress(e.target.value)}
            placeholder="0x..."
            className="w-full px-4 py-2 border border-divider-strong rounded bg-background focus:outline-none focus:border-primary font-mono"
          />
          {validTokenAddress && fundingSymbol && (
            <p className="mt-2 text-sm text-secondary">
              {fundingSymbol} {escrowKind === 'erc4626' ? 'shares' : ''} - Balance:{' '}
              {fundingBalance !== undefined
                ? <TokenAmount value={fundingBalance} decimals={fundingDecimals ?? 18} />
                : '...'}
            </p>
          )}
          {escrowKind === 'erc4626' && vaultAsset && (
            <p className="mt-1 text-sm text-tertiary">
              Principal is denominated in {principalSymbol || 'the underlying asset'}.
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
          {isAddress(recipient) && !recipientIsValid && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">
              Recipient must differ from the token or vault and the connected revoker.
            </p>
          )}
        </div>

        {escrowKind === 'erc4626' && (
          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Yield Recipient
            </label>
            <input
              type="text"
              value={yieldRecipient}
              onChange={(event) => setYieldRecipient(event.target.value)}
              placeholder="0x..."
              className="w-full px-4 py-2 border border-divider-strong rounded bg-background focus:outline-none focus:border-primary font-mono"
            />
            {isAddress(yieldRecipient) && !yieldRecipientIsValid && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                Yield recipient must differ from the vault and underlying asset.
              </p>
            )}
            <p className="mt-2 text-sm text-tertiary">
              All vault yield is routed to this fixed address.
            </p>
          </div>
        )}

        {/* Amount */}
        <div>
          <label className="block text-sm font-medium text-primary mb-2">
            {escrowKind === 'erc4626' ? 'Principal Amount' : 'Amount'}
          </label>
          <input
            type="text"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.0"
            className="w-full px-4 py-2 border border-divider-strong rounded bg-background focus:outline-none focus:border-primary"
          />
          {fundingBalance !== undefined && fundingAmount > 0n && !hasBalance && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">
              Insufficient {escrowKind === 'erc4626' ? 'vault share ' : ''}balance
            </p>
          )}
          {escrowKind === 'erc4626' && quotedShares !== undefined && (
            <p className="mt-2 text-sm text-secondary">
              Funding quote:{' '}
              <TokenAmount value={quotedShares} decimals={fundingDecimals ?? 18} />{' '}
              {fundingSymbol || 'vault'} shares
            </p>
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

        {/* Permissionless Claims */}
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

        <p className="text-sm text-tertiary">
          The connected wallet is the revoker and receives any unvested funds
          if it revokes the escrow.
        </p>

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
                : `Approve ${fundingSymbol || (escrowKind === 'erc4626' ? 'Vault Shares' : 'Token')}`}
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
