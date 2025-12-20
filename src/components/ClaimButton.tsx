import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { Address, maxUint256 } from 'viem';
import { getEtherscanTxUrl } from '../lib/constants';

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
}

export default function ClaimButton({
  escrowAddress,
  unclaimed,
  recipient,
  onSuccess,
}: ClaimButtonProps) {
  const { data: hash, isPending, writeContract, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const handleClaim = () => {
    // Claim all available to the recipient (max uint256 = claim all)
    writeContract({
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

  if (isSuccess && hash) {
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

  const isLoading = isPending || isConfirming;
  const isDisabled = unclaimed === 0n || isLoading;

  return (
    <div>
      <button
        onClick={handleClaim}
        disabled={isDisabled}
        className={`
          px-6 py-2 bg-white text-primary font-medium rounded border border-primary transition-colors
          ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-divider-subtle'}
        `}
      >
        {isLoading ? (isPending ? 'Confirm...' : 'Claiming...') : 'Claim'}
      </button>
      {error && (
        <p className="mt-2 text-sm text-red-600">
          {error.message.includes('User rejected')
            ? 'Transaction rejected'
            : 'Failed to claim'}
        </p>
      )}
    </div>
  );
}
