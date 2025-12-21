import { useState, useMemo, useCallback, useEffect } from 'react';
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
import { IndexedEscrow } from '../lib/types';

type Tab = 'my-escrows' | 'starred' | 'search';

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
  const [searchResults, setSearchResults] = useState<IndexedEscrow[] | null>(null);
  const [hideCompleted, setHideCompleted] = useState(() => {
    const param = searchParams.get('hideCompleted');
    return param === null ? true : param !== 'false';
  });
  const [pendingSearch, setPendingSearch] = useState(() => !!searchParams.get('q'));

  // Update URL when hideCompleted changes
  const toggleHideCompleted = useCallback(() => {
    setHideCompleted(prev => {
      const newValue = !prev;
      const newParams = new URLSearchParams(searchParams);
      if (newValue) {
        newParams.delete('hideCompleted'); // default is true, so omit from URL
      } else {
        newParams.set('hideCompleted', 'false');
      }
      setSearchParams(newParams);
      return newValue;
    });
  }, [searchParams, setSearchParams]);

  // Determine if escrow is completed based on time
  const isCompleted = useCallback((escrow: IndexedEscrow) => {
    const now = Math.floor(Date.now() / 1000);
    return escrow.vestingStart + escrow.vestingDuration < now;
  }, []);

  // Determine if escrow is active (cliff or vesting, not completed)
  const isActive = useCallback((escrow: IndexedEscrow) => {
    return !isCompleted(escrow);
  }, [isCompleted]);

  // Sort and filter escrows consistently:
  // 1. Active escrows (cliff/vesting) first, then completed
  // 2. Within each group, sort by start time descending (newest first)
  const sortAndFilterEscrows = useCallback((escrows: IndexedEscrow[] | undefined) => {
    if (!escrows) return [];

    // Filter if hideCompleted is enabled
    const filtered = hideCompleted
      ? escrows.filter(e => isActive(e))
      : escrows;

    // Sort: active first, then by start time descending
    return [...filtered].sort((a, b) => {
      const aActive = isActive(a);
      const bActive = isActive(b);

      // Active escrows come first
      if (aActive && !bActive) return -1;
      if (!aActive && bActive) return 1;

      // Within same group, sort by start time descending (newest first)
      return b.vestingStart - a.vestingStart;
    });
  }, [hideCompleted, isActive]);

  const { escrows: myEscrows, isLoading: loadingEscrows } = useEscrowsByAddress(address);
  const { starred } = useStarredEscrows();
  const { data: escrowsIndex, isLoading: loadingIndex } = useEscrows();
  const { data: tokensIndex } = useTokens();

  // Default to search tab if no wallet connected and no favorites
  useEffect(() => {
    if (!searchParams.get('q') && !isConnected && starred.length === 0) {
      setActiveTab('search');
    }
  }, []);

  // Get starred escrows from index
  const starredEscrows = useMemo(() => {
    if (!escrowsIndex?.escrows) return [];
    return starred
      .map(addr => escrowsIndex.escrows.find(
        e => e.address.toLowerCase() === addr.toLowerCase()
      ))
      .filter((e): e is IndexedEscrow => e !== undefined);
  }, [starred, escrowsIndex]);

  // Collect all escrow addresses that need live data based on active tab
  const escrowAddressesToFetch = useMemo(() => {
    const addresses: string[] = [];

    if (activeTab === 'my-escrows' && myEscrows) {
      addresses.push(...sortAndFilterEscrows(myEscrows).map(e => e.address));
    } else if (activeTab === 'starred') {
      addresses.push(...sortAndFilterEscrows(starredEscrows).map(e => e.address));
    } else if (activeTab === 'search' && searchResults) {
      addresses.push(...sortAndFilterEscrows(searchResults).map(e => e.address));
    }

    return addresses;
  }, [activeTab, myEscrows, starredEscrows, searchResults, sortAndFilterEscrows]);

  // Batch fetch live data for all visible escrows
  const { data: liveDataMap, isLoading: loadingLiveData } = useBatchLiveEscrowData(escrowAddressesToFetch);

  const performSearch = useCallback((query: string, updateUrl = true) => {
    setSearchError('');
    setSearchResults(null);

    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      setSearchError('Please enter an address');
      if (updateUrl) setSearchParams({});
      return;
    }

    if (!isAddress(trimmedQuery)) {
      setSearchError('Invalid Ethereum address');
      return;
    }

    // Update URL with search query
    if (updateUrl) {
      setSearchParams({ q: trimmedQuery });
    }

    // Check if it's an escrow address
    const escrow = escrowsIndex?.escrows.find(
      (e) => e.address.toLowerCase() === trimmedQuery.toLowerCase()
    );

    if (escrow) {
      navigate(`/view/${trimmedQuery}`);
      return;
    }

    // Check if it's a recipient address
    const recipientEscrows = escrowsIndex?.escrows
      .filter((e) => e.recipient.toLowerCase() === trimmedQuery.toLowerCase())
      .sort((a, b) => b.blockNumber - a.blockNumber) || [];

    if (recipientEscrows.length > 0) {
      setSearchResults(recipientEscrows);
      return;
    }

    // No results found
    setSearchError('No escrows found for this address');
  }, [escrowsIndex, navigate, setSearchParams]);

  // Auto-search from URL when escrowsIndex loads
  useEffect(() => {
    if (pendingSearch && escrowsIndex && !loadingIndex) {
      performSearch(searchQuery, false);
      setPendingSearch(false);
    }
  }, [pendingSearch, escrowsIndex, loadingIndex, searchQuery, performSearch]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(searchQuery);
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
            <div className="flex items-center justify-between">
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
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform`}
                    style={{ transform: hideCompleted ? 'translateX(18px)' : 'translateX(4px)' }}
                  />
                </button>
              </label>
              <div>
                {searchError && (
                  <p className="text-sm text-red-600 dark:text-red-400">{searchError}</p>
                )}
              </div>
            </div>
          </form>

          {searchResults && searchResults.length > 0 && (
            <div className="space-y-4">
              <p className="text-sm text-secondary">
                Found {sortAndFilterEscrows(searchResults).length} escrow{sortAndFilterEscrows(searchResults).length !== 1 ? 's' : ''} for this recipient
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
    </div>
  );
}
