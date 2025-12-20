import { Link } from 'react-router-dom';
import { IndexedEscrow, TokenMetadata } from '../lib/types';
import { formatDate, formatDurationHuman } from '../lib/format';
import { getVestingProgress, mergeEscrowData } from '../lib/escrow';
import Address from './Address';
import TokenLogo from './TokenLogo';
import TokenAmount from './TokenAmount';
import ProgressBar from './ProgressBar';
import StatusBadge from './StatusBadge';
import { useLiveEscrowData } from '../hooks/useLiveEscrowData';

interface EscrowCardProps {
  escrow: IndexedEscrow;
  tokenMetadata?: TokenMetadata;
}

export default function EscrowCard({ escrow, tokenMetadata }: EscrowCardProps) {
  const { data: liveData } = useLiveEscrowData(escrow.address);
  const fullEscrow = mergeEscrowData(escrow, liveData);
  const progress = getVestingProgress(fullEscrow);

  return (
    <Link
      to={`/view/${escrow.address}`}
      className="block p-4 border border-divider-strong rounded-lg hover:border-primary transition-colors"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <TokenLogo
            address={escrow.token}
            symbol={tokenMetadata?.symbol}
            size={32}
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-primary">
                {tokenMetadata?.symbol || 'Unknown Token'}
              </span>
              {fullEscrow.status && <StatusBadge status={fullEscrow.status} />}
            </div>
            <div className="text-sm text-secondary">
              <TokenAmount value={BigInt(escrow.amount)} decimals={tokenMetadata?.decimals || 18} /> tokens
            </div>
          </div>
        </div>
        <Address address={escrow.address} showCopy={false} className="text-sm text-secondary" />
      </div>

      <div className="mb-4">
        <ProgressBar progress={progress} showLabel />
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-tertiary">Recipient:</span>{' '}
          <Address address={escrow.recipient} showCopy={false} showLink={false} className="text-secondary" />
        </div>
        <div>
          <span className="text-tertiary">Duration:</span>{' '}
          <span className="text-secondary">
            {formatDurationHuman(escrow.vestingDuration)}
          </span>
        </div>
        <div>
          <span className="text-tertiary">Start:</span>{' '}
          <span className="text-secondary">{formatDate(escrow.vestingStart)}</span>
        </div>
        <div>
          <span className="text-tertiary">Cliff:</span>{' '}
          <span className="text-secondary">
            {escrow.cliffLength > 0
              ? formatDate(escrow.vestingStart + escrow.cliffLength)
              : 'None'}
          </span>
        </div>
      </div>
    </Link>
  );
}
