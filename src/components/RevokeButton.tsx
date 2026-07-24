import { useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { Address } from 'viem';
import Button from './Button';
import { formatTokenAmount } from '../lib/format';
import { getEtherscanTxUrl } from '../lib/constants';
import { legacyRevokeAbi, legacyRugPullAbi, v04RevokeAbi } from '../lib/contracts';
import { EscrowVersion } from '../lib/types';

interface RevokeButtonProps {
  escrowAddress: string;
  locked: bigint;
  decimals: number;
  symbol?: string;
  version: EscrowVersion;
  receiver: string;
  onSuccess?: () => void;
}

export default function RevokeButton({
  escrowAddress,
  locked,
  decimals,
  symbol,
  version,
  receiver,
  onSuccess,
}: RevokeButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const { data: hash, isPending, writeContract, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const handleRevoke = () => {
    if (version === 'v0.4.0') {
      writeContract({
        address: escrowAddress as Address,
        abi: v04RevokeAbi,
        functionName: 'revoke',
        args: [receiver as Address],
      });
    } else if (version === 'v0.1.0' || version === 'v0.2.0') {
      writeContract({
        address: escrowAddress as Address,
        abi: legacyRugPullAbi,
        functionName: 'rug_pull',
      });
    } else {
      // The zero-argument Vyper overload uses block.timestamp and msg.sender.
      writeContract({
        address: escrowAddress as Address,
        abi: legacyRevokeAbi,
        functionName: 'revoke',
      });
    }
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
