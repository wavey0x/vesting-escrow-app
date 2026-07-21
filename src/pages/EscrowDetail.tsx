import { useState, useEffect, useRef } from 'react';
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
  formatDurationHuman,
} from '../lib/format';
import {
  mergeEscrowData,
  getAmountsBreakdown,
  canClaim,
  canRevoke,
  canDisown,
  isOwner,
  isRecipient,
} from '../lib/escrow';
import { claimAbi, legacyClaimAbi, yieldClaimAbi } from '../lib/contracts';
import type { EscrowVersion } from '../lib/types';

function formatDaysUntil(timestamp: number, now: number): string {
  const targetDate = new Date(timestamp * 1000);
  const currentDate = new Date(now * 1000);

  targetDate.setHours(0, 0, 0, 0);
  currentDate.setHours(0, 0, 0, 0);

  const dayDiff = Math.round((targetDate.getTime() - currentDate.getTime()) / 86_400_000);

  if (dayDiff <= 0) {
    return 'Today';
  }

  return `in ${dayDiff} ${dayDiff === 1 ? 'day' : 'days'}`;
}

function formatLocalIsoDate(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function formatDurationDays(seconds: number): string {
  const days = seconds / 86_400;

  if (Number.isInteger(days)) {
    return `${days} ${days === 1 ? 'day' : 'days'}`;
  }

  return `${days.toFixed(1).replace(/\.0$/, '')} days`;
}

export default function EscrowDetail() {
  const { address: escrowAddress } = useParams<{ address: string }>();
  const { address: userAddress } = useAccount();
  const navigate = useNavigate();

  const handleBack = () => {
    navigate('/');
  };

  const { escrow: indexedEscrow, isLoading: loadingIndex } = useEscrowByAddress(escrowAddress);
  const version = indexedEscrow?.version ?? 1;
  const validEscrowAddress = escrowAddress && isAddress(escrowAddress) ? escrowAddress : undefined;
  const { data: liveData, isLoading: loadingLive, refetch } = useLiveEscrowData(
    validEscrowAddress,
    indexedEscrow?.yieldToOwner,
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState('');
  const [showCliffDuration, setShowCliffDuration] = useState(false);
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  const { getName, setName } = useEscrowNames();
  const { data: tokensIndex } = useTokens();
  const tokenMetadata =
    tokensIndex?.tokens[indexedEscrow?.token.toLowerCase() || ''] ??
    indexedEscrow?.tokenMetadata;
  const tokenPrice = useTokenPrice(indexedEscrow?.token);

  useEffect(() => {
    const nextMidnight = new Date();
    nextMidnight.setHours(24, 0, 0, 0);

    const timeoutId = window.setTimeout(() => {
      setNow(Math.floor(Date.now() / 1000));
    }, nextMidnight.getTime() - Date.now() + 1_000);

    return () => window.clearTimeout(timeoutId);
  }, [now]);

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
  const cliffEnd = escrow.vestingStart + escrow.cliffLength;
  const revokedOn = liveData && liveData.disabledAt < liveData.endTime
    ? Number(liveData.disabledAt)
    : null;
  const cliffLabel = showCliffDuration ? 'Cliff Duration' : 'Cliff Date';
  const cliffDisplay = showCliffDuration
    ? formatDurationDays(escrow.cliffLength)
    : `${now >= cliffEnd ? 'Reached' : formatDaysUntil(cliffEnd, now)} / ${formatLocalIsoDate(cliffEnd)}`;

  return (
    <div className="mx-auto w-full max-w-3xl min-w-0 space-y-8">
      {escrow.pending && (
        <div className="rounded border border-divider-strong bg-divider-subtle p-3 text-sm text-secondary">
          This escrow is confirmed onchain and will appear in the public index after the next indexer run.
        </div>
      )}
      {/* Header */}
      <div className="flex min-w-0 items-start justify-between gap-4">
        <div className="min-w-0">
          {/* Top row: back button (in logo-width container) + badge - aligns badge with title */}
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 flex-shrink-0">
              <button onClick={handleBack} className="inline-flex items-center justify-center px-1.5 py-0.5 border border-divider-strong rounded text-secondary hover:text-primary hover:border-primary transition-colors">
                <svg className="w-5 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M22 12H4M9 19l-7-7 7-7" />
                </svg>
              </button>
            </div>
            <StatusBadge status={escrow.status} isLoading={loadingLive} />
          </div>
          {/* Logo + title row */}
          <div className="flex min-w-0 items-center gap-3">
            <TokenLogo
              address={escrow.token}
              symbol={tokenMetadata?.symbol}
              logoUrl={tokenMetadata?.logoUrl}
              size={32}
            />
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
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
                    className="min-w-0 max-w-full text-2xl font-bold text-primary bg-transparent border-b border-primary outline-none"
                  />
                ) : (
                  <>
                    {getName(escrow.address) ? (
                      <h1
                        className="truncate text-2xl font-bold text-primary cursor-pointer hover:text-secondary transition-colors"
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
                        <h1 className="truncate text-2xl font-bold text-primary">
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
              </div>
              <div className="flex min-w-0 items-center gap-1.5 mt-1">
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
      <div className="w-full min-w-0 px-6 py-8 border border-divider-strong rounded-lg">
        <VestingTimeline
          vestingStart={escrow.vestingStart}
          vestingDuration={escrow.vestingDuration}
          cliffLength={escrow.cliffLength}
          claimedAmount={amounts.claimed}
          claimableAmount={amounts.claimable}
          lockedAmount={amounts.locked}
          totalAmount={amounts.total}
          decimals={decimals}
          tokenSymbol={tokenMetadata?.symbol}
          isLoading={!liveData && loadingLive}
        />
      </div>

      {/* Amounts */}
      <div className="grid min-w-0 gap-4 md:grid-cols-3">
        <ClaimableCard
          amount={amounts.claimable}
          decimals={decimals}
          value={formatValue(amounts.claimable)}
          isLoading={loadingLive}
          canClaim={showClaim}
          escrowAddress={escrow.address}
          recipient={escrow.recipient}
          version={version}
          onSuccess={() => refetch()}
        />
        <AmountCard
          label="Total"
          amount={amounts.total}
          decimals={decimals}
          value={formatValue(amounts.total)}
        />
        <AmountCard
          label="Claimed"
          amount={amounts.claimed}
          decimals={decimals}
          value={formatValue(amounts.claimed)}
          isLoading={loadingLive}
        />
      </div>

      {/* Actions */}
      {(showRevoke || showDisown) && (
        <div className="w-full min-w-0 p-6 border border-divider-strong rounded-lg">
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

      {escrow.yieldToOwner && liveData?.claimableYield !== undefined && liveData.claimableYield > 0n && (
        <div className="w-full min-w-0 p-6 border border-divider-strong rounded-lg">
          <h2 className="text-lg font-semibold text-primary mb-2">Vault Yield</h2>
          <p className="mb-4 text-sm text-secondary">
            Anyone may send the available vault shares to the fixed yield recipient.
          </p>
          <div className="flex items-center justify-between gap-4">
            <TokenAmount
              value={liveData.claimableYield}
              decimals={decimals}
              className="text-lg font-medium text-primary"
            />
            <YieldClaimButton escrowAddress={escrow.address} onSuccess={() => refetch()} />
          </div>
        </div>
      )}

      {/* Details */}
      <div className="w-full min-w-0 p-6 border border-divider-strong rounded-lg">
        <h2 className="text-lg font-semibold text-primary mb-4">Details</h2>
        <div className="space-y-4">
          <DetailRow label="Escrow Address">
            <AddressDisplay address={escrow.address} />
          </DetailRow>
          <DetailRow label="Version">{version}</DetailRow>
          <DetailRow label="Token">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded bg-divider-subtle px-2 py-1">
                <TokenLogo
                  address={escrow.token}
                  symbol={tokenMetadata?.symbol}
                  logoUrl={tokenMetadata?.logoUrl}
                  size={32}
                  displaySize={18}
                />
                <span className="font-medium text-primary">
                  {tokenMetadata?.symbol || 'Unknown'}
                </span>
                {typeof tokenPrice === 'number' && (
                  <span className="text-tertiary">
                    {formatUSD(tokenPrice)}
                  </span>
                )}
              </span>
              <CopyAddressIconButton address={escrow.token} label="Copy token address" />
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
          {escrow.yieldToOwner && escrow.yieldRecipient && (
            <DetailRow label="Yield Recipient">
              <AddressDisplay address={escrow.yieldRecipient} />
            </DetailRow>
          )}
          {escrow.yieldToOwner && escrow.asset && (
            <DetailRow label="Underlying Asset">
              <AddressDisplay address={escrow.asset} />
            </DetailRow>
          )}
          <DetailRow label="Duration">
            {formatDurationHuman(escrow.vestingDuration)}
          </DetailRow>
          {escrow.cliffLength > 0 && (
            <DetailRow label={cliffLabel}>
              <button
                onClick={() => setShowCliffDuration(!showCliffDuration)}
                className="text-primary hover:text-secondary transition-colors cursor-pointer"
                title={showCliffDuration ? 'Click to show cliff date' : 'Click to show cliff duration'}
              >
                {cliffDisplay}
              </button>
            </DetailRow>
          )}
          {revokedOn !== null && (
            <DetailRow label="Revoked On">
              {formatLocalIsoDate(revokedOn)}
            </DetailRow>
          )}
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
  version,
  onSuccess,
}: {
  amount: bigint;
  decimals: number;
  value: string | null;
  isLoading?: boolean;
  canClaim: boolean;
  escrowAddress: string;
  recipient: string;
  version: EscrowVersion;
  onSuccess?: () => void;
}) {
  const { data: hash, isPending, writeContract, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  const [showSuccess, setShowSuccess] = useState(false);
  const handledSuccessHash = useRef<string>();
  const onSuccessRef = useRef(onSuccess);

  const handleClaim = () => {
    if (version === 2) {
      writeContract({
        address: escrowAddress as ViemAddress,
        abi: claimAbi,
        functionName: 'claim',
      });
    } else {
      writeContract({
        address: escrowAddress as ViemAddress,
        abi: legacyClaimAbi,
        functionName: 'claim',
        args: [recipient as ViemAddress, maxUint256],
      });
    }
  };

  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

  // Handle success callback once per transaction and keep success state temporary.
  useEffect(() => {
    if (!isSuccess || !hash || handledSuccessHash.current === hash) {
      return;
    }

    handledSuccessHash.current = hash;
    setShowSuccess(true);
    onSuccessRef.current?.();

    const timeoutId = window.setTimeout(() => {
      setShowSuccess(false);
      handledSuccessHash.current = undefined;
      reset();
    }, 5_000);

    return () => window.clearTimeout(timeoutId);
  }, [hash, isSuccess, reset]);

  const isTxLoading = isPending || isConfirming;
  const hasClaimableAmount = amount > 0n;
  const canClick = isClaimable && hasClaimableAmount && !isTxLoading && !showSuccess;

  // Render the card content (same structure for all states)
  const renderCardContent = () => (
    <>
      <div className="text-sm text-secondary mb-1">
        Claimable
      </div>
      {isLoading ? (
        <div className="h-7 w-24 skeleton rounded" />
      ) : (
        <TokenAmount value={amount} decimals={decimals} className="block truncate text-lg font-medium text-primary" />
      )}
      {isLoading ? (
        <div className="h-4 w-16 skeleton rounded mt-1" />
      ) : value ? (
        <div className="text-sm text-tertiary">{value}</div>
      ) : null}
    </>
  );

  // Determine card styling based on state
  const isActive = canClick || isTxLoading || showSuccess;
  const cardClasses = `relative min-w-0 p-4 border rounded-lg ${
    isActive
      ? 'border-primary' + (isTxLoading ? ' bg-divider-subtle' : '')
      : 'border-divider-strong'
  }`;

  if (showSuccess) {
    return (
      <div className={`${cardClasses} overflow-hidden`}>
        <div className="opacity-20">
          {renderCardContent()}
        </div>
        <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-background text-sm font-medium text-claimable">
          🎉 Claim success!
        </div>
      </div>
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

function YieldClaimButton({
  escrowAddress,
  onSuccess,
}: {
  escrowAddress: string;
  onSuccess?: () => void;
}) {
  const { data: hash, isPending, writeContract, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  const handledSuccessHash = useRef<string>();
  const onSuccessRef = useRef(onSuccess);

  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

  useEffect(() => {
    if (!isSuccess || !hash || handledSuccessHash.current === hash) return;
    handledSuccessHash.current = hash;
    onSuccessRef.current?.();
  }, [hash, isSuccess]);

  return (
    <div className="text-right">
      <Button
        variant="secondary"
        loading={isPending || isConfirming}
        onClick={() => {
          reset();
          writeContract({
            address: escrowAddress as ViemAddress,
            abi: yieldClaimAbi,
            functionName: 'claim_yield',
          });
        }}
      >
        {isPending ? 'Confirm in wallet...' : isConfirming ? 'Claiming...' : 'Claim Yield'}
      </Button>
      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">
          {error.message.includes('User rejected') ? 'Transaction rejected' : 'Failed to claim yield'}
        </p>
      )}
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
    <div className="relative min-w-0 p-4 border rounded-lg border-divider-strong">
      <div className="text-sm text-secondary mb-1">{label}</div>
      {isLoading ? (
        <div className="h-7 w-24 skeleton rounded" />
      ) : (
        <TokenAmount value={amount} decimals={decimals} className="block truncate text-lg font-medium text-primary" />
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

function CopyAddressIconButton({
  address,
  label,
}: {
  address: string;
  label: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2_000);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="text-tertiary hover:text-primary transition-colors"
      title={copied ? 'Copied!' : label}
      aria-label={copied ? 'Copied' : label}
    >
      {copied ? (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      )}
    </button>
  );
}
