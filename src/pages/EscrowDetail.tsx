import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { isAddress, Address as ViemAddress, maxUint256 } from 'viem';
import Spinner from '../components/Spinner';
import AddressDisplay from '../components/Address';
import TokenLogo from '../components/TokenLogo';
import VestingTimeline from '../components/VestingTimeline';
import StatusBadge from '../components/StatusBadge';
import Button from '../components/Button';
import RefreshIcon from '../components/RefreshIcon';
import TokenAmount from '../components/TokenAmount';
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
  canClaim,
  canRevoke,
  canDisown,
  isOwner,
  isRecipient,
} from '../lib/escrow';
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

export default function EscrowDetail() {
  const { address: escrowAddress } = useParams<{ address: string }>();
  const { address: userAddress } = useAccount();
  const navigate = useNavigate();

  const handleBack = () => {
    navigate('/');
  };

  const { escrow: indexedEscrow, isLoading: loadingIndex } = useEscrowByAddress(escrowAddress);
  const { data: liveData, isLoading: loadingLive, refetch } = useLiveEscrowData(escrowAddress);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState('');
  const [showCliffAsDate, setShowCliffAsDate] = useState(false);
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
          <button onClick={handleBack} className="inline-flex items-center justify-center px-1.5 py-0.5 border border-divider-strong rounded text-secondary hover:text-primary hover:border-primary transition-colors mb-2">
            <svg className="w-5 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M22 12H4M9 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex items-center gap-3">
            <TokenLogo
              address={escrow.token}
              symbol={tokenMetadata?.symbol}
              size={32}
            />
            <div>
              <div className="flex items-center gap-2">
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
                  <>
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
                  </>
                )}
                <StatusBadge status={escrow.status} isLoading={loadingLive} />
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <AddressDisplay address={escrow.address} showCopy showLink={false} className="text-sm text-secondary" />
                <a
                  href={`https://etherscan.io/address/${escrow.address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-tertiary hover:text-primary transition-colors"
                  title="View on Etherscan"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center">
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
          <StarButton address={escrow.address} size={20} />
        </div>
      </div>

      {/* Progress */}
      <div className="p-6 border border-divider-strong rounded-lg">
        <div className="relative">
          <span className="absolute right-0 -top-1 text-xs text-secondary">{progress.toFixed(1)}%</span>
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
        <ClaimableCard
          amount={amounts.claimable}
          decimals={decimals}
          value={formatValue(amounts.claimable)}
          isLoading={loadingLive}
          canClaim={showClaim}
          escrowAddress={escrow.address}
          recipient={escrow.recipient}
          onSuccess={() => refetch()}
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
            <AddressDisplay address={escrow.address} />
          </DetailRow>
          <DetailRow label="Token">
            <div className="flex items-center gap-2">
              <AddressDisplay address={escrow.token} />
              <span className="text-secondary">({tokenMetadata?.symbol})</span>
            </div>
          </DetailRow>
          <DetailRow label="Recipient">
            <div className="flex items-center gap-2">
              <AddressDisplay address={escrow.recipient} />
              {userIsRecipient && (
                <span className="text-xs bg-divider-subtle px-2 py-0.5 rounded">You</span>
              )}
            </div>
          </DetailRow>
          <DetailRow label="Funder">
            <AddressDisplay address={escrow.funder} />
          </DetailRow>
          {liveData && (
            <DetailRow label="Owner">
              <div className="flex items-center gap-2">
                <AddressDisplay address={liveData.owner} />
                {userIsOwner && (
                  <span className="text-xs bg-divider-subtle px-2 py-0.5 rounded">You</span>
                )}
              </div>
            </DetailRow>
          )}
          <DetailRow label="Start Date">
            {formatDateTime(escrow.vestingStart)}
          </DetailRow>
          <DetailRow label="End Date">
            {formatDateTime(escrow.vestingStart + escrow.vestingDuration)}
          </DetailRow>
          <DetailRow label="Duration">
            {formatDurationHuman(escrow.vestingDuration)}
          </DetailRow>
          <DetailRow label="Cliff">
            {escrow.cliffLength > 0 ? (
              <button
                onClick={() => setShowCliffAsDate(!showCliffAsDate)}
                className="text-primary hover:text-secondary transition-colors cursor-pointer"
                title="Click to toggle format"
              >
                {showCliffAsDate
                  ? formatDateTime(escrow.vestingStart + escrow.cliffLength)
                  : formatDurationHuman(escrow.cliffLength)}
              </button>
            ) : (
              'None'
            )}
          </DetailRow>
          <DetailRow label="Open Claim">
            {escrow.openClaim ? 'True' : 'False'}
          </DetailRow>
        </div>
      </div>
    </div>
  );
}

function ClaimableCard({
  amount,
  decimals,
  value,
  isLoading,
  canClaim: isClaimable,
  escrowAddress,
  recipient,
  onSuccess,
}: {
  amount: bigint;
  decimals: number;
  value: string | null;
  isLoading?: boolean;
  canClaim: boolean;
  escrowAddress: string;
  recipient: string;
  onSuccess?: () => void;
}) {
  const { data: hash, isPending, writeContract, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const handleClaim = () => {
    writeContract({
      address: escrowAddress as ViemAddress,
      abi: escrowAbi,
      functionName: 'claim',
      args: [recipient as ViemAddress, maxUint256],
    });
  };

  // Handle success callback
  useEffect(() => {
    if (isSuccess && onSuccess) {
      onSuccess();
    }
  }, [isSuccess, onSuccess]);

  const isTxLoading = isPending || isConfirming;
  const hasClaimableAmount = amount > 0n;
  const canClick = isClaimable && hasClaimableAmount && !isTxLoading && !isSuccess;

  // Render the card content (same structure for all states)
  const renderCardContent = () => (
    <>
      <div className="text-sm text-secondary mb-1">
        {isSuccess ? 'Claimed' : 'Claimable'}
      </div>
      {isLoading ? (
        <div className="h-7 w-24 skeleton rounded" />
      ) : (
        <TokenAmount value={amount} decimals={decimals} className="text-lg font-medium text-primary block" />
      )}
      {isLoading ? (
        <div className="h-4 w-16 skeleton rounded mt-1" />
      ) : value ? (
        <div className="text-sm text-tertiary">{value}</div>
      ) : null}
    </>
  );

  // Determine card styling based on state
  const isActive = canClick || isTxLoading || isSuccess;
  const cardClasses = `relative p-4 border rounded-lg ${
    isActive
      ? 'border-primary' + (isTxLoading ? ' bg-divider-subtle' : '')
      : 'border-divider-strong'
  }`;

  // Success state - clickable link to etherscan
  if (isSuccess && hash) {
    return (
      <a
        href={getEtherscanTxUrl(hash)}
        target="_blank"
        rel="noopener noreferrer"
        className={`${cardClasses} bg-claimable/5 hover:bg-claimable/10 transition-colors block`}
      >
        <div className="absolute top-2 right-2">
          <svg className="w-5 h-5 text-claimable" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        {renderCardContent()}
      </a>
    );
  }

  // Transaction loading state
  if (isTxLoading) {
    return (
      <div className={cardClasses}>
        <div className="absolute top-2 right-2">
          <Spinner size="sm" />
        </div>
        {renderCardContent()}
        <div className="absolute -top-6 left-0 right-0 text-xs text-primary text-center animate-pulse">
          {isPending ? 'Confirm in wallet...' : 'Claiming...'}
        </div>
      </div>
    );
  }

  // Claimable state - clickable card
  if (canClick) {
    return (
      <button
        onClick={handleClaim}
        className={`${cardClasses} hover:bg-claimable/10 transition-colors text-left w-full`}
      >
        <div className="absolute top-2 right-2">
          <span className="w-2.5 h-2.5 rounded-full animate-pulse bg-claimable block" />
        </div>
        {renderCardContent()}
        {error && (
          <div className="absolute -top-6 left-0 right-0 text-xs text-primary text-center">
            {error.message.includes('User rejected') ? 'Rejected' : 'Failed'}
            {' · '}
            <span className="underline cursor-pointer" onClick={(e) => { e.stopPropagation(); reset(); }}>
              Retry
            </span>
          </div>
        )}
      </button>
    );
  }

  // Default state - not claimable
  return (
    <div className={cardClasses}>
      {renderCardContent()}
    </div>
  );
}

function AmountCard({
  label,
  amount,
  decimals,
  value,
  isLoading,
}: {
  label: string;
  amount: bigint;
  decimals: number;
  value: string | null;
  isLoading?: boolean;
}) {
  return (
    <div className="relative p-4 border rounded-lg border-divider-strong">
      <div className="text-sm text-secondary mb-1">{label}</div>
      {isLoading ? (
        <div className="h-7 w-24 skeleton rounded" />
      ) : (
        <TokenAmount value={amount} decimals={decimals} className="text-lg font-medium text-primary block" />
      )}
      {isLoading ? (
        <div className="h-4 w-16 skeleton rounded mt-1" />
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
