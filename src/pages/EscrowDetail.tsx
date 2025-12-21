import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { isAddress } from 'viem';
import Spinner from '../components/Spinner';
import Address from '../components/Address';
import TokenLogo from '../components/TokenLogo';
import VestingTimeline from '../components/VestingTimeline';
import StatusBadge from '../components/StatusBadge';
import Button from '../components/Button';
import RefreshIcon from '../components/RefreshIcon';
import TokenAmount from '../components/TokenAmount';
import ClaimButton from '../components/ClaimButton';
import RevokeButton from '../components/RevokeButton';
import DisownButton from '../components/DisownButton';
import StarButton from '../components/StarButton';
import { useEscrowByAddress } from '../hooks/useEscrows';
import { useTokens } from '../hooks/useTokens';
import { useTokenPrice } from '../hooks/usePrices';
import { useLiveEscrowData } from '../hooks/useLiveEscrowData';
import { useEscrowNames } from '../contexts/EscrowNamesContext';
import {
  formatUSD,
  formatDateTime,
  formatDurationHuman,
} from '../lib/format';
import {
  mergeEscrowData,
  getVestingProgress,
  getAmountsBreakdown,
  getTimeToMilestone,
  canClaim,
  canRevoke,
  canDisown,
  isOwner,
  isRecipient,
} from '../lib/escrow';

