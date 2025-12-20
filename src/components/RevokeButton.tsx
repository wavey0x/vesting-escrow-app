import { useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { Address, zeroAddress } from 'viem';
import Button from './Button';
import { formatTokenAmount } from '../lib/format';
import { getEtherscanTxUrl } from '../lib/constants';

const escrowAbi = [
  {
    name: 'revoke',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'beneficiary', type: 'address' },
      { name: 'ts', type: 'uint256' },
    ],
    outputs: [],
  },
] as const;

interface RevokeButtonProps {
  escrowAddress: string;
  locked: bigint;
  decimals: number;
  symbol?: string;
  onSuccess?: () => void;
}

export default function RevokeButton({
  escrowAddress,
  locked,
  decimals,
  symbol,
  onSuccess,
}: RevokeButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const { data: hash, isPending, writeContract, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const handleRevoke = () => {
    // Revoke immediately (ts = 0) and send to self (beneficiary = zero to use msg.sender)
    writeContract({
      address: escrowAddress as Address,
      abi: escrowAbi,
      functionName: 'revoke',
      args: [zeroAddress, 0n],
    });
    setShowConfirm(false);
  };

  // Call onSuccess when transaction is confirmed
  if (isSuccess && onSuccess) {
    onSuccess();
  }

  if (isSuccess && hash) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-primary">Revoked successfully!</span>
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

  if (showConfirm) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm text-secondary">
          This will revoke {formatTokenAmount(locked, decimals)} {symbol || 'tokens'} from this escrow.
          This action cannot be undone.
        </p>
        <div className="flex gap-2">
          <Button
            variant="primary"
            onClick={handleRevoke}
            loading={isPending || isConfirming}
          >
            {isPending
              ? 'Confirm in wallet...'
              : isConfirming
              ? 'Revoking...'
              : 'Confirm Revoke'}
          </Button>
          <Button variant="ghost" onClick={() => setShowConfirm(false)}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Button variant="secondary" onClick={() => setShowConfirm(true)}>
        Revoke Unvested
      </Button>
      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">
          {error.message.includes('User rejected')
            ? 'Transaction rejected'
            : 'Failed to revoke'}
        </p>
      )}
    </div>
  );
}
