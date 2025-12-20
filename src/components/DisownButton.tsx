import { useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { Address } from 'viem';
import Button from './Button';
import { getEtherscanTxUrl } from '../lib/constants';

const escrowAbi = [
  {
    name: 'disown',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
] as const;

interface DisownButtonProps {
  escrowAddress: string;
  onSuccess?: () => void;
}

export default function DisownButton({
  escrowAddress,
  onSuccess,
}: DisownButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const { data: hash, isPending, writeContract, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const handleDisown = () => {
    writeContract({
      address: escrowAddress as Address,
      abi: escrowAbi,
      functionName: 'disown',
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
        <span className="text-sm text-primary">Disowned successfully!</span>
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
          This will permanently give up ownership of this escrow. You will no
          longer be able to revoke tokens. This action cannot be undone.
        </p>
        <div className="flex gap-2">
          <Button
            variant="primary"
            onClick={handleDisown}
            loading={isPending || isConfirming}
          >
            {isPending
              ? 'Confirm in wallet...'
              : isConfirming
              ? 'Disowning...'
              : 'Confirm Disown'}
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
        Disown
      </Button>
      {error && (
        <p className="mt-2 text-sm text-red-600">
          {error.message.includes('User rejected')
            ? 'Transaction rejected'
            : 'Failed to disown'}
        </p>
      )}
    </div>
  );
}
