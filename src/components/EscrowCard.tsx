import { useState } from 'react';
import { Link } from 'react-router-dom';
import { IndexedEscrow, TokenMetadata, LiveEscrowData } from '../lib/types';
import { formatDate, formatDurationHuman } from '../lib/format';
import { getVestingProgress, mergeEscrowData } from '../lib/escrow';
import Address from './Address';
import TokenLogo from './TokenLogo';
import TokenAmount from './TokenAmount';
import ProgressBar from './ProgressBar';
import StatusBadge from './StatusBadge';
import StarButton from './StarButton';
import { useLiveEscrowData } from '../hooks/useLiveEscrowData';
import { useEscrowNames } from '../contexts/EscrowNamesContext';

interface EscrowCardProps {
  escrow: IndexedEscrow;
  tokenMetadata?: TokenMetadata;
  liveData?: LiveEscrowData;
  isLoadingLiveData?: boolean;
}

export default function EscrowCard({ escrow, tokenMetadata, liveData: providedLiveData, isLoadingLiveData }: EscrowCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const { getName, setName } = useEscrowNames();

  // Only fetch if liveData not provided (backward compatibility for detail page)
  const { data: fetchedLiveData } = useLiveEscrowData(providedLiveData ? undefined : escrow.address);
  const liveData = providedLiveData ?? fetchedLiveData;
  const isLoading = isLoadingLiveData ?? !liveData;

  const fullEscrow = mergeEscrowData(escrow, liveData);
  const progress = getVestingProgress(fullEscrow);
  const cliffPercent = escrow.cliffLength > 0
    ? (escrow.cliffLength / escrow.vestingDuration) * 100
    : undefined;

  const customName = getName(escrow.address);
  const symbol = tokenMetadata?.symbol || 'Token';

  const handleNameClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditValue(customName || '');
    setIsEditing(true);
  };

  const handleNameSave = () => {
    setName(escrow.address, editValue);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNameSave();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
    }
  };

  return (
    <Link
      to={`/view/${escrow.address}`}
      className="relative block p-4 border border-divider-strong rounded-lg hover:border-primary transition-all duration-200"
    >
      {/* Star - snug in top-right corner */}
      <div className="absolute top-0.5 right-0.5">
        <StarButton address={escrow.address} size={16} />
      </div>

      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <TokenLogo
            address={escrow.token}
            symbol={tokenMetadata?.symbol}
            size={32}
          />
          <div>
            <div className="flex items-center gap-2">
              {isEditing ? (
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={handleNameSave}
                  onKeyDown={handleKeyDown}
                  onClick={(e) => e.preventDefault()}
                  autoFocus
                  placeholder="Enter name..."
                  className="font-medium text-primary bg-transparent border-b border-primary outline-none w-32"
                />
              ) : customName ? (
                <button
                  onClick={handleNameClick}
                  className="font-medium text-primary hover:text-secondary transition-colors text-left"
                  title="Click to edit name"
                >
                  {customName}
                </button>
              ) : (
                <button
                  onClick={handleNameClick}
                  className="text-tertiary hover:text-secondary transition-colors"
                  title="Click to set name"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              )}
              <StatusBadge status={fullEscrow.status} isLoading={isLoading} />
            </div>
            <div className="text-sm text-secondary">
              <TokenAmount value={BigInt(escrow.amount)} decimals={tokenMetadata?.decimals || 18} /> {symbol}
            </div>
          </div>
        </div>
        {/* Address below star, right-aligned with content edge */}
        <div className="flex flex-col items-end pt-3">
          <Address address={escrow.address} showCopy className="text-sm text-secondary" />
        </div>
      </div>

      <div className="mb-4">
        <ProgressBar progress={progress} showLabel cliffPercent={cliffPercent} />
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-tertiary">Recipient:</span>{' '}
          <Address address={escrow.recipient} showCopy showLink={false} className="text-secondary" />
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
