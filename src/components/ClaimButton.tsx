import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { Address, maxUint256 } from 'viem';
import { CHAIN_ID, getEtherscanTxUrl } from '../lib/constants';
import { useMainnetWrite } from '../hooks/useMainnetWrite';

const escrowAbi = [
  {
    name: 'claim',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'beneficiary', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

interface ClaimButtonProps {
  escrowAddress: string;
  unclaimed: bigint;
  recipient: string;
  onSuccess?: () => void;
  compact?: boolean;
}

export default function ClaimButton({
  escrowAddress,
  unclaimed,
  recipient,
  onSuccess,
  compact = false,
}: ClaimButtonProps) {
  const { data: hash, isPending, writeContract, error } = useWriteContract();
  const {
    isMainnet,
    isSwitching,
    switchError,
    switchToMainnet,
  } = useMainnetWrite();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
    chainId: CHAIN_ID,
  });

  const handleClaim = () => {
    // Claim all available to the recipient (max uint256 = claim all)
    writeContract({
      chainId: CHAIN_ID,
      address: escrowAddress as Address,
      abi: escrowAbi,
      functionName: 'claim',
      args: [recipient as Address, maxUint256],
    });
  };

  // Call onSuccess when transaction is confirmed
  if (isSuccess && onSuccess) {
    onSuccess();
  }

  const isLoading = isPending || isConfirming;
  const isDisabled = unclaimed === 0n || isLoading;

  if (isSuccess && hash) {
    if (compact) {
      return (
        <a
          href={getEtherscanTxUrl(hash)}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 text-primary hover:text-secondary transition-colors"
          title="View transaction"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </a>
      );
    }
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-primary">Claimed successfully!</span>
        <a
          href={getEtherscanTxUrl(hash)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-secondary hover:text-primary"
        >
          View tx
        </a>
      </div>
    );
  }

  if (!isMainnet) {
    if (compact) {
      return (
        <button
          onClick={switchToMainnet}
          disabled={isSwitching}
          className="px-2 py-1 text-xs font-medium rounded border border-primary text-primary hover:bg-divider-subtle"
          title="Switch to Ethereum mainnet"
        >
          {isSwitching ? '...' : 'Switch'}
        </button>
      );
    }

    return (
      <div>
        <button
          onClick={switchToMainnet}
          disabled={isSwitching}
          className="px-6 py-2 bg-background text-primary font-medium rounded border border-primary transition-colors hover:bg-divider-subtle"
        >
          {isSwitching ? 'Switching...' : 'Switch to Ethereum'}
        </button>
        {switchError && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">
            Failed to switch to Ethereum
          </p>
        )}
      </div>
    );
  }

  if (compact) {
    return (
      <button
        onClick={handleClaim}
        disabled={isDisabled}
        className={`relative px-2 py-1 text-xs font-medium rounded transition-colors ${
          isDisabled
            ? 'text-tertiary cursor-not-allowed'
            : 'text-primary border border-primary hover:bg-divider-subtle'
        } ${isLoading ? 'animate-pulse' : ''}`}
      >
        {unclaimed > 0n && !isLoading && (
          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full animate-pulse bg-claimable" />
        )}
        {isLoading ? (isPending ? '...' : '...') : 'Claim'}
      </button>
    );
  }

  return (
    <div>
      <button
        onClick={handleClaim}
        disabled={isDisabled}
        className={`
          px-6 py-2 bg-background text-primary font-medium rounded border border-primary transition-colors
          ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-divider-subtle'}
        `}
      >
        {isLoading ? (isPending ? 'Confirm...' : 'Claiming...') : 'Claim'}
      </button>
      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">
          {error.message.includes('User rejected')
            ? 'Transaction rejected'
            : 'Failed to claim'}
        </p>
      )}
    </div>
  );
}
