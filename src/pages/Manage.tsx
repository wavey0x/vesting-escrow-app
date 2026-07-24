import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { isAddress } from 'viem';
import Button from '../components/Button';
import Spinner from '../components/Spinner';
import EscrowCard from '../components/EscrowCard';
import { useEscrows, useEscrowsByAddress } from '../hooks/useEscrows';
import { useStarredEscrows } from '../contexts/StarredEscrowsContext';
import { useBatchLiveEscrowData } from '../hooks/useBatchLiveEscrowData';
import { useTokens } from '../hooks/useTokens';
import { IndexedEscrow, EscrowStatus } from '../lib/types';
import StatusFilter, { ALL_STATUSES } from '../components/StatusFilter';
import { getEscrowStatus, mergeEscrowData } from '../lib/escrow';

type Tab = 'my-escrows' | 'starred' | 'search' | 'all';

// Check if admin mode is enabled via localStorage
const isAdmin = () => {
  try {
    return localStorage.getItem('admin') === 'true';
  } catch {
    return false;
  }
};

export default function Manage() {
  const { address, isConnected } = useAccount();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    // Start on search tab if there's a query in URL
    return searchParams.get('q') ? 'search' : 'my-escrows';
  });
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('q') || '');
  const [searchError, setSearchError] = useState('');
  const [hideCompleted, setHideCompleted] = useState(() => {
    const param = searchParams.get('hideCompleted');
    return param === null ? true : param !== 'false';
  });
  const includeFunders = searchParams.get('includeFunders') === 'true';
  const [hideFullyClaimed, setHideFullyClaimed] = useState(true); // Admin-only: hide escrows with 0 claimable
  const [selectedStatuses, setSelectedStatuses] = useState<Set<EscrowStatus>>(() => new Set(ALL_STATUSES));

  const toggleStatus = useCallback((status: EscrowStatus) => {
    setSelectedStatuses(prev => {
      const next = new Set(prev);
      if (next.has(status)) {
        next.delete(status);
      } else {
        next.add(status);
      }
      // Snap back to all selected if empty
      if (next.size === 0) return new Set(ALL_STATUSES);
      return next;
    });
  }, []);

  // Update URL when hideCompleted changes
  const toggleHideCompleted = useCallback(() => {
    const newValue = !hideCompleted;
    setHideCompleted(newValue);

    // Update URL separately (not inside setState updater)
    const newParams = new URLSearchParams(searchParams);
    if (newValue) {
      newParams.delete('hideCompleted'); // default is true, so omit from URL
    } else {
      newParams.set('hideCompleted', 'false');
    }
    setSearchParams(newParams);
  }, [hideCompleted, searchParams, setSearchParams]);

  const toggleIncludeFunders = useCallback(() => {
    const newParams = new URLSearchParams(searchParams);
    if (includeFunders) {
      newParams.delete('includeFunders');
    } else {
      newParams.set('includeFunders', 'true');
    }
    setSearchParams(newParams);
  }, [includeFunders, searchParams, setSearchParams]);

  // Determine if escrow is completed based on time
  const isCompleted = useCallback((escrow: IndexedEscrow) => {
    const now = Math.floor(Date.now() / 1000);
    return escrow.vestingStart + escrow.vestingDuration < now;
  }, []);

  // Determine if escrow is active (cliff or vesting, not completed)
  const isActive = useCallback((escrow: IndexedEscrow) => {
    return !isCompleted(escrow);
  }, [isCompleted]);

  // Sort escrows: active first, then by start time descending (newest first)
  const sortEscrows = useCallback((escrows: IndexedEscrow[] | undefined) => {
    if (!escrows) return [];
    return [...escrows].sort((a, b) => {
      const aActive = isActive(a);
      const bActive = isActive(b);
      if (aActive && !bActive) return -1;
      if (!aActive && bActive) return 1;
      return b.vestingStart - a.vestingStart;
    });
  }, [isActive]);

  // Sort and filter escrows (used on non-admin tabs with hideCompleted toggle)
  const sortAndFilterEscrows = useCallback((escrows: IndexedEscrow[] | undefined) => {
    if (!escrows) return [];
    const filtered = hideCompleted
      ? escrows.filter(e => isActive(e))
      : escrows;
    return sortEscrows(filtered);
  }, [hideCompleted, isActive, sortEscrows]);

  const { escrows: myEscrows, isLoading: loadingEscrows } = useEscrowsByAddress(address);
  const { starred } = useStarredEscrows();
  const { data: escrowsIndex, isLoading: loadingIndex } = useEscrows();
  const { data: tokensIndex } = useTokens();

  // Track if we've set the initial tab (only do it once)
  const hasSetInitialTab = useRef(false);

  // Set default tab based on state (only once, after data loads):
  // - If has stars: Starred (highest priority)
  // - If wallet connected AND has escrows: My Escrows
  // - Otherwise: Search
  useEffect(() => {
    if (hasSetInitialTab.current) return; // Already set, don't override user selection
    if (searchParams.get('q')) {
      hasSetInitialTab.current = true;
      return; // URL query takes precedence
    }
    // Wait for escrows to load before deciding (if connected)
    if (isConnected && myEscrows === undefined) return;

    hasSetInitialTab.current = true;
    if (starred.length > 0) {
      setActiveTab('starred');
    } else if (isConnected && myEscrows && myEscrows.length > 0) {
      setActiveTab('my-escrows');
    } else {
      setActiveTab('search');
    }
  }, [myEscrows, starred.length, isConnected, searchParams]);

  // Get starred escrows from index
  const starredEscrows = useMemo(() => {
    if (!escrowsIndex?.escrows) return [];
    return starred
      .map(addr => escrowsIndex.escrows.find(
        e => e.address.toLowerCase() === addr.toLowerCase()
      ))
      .filter((e): e is IndexedEscrow => e !== undefined);
  }, [starred, escrowsIndex]);

  // Get all escrows for admin tab
  const allEscrows = useMemo(() => {
    return escrowsIndex?.escrows || [];
  }, [escrowsIndex]);

  // Derive search results from URL query - this survives back navigation
  const urlQuery = searchParams.get('q')?.trim() || '';
  const searchResults = useMemo(() => {
    if (!urlQuery || !escrowsIndex?.escrows) return null;
    if (!isAddress(urlQuery)) return null;

    const lowerQuery = urlQuery.toLowerCase();
    const matchingEscrows = escrowsIndex.escrows
      .filter((e) => (
        e.recipient.toLowerCase() === lowerQuery ||
        (includeFunders && e.funder.toLowerCase() === lowerQuery)
      ))
      .sort((a, b) => b.blockNumber - a.blockNumber);

    return matchingEscrows.length > 0 ? matchingEscrows : null;
  }, [urlQuery, escrowsIndex, includeFunders]);

  // If URL query matches an exact escrow address, navigate to it
  useEffect(() => {
    if (!urlQuery || !escrowsIndex?.escrows) return;
    if (!isAddress(urlQuery)) return;

    const escrow = escrowsIndex.escrows.find(
      (e) => e.address.toLowerCase() === urlQuery.toLowerCase()
    );

    if (escrow) {
      navigate(`/vest/${urlQuery}`, { replace: true, state: { fromApp: true } });
    }
  }, [urlQuery, escrowsIndex, navigate]);

  // Derive search error from URL query
  const derivedSearchError = useMemo(() => {
    if (!urlQuery) return '';
    if (!isAddress(urlQuery)) return 'Invalid Ethereum address';
    if (escrowsIndex?.escrows && !searchResults) {
      // Check if it's not an escrow address either
      const isEscrowAddress = escrowsIndex.escrows.some(
        (e) => e.address.toLowerCase() === urlQuery.toLowerCase()
      );
      if (!isEscrowAddress) return 'No escrows found for this address';
    }
    return '';
  }, [urlQuery, escrowsIndex, searchResults]);

  // Collect all escrow addresses that need live data based on active tab
  const escrowsToFetch = useMemo(() => {
    const escrows: IndexedEscrow[] = [];

    if (activeTab === 'my-escrows' && myEscrows) {
      escrows.push(...sortAndFilterEscrows(myEscrows));
    } else if (activeTab === 'starred') {
      escrows.push(...sortAndFilterEscrows(starredEscrows));
    } else if (activeTab === 'search' && searchResults) {
      escrows.push(...sortAndFilterEscrows(searchResults));
    } else if (activeTab === 'all') {
      escrows.push(...sortEscrows(allEscrows));
    }

    return escrows;
  }, [activeTab, myEscrows, starredEscrows, searchResults, allEscrows, sortAndFilterEscrows, sortEscrows]);

  // Batch fetch live data for all visible escrows
  const { data: liveDataMap, isLoading: loadingLiveData } = useBatchLiveEscrowData(escrowsToFetch);

  const filterByStatus = useCallback((escrows: IndexedEscrow[]) => {
    if (selectedStatuses.size === ALL_STATUSES.length) return escrows;
    return escrows.filter(escrow => {
      const merged = mergeEscrowData(escrow, liveDataMap[escrow.address.toLowerCase()]);
      const status = getEscrowStatus(merged);
      return selectedStatuses.has(status);
    });
  }, [selectedStatuses, liveDataMap]);

  // Search just updates the URL - results are derived from URL query
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError('');
    const trimmedQuery = searchQuery.trim();

    if (!trimmedQuery) {
      setSearchError('Please enter an address');
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('q');
      setSearchParams(newParams);
      return;
    }

    if (!isAddress(trimmedQuery)) {
      setSearchError('Invalid Ethereum address');
      return;
    }

    // Update URL while preserving search options
    const newParams = new URLSearchParams(searchParams);
    newParams.set('q', trimmedQuery);
    setSearchParams(newParams);
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    {
      id: 'search',
      label: 'Search',
      icon: (
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
      ),
    },
    {
      id: 'starred',
      label: 'Starred',
      icon: (
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ),
    },
    {
      id: 'my-escrows',
      label: 'My Escrows',
      icon: (
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
        </svg>
      ),
    },
    // Admin-only tab
    ...(isAdmin() ? [{
      id: 'all' as Tab,
      label: 'All',
      icon: (
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
        </svg>
      ),
    }] : []),
  ];

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      {/* Tabs */}
      <div className="border-b border-divider-subtle">
        <nav className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-secondary hover:text-primary'
              }`}
            >
              {tab.icon}
              <span className="ml-1.5">{tab.label}</span>
              {tab.id === 'my-escrows' && myEscrows && myEscrows.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-divider-subtle rounded">
                  {myEscrows.length}
                </span>
              )}
              {tab.id === 'starred' && starredEscrows.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-divider-subtle rounded">
                  {starredEscrows.length}
                </span>
              )}
              {tab.id === 'all' && allEscrows.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-divider-subtle rounded">
                  {allEscrows.length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'my-escrows' && (
        <div className="min-h-[200px]">
          {!isConnected ? (
            <div className="text-center py-12 text-secondary">
              Connect your wallet to see your escrows
            </div>
          ) : loadingEscrows || loadingIndex ? (
            <div className="flex items-center justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : myEscrows && myEscrows.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-start">
                <label className="flex items-center gap-2 text-sm text-secondary cursor-pointer">
                  <span>Hide completed</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={hideCompleted}
                    onClick={toggleHideCompleted}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      hideCompleted ? 'bg-divider-strong' : 'bg-divider-subtle'
                    }`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white border border-divider-strong shadow-sm transition-transform ${
                        hideCompleted ? 'translate-x-4.5' : 'translate-x-1'
                      }`}
                      style={{ transform: hideCompleted ? 'translateX(18px)' : 'translateX(4px)' }}
                    />
                  </button>
                </label>
              </div>
              {sortAndFilterEscrows(myEscrows).map((escrow) => (
                <EscrowCard
                  key={escrow.address}
                  escrow={escrow}
                  tokenMetadata={tokensIndex?.tokens[escrow.token.toLowerCase()]}
                  liveData={liveDataMap[escrow.address.toLowerCase()]}
                  isLoadingLiveData={loadingLiveData}
                />
              ))}
              {sortAndFilterEscrows(myEscrows).length === 0 && (
                <div className="text-center py-8 text-secondary">
                  No active escrows (completed hidden)
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-secondary">
              No escrows found for your address
            </div>
          )}
        </div>
      )}

      {activeTab === 'starred' && (
        <div className="min-h-[200px]">
          {starredEscrows.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-start">
                <label className="flex items-center gap-2 text-sm text-secondary cursor-pointer">
                  <span>Hide completed</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={hideCompleted}
                    onClick={toggleHideCompleted}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      hideCompleted ? 'bg-divider-strong' : 'bg-divider-subtle'
                    }`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white border border-divider-strong shadow-sm transition-transform`}
                      style={{ transform: hideCompleted ? 'translateX(18px)' : 'translateX(4px)' }}
                    />
                  </button>
                </label>
              </div>
              {sortAndFilterEscrows(starredEscrows).map((escrow) => (
                <EscrowCard
                  key={escrow.address}
                  escrow={escrow}
                  tokenMetadata={tokensIndex?.tokens[escrow.token.toLowerCase()]}
                  liveData={liveDataMap[escrow.address.toLowerCase()]}
                  isLoadingLiveData={loadingLiveData}
                />
              ))}
              {sortAndFilterEscrows(starredEscrows).length === 0 && (
                <div className="text-center py-8 text-secondary">
                  No active escrows (completed hidden)
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-secondary">
              No starred escrows. Click the star on any escrow to save it here.
            </div>
          )}
        </div>
      )}

      {activeTab === 'search' && (
        <div className="space-y-6 min-h-[200px]">
          <form onSubmit={handleSearch} className="space-y-3">
            <div className="flex gap-2">
              <input
                id="search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter escrow or recipient address"
                className="flex-1 px-3 py-2 text-sm border border-divider-strong rounded bg-background focus:outline-none focus:border-primary"
              />
              <Button type="submit">Search</Button>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-1.5 text-xs text-secondary cursor-pointer whitespace-nowrap">
                  <span>Include funders</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={includeFunders}
                    onClick={toggleIncludeFunders}
                    className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${
                      includeFunders ? 'bg-divider-strong' : 'bg-divider-subtle'
                    }`}
                  >
                    <span
                      className="inline-block h-3 w-3 rounded-full bg-white border border-divider-strong transition-transform"
                      style={{ transform: includeFunders ? 'translateX(14px)' : 'translateX(2px)' }}
                    />
                  </button>
                </label>
                <label className="flex items-center gap-1.5 text-xs text-secondary cursor-pointer whitespace-nowrap">
                  <span>Hide completed</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={hideCompleted}
                    onClick={toggleHideCompleted}
                    className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${
                      hideCompleted ? 'bg-divider-strong' : 'bg-divider-subtle'
                    }`}
                  >
                    <span
                      className="inline-block h-3 w-3 rounded-full bg-white border border-divider-strong transition-transform"
                      style={{ transform: hideCompleted ? 'translateX(14px)' : 'translateX(2px)' }}
                    />
                  </button>
                </label>
              </div>
              <div>
                {(searchError || derivedSearchError) && (
                  <p className="text-sm text-red-600 dark:text-red-400">{searchError || derivedSearchError}</p>
                )}
              </div>
            </div>
          </form>

          {searchResults && searchResults.length > 0 && (
            <div className="space-y-4">
              <p className="text-sm text-secondary">
                Found {sortAndFilterEscrows(searchResults).length} escrow{sortAndFilterEscrows(searchResults).length !== 1 ? 's' : ''}{includeFunders ? ' matching this address' : ' for this recipient'}
                {hideCompleted && searchResults.length !== sortAndFilterEscrows(searchResults).length && (
                  <span className="text-tertiary"> ({searchResults.length - sortAndFilterEscrows(searchResults).length} completed hidden)</span>
                )}
              </p>
              {sortAndFilterEscrows(searchResults).map((escrow) => (
                <EscrowCard
                  key={escrow.address}
                  escrow={escrow}
                  tokenMetadata={tokensIndex?.tokens[escrow.token.toLowerCase()]}
                  liveData={liveDataMap[escrow.address.toLowerCase()]}
                  isLoadingLiveData={loadingLiveData}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'all' && isAdmin() && (
        <div className="min-h-[200px]">
          {loadingIndex ? (
            <div className="flex items-center justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : allEscrows.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <StatusFilter selectedStatuses={selectedStatuses} onToggle={toggleStatus} />
                <label className="flex items-center gap-2 text-sm text-secondary cursor-pointer">
                  <span>Hide fully claimed</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={hideFullyClaimed}
                    onClick={() => setHideFullyClaimed(prev => !prev)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      hideFullyClaimed ? 'bg-divider-strong' : 'bg-divider-subtle'
                    }`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white border border-divider-strong shadow-sm transition-transform`}
                      style={{ transform: hideFullyClaimed ? 'translateX(18px)' : 'translateX(4px)' }}
                    />
                  </button>
                </label>
              </div>
              {filterByStatus(sortEscrows(allEscrows))
                .filter(escrow => {
                  if (!hideFullyClaimed) return true;
                  const live = liveDataMap[escrow.address.toLowerCase()];
                  if (!live) return true; // Show while loading
                  return Number(live.unclaimed) > 0 || Number(live.locked) > 0;
                })
                .map((escrow) => (
                <EscrowCard
                  key={escrow.address}
                  escrow={escrow}
                  tokenMetadata={tokensIndex?.tokens[escrow.token.toLowerCase()]}
                  liveData={liveDataMap[escrow.address.toLowerCase()]}
                  isLoadingLiveData={loadingLiveData}
                />
              ))}
              {filterByStatus(sortEscrows(allEscrows)).filter(escrow => {
                if (!hideFullyClaimed) return true;
                const live = liveDataMap[escrow.address.toLowerCase()];
                if (!live) return true;
                return Number(live.unclaimed) > 0 || Number(live.locked) > 0;
              }).length === 0 && (
                <div className="text-center py-8 text-secondary">
                  No escrows match selected filters
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-secondary">
              No escrows found
            </div>
          )}
        </div>
      )}
    </div>
  );
}