export default function EscrowDetail() {
  const { address: escrowAddress } = useParams<{ address: string }>();
  const { address: userAddress } = useAccount();

  const { escrow: indexedEscrow, isLoading: loadingIndex } = useEscrowByAddress(escrowAddress);
  const { data: liveData, isLoading: loadingLive, refetch } = useLiveEscrowData(escrowAddress);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState('');
  const { getName, setName } = useEscrowNames();
  const { data: tokensIndex } = useTokens();
  const tokenMetadata = tokensIndex?.tokens[indexedEscrow?.token.toLowerCase() || ''];
  const tokenPrice = useTokenPrice(indexedEscrow?.token);

  // Validate address
  if (!escrowAddress || !isAddress(escrowAddress)) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-primary mb-4">Invalid Address</h1>
        <p className="text-secondary mb-6">
          The provided address is not a valid Ethereum address.
        </p>
        <Link to="/">
          <Button variant="secondary">Back to View</Button>
        </Link>
      </div>
    );
  }

  // Only block on index loading - show layout immediately, lazy load live data
  if (loadingIndex) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  // Not found in index - could be new or invalid
  if (!indexedEscrow) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-primary mb-4">Escrow Not Found</h1>
        <p className="text-secondary mb-6">
          This escrow address was not found in our index. It may be a new escrow
          that hasn't been indexed yet, or an invalid address.
        </p>
        <Link to="/">
          <Button variant="secondary">Back to View</Button>
        </Link>
      </div>
    );
  }

  const escrow = mergeEscrowData(indexedEscrow, liveData);
  const progress = getVestingProgress(escrow);
  const amounts = getAmountsBreakdown(escrow);
  const milestone = getTimeToMilestone(escrow);
  const decimals = tokenMetadata?.decimals || 18;

  const formatValue = (amount: bigint) => {
    if (!tokenPrice) return null;
    const value = (Number(amount) / 10 ** decimals) * tokenPrice;
    return formatUSD(value);
  };

  const showClaim = canClaim(escrow, userAddress);
  const showRevoke = canRevoke(escrow, userAddress);
  const showDisown = canDisown(escrow, userAddress);
  const userIsOwner = isOwner(escrow, userAddress);
  const userIsRecipient = isRecipient(escrow, userAddress);

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link to="/" className="text-secondary hover:text-primary">
              View
            </Link>
            <span className="text-tertiary">/</span>
            <span className="text-primary">Escrow Details</span>
          </div>
          <div className="flex items-center gap-3">
            <TokenLogo
              address={escrow.token}
              symbol={tokenMetadata?.symbol}
              size={32}
            />
            {isEditingName ? (
              <input
                type="text"
                value={editNameValue}
                onChange={(e) => setEditNameValue(e.target.value)}
                onBlur={() => {
                  setName(escrow.address, editNameValue);
                  setIsEditingName(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setName(escrow.address, editNameValue);
                    setIsEditingName(false);
                  } else if (e.key === 'Escape') {
                    setIsEditingName(false);
                  }
                }}
                autoFocus
                placeholder="Enter name..."
                className="text-2xl font-bold text-primary bg-transparent border-b border-primary outline-none"
              />
            ) : (
              <div className="flex items-center gap-2">
                {getName(escrow.address) ? (
                  <h1
                    className="text-2xl font-bold text-primary cursor-pointer hover:text-secondary transition-colors"
                    onClick={() => {
                      setEditNameValue(getName(escrow.address) || '');
                      setIsEditingName(true);
                    }}
                    title="Click to edit name"
                  >
                    {getName(escrow.address)}
                  </h1>
                ) : (
                  <>
                    <h1 className="text-2xl font-bold text-primary">
                      {tokenMetadata?.symbol || 'Unknown Token'} Escrow
                    </h1>
                    <button
                      onClick={() => {
                        setEditNameValue('');
                        setIsEditingName(true);
                      }}
                      className="text-tertiary hover:text-secondary transition-colors"
                      title="Set custom name"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  </>
                )}
              </div>
            )}
            <StatusBadge status={escrow.status} isLoading={loadingLive} />
          </div>
        </div>
        <div className="flex items-center">
          <StarButton address={escrow.address} size={20} />
          <button
            onClick={() => {
              setIsRefreshing(true);
              refetch();
              setTimeout(() => setIsRefreshing(false), 600);
            }}
            disabled={isRefreshing}
            className="p-2 text-secondary hover:text-primary transition-colors disabled:pointer-events-none"
            title="Refresh"
          >
            <RefreshIcon size={18} spinning={isRefreshing} />
          </button>
        </div>
      </div>

      {/* Progress */}
      <div className="p-6 border border-divider-strong rounded-lg">
        <div className="flex items-start justify-between mb-4">
          <span className="text-secondary">Vesting Progress</span>
          <div className="text-right">
            <span className="text-primary font-medium">{progress.toFixed(1)}%</span>
            {milestone.milestone !== 'none' && (
              <div className="text-xs text-tertiary mt-0.5">
                {formatDurationHuman(milestone.seconds)} until {milestone.milestone === 'cliff' ? 'cliff' : 'vested'}
              </div>
            )}
          </div>
        </div>
        <VestingTimeline
          vestingStart={escrow.vestingStart}
          vestingDuration={escrow.vestingDuration}
          cliffLength={escrow.cliffLength}
          claimedPercent={amounts.total > 0n ? Number((amounts.claimed * 100n) / amounts.total) : 0}
          claimablePercent={amounts.total > 0n ? Number((amounts.claimable * 100n) / amounts.total) : 0}
          lockedPercent={amounts.total > 0n ? Number((amounts.locked * 100n) / amounts.total) : 0}
        />
      </div>

      {/* Amounts */}
      <div className="grid md:grid-cols-3 gap-4">
        <AmountCard
          label="Claimable"
          amount={amounts.claimable}
          decimals={decimals}
          value={formatValue(amounts.claimable)}
          isLoading={loadingLive}
          action={showClaim ? (
            <ClaimButton
              escrowAddress={escrow.address}
              unclaimed={amounts.claimable}
              recipient={escrow.recipient}
              onSuccess={() => refetch()}
              compact
            />
          ) : undefined}
        />
        <AmountCard
          label="Claimed"
          amount={amounts.claimed}
          decimals={decimals}
          value={formatValue(amounts.claimed)}
          isLoading={loadingLive}
        />
        <AmountCard
          label="Total"
          amount={amounts.total}
          decimals={decimals}
          value={formatValue(amounts.total)}
        />
      </div>

      {/* Actions */}
      {(showRevoke || showDisown) && (
        <div className="p-6 border border-divider-strong rounded-lg">
          <h2 className="text-lg font-semibold text-primary mb-4">Actions</h2>
          <div className="flex flex-wrap gap-4">
            {showRevoke && (
              <RevokeButton
                escrowAddress={escrow.address}
                locked={amounts.locked}
                decimals={decimals}
                symbol={tokenMetadata?.symbol}
                onSuccess={() => refetch()}
              />
            )}
            {showDisown && (
              <DisownButton
                escrowAddress={escrow.address}
                onSuccess={() => refetch()}
              />
            )}
          </div>
        </div>
      )}

      {/* Details */}
      <div className="p-6 border border-divider-strong rounded-lg">
        <h2 className="text-lg font-semibold text-primary mb-4">Details</h2>
        <div className="space-y-4">
          <DetailRow label="Escrow Address">
            <Address address={escrow.address} />
          </DetailRow>
          <DetailRow label="Token">
            <div className="flex items-center gap-2">
              <Address address={escrow.token} />
              <span className="text-secondary">({tokenMetadata?.symbol})</span>
            </div>
          </DetailRow>
          <DetailRow label="Recipient">
            <div className="flex items-center gap-2">
              <Address address={escrow.recipient} />
              {userIsRecipient && (
                <span className="text-xs bg-divider-subtle px-2 py-0.5 rounded">You</span>
              )}
            </div>
          </DetailRow>
          <DetailRow label="Funder">
            <Address address={escrow.funder} />
          </DetailRow>
          {liveData && (
            <DetailRow label="Owner">
              <div className="flex items-center gap-2">
                <Address address={liveData.owner} />
                {userIsOwner && (
                  <span className="text-xs bg-divider-subtle px-2 py-0.5 rounded">You</span>
                )}
              </div>
            </DetailRow>
          )}
          <DetailRow label="Start Date">
            {formatDateTime(escrow.vestingStart)}
          </DetailRow>
          <DetailRow label="Duration">
            {formatDurationHuman(escrow.vestingDuration)}
          </DetailRow>
          <DetailRow label="Cliff">
            {escrow.cliffLength > 0 ? formatDurationHuman(escrow.cliffLength) : 'None'}
          </DetailRow>
          <DetailRow label="Open Claim">
            {escrow.openClaim ? 'True' : 'False'}
          </DetailRow>
        </div>
      </div>
    </div>
  );
}

function AmountCard({
  label,
  amount,
  decimals,
  value,
  action,
  isLoading,
}: {
  label: string;
  amount: bigint;
  decimals: number;
  value: string | null;
  action?: React.ReactNode;
  isLoading?: boolean;
}) {
  return (
    <div className="relative p-4 border rounded-lg border-divider-strong">
      {action && (
        <div className="absolute top-2 right-2">
          {action}
        </div>
      )}
      <div className="text-sm text-secondary mb-1">{label}</div>
      {isLoading ? (
        <div className="h-7 w-24 bg-divider-subtle rounded animate-pulse" />
      ) : (
        <TokenAmount value={amount} decimals={decimals} className="text-lg font-medium text-primary block" />
      )}
      {isLoading ? (
        <div className="h-4 w-16 bg-divider-subtle rounded animate-pulse mt-1" />
      ) : value ? (
        <div className="text-sm text-tertiary">{value}</div>
      ) : null}
    </div>
  );
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
      <span className="text-secondary w-32 flex-shrink-0">{label}</span>
      <div className="text-primary">{children}</div>
    </div>
  );
}
