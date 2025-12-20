import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { isAddress } from 'viem';
import Button from '../components/Button';
import Spinner from '../components/Spinner';
import EscrowCard from '../components/EscrowCard';
import { useEscrows, useEscrowsByAddress } from '../hooks/useEscrows';
import { useRecentlyViewed } from '../hooks/useRecentlyViewed';
import { useTokens } from '../hooks/useTokens';
import { IndexedEscrow } from '../lib/types';

type Tab = 'my-escrows' | 'recently-viewed' | 'search';

export default function Manage() {
  const { address, isConnected } = useAccount();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('my-escrows');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchError, setSearchError] = useState('');
  const [searchResults, setSearchResults] = useState<IndexedEscrow[] | null>(null);
  const [hideCompleted, setHideCompleted] = useState(true);

  const isCompleted = (escrow: IndexedEscrow) => {
    const now = Math.floor(Date.now() / 1000);
    return escrow.vestingStart + escrow.vestingDuration < now;
  };

  const filterEscrows = (escrows: IndexedEscrow[] | undefined) => {
    if (!escrows) return [];
    if (!hideCompleted) return escrows;
    return escrows.filter(e => !isCompleted(e));
  };

  const { escrows: myEscrows, isLoading: loadingEscrows } = useEscrowsByAddress(address);
  const { items: recentlyViewed } = useRecentlyViewed();
  const { data: escrowsIndex, isLoading: loadingIndex } = useEscrows();
  const { data: tokensIndex } = useTokens();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError('');
    setSearchResults(null);

    const query = searchQuery.trim();
    if (!query) {
      setSearchError('Please enter an address');
      return;
    }

    if (!isAddress(query)) {
      setSearchError('Invalid Ethereum address');
      return;
    }

    // Check if it's an escrow address
    const escrow = escrowsIndex?.escrows.find(
      (e) => e.address.toLowerCase() === query.toLowerCase()
    );

    if (escrow) {
      navigate(`/view/${query}`);
      return;
    }

    // Check if it's a recipient address
    const recipientEscrows = escrowsIndex?.escrows
      .filter((e) => e.recipient.toLowerCase() === query.toLowerCase())
      .sort((a, b) => b.blockNumber - a.blockNumber) || [];

    if (recipientEscrows.length > 0) {
      setSearchResults(recipientEscrows);
      return;
    }

    // No results found
    setSearchError('No escrows found for this address');
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'my-escrows', label: 'My Escrows' },
    { id: 'recently-viewed', label: 'Recently Viewed' },
    { id: 'search', label: 'Search' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl text-primary text-center">View Escrows</h1>
      </div>

      {/* Tabs */}
      <div className="border-b border-divider-subtle">
        <nav className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-secondary hover:text-primary'
              }`}
            >
              {tab.label}
              {tab.id === 'my-escrows' && myEscrows && myEscrows.length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 text-xs bg-divider-subtle rounded">
                  {myEscrows.length}
                </span>
              )}
              {tab.id === 'recently-viewed' && recentlyViewed.length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 text-xs bg-divider-subtle rounded">
                  {recentlyViewed.length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'my-escrows' && (
        <div>
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
              <div className="flex items-center justify-end">
                <label className="flex items-center gap-2 text-sm text-secondary cursor-pointer">
                  <span>Hide completed</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={hideCompleted}
                    onClick={() => setHideCompleted(!hideCompleted)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      hideCompleted ? 'bg-primary' : 'bg-divider-strong'
                    }`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                        hideCompleted ? 'translate-x-4.5' : 'translate-x-1'
                      }`}
                      style={{ transform: hideCompleted ? 'translateX(18px)' : 'translateX(4px)' }}
                    />
                  </button>
                </label>
              </div>
              {filterEscrows(myEscrows).map((escrow) => (
                <EscrowCard
                  key={escrow.address}
                  escrow={escrow}
                  tokenMetadata={tokensIndex?.tokens[escrow.token.toLowerCase()]}
                />
              ))}
              {filterEscrows(myEscrows).length === 0 && (
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

      {activeTab === 'recently-viewed' && (
        <div>
          {recentlyViewed.length > 0 ? (
            <div className="space-y-4">
              {recentlyViewed.map((item) => {
                const escrow = escrowsIndex?.escrows.find(
                  (e) => e.address.toLowerCase() === item.address.toLowerCase()
                );
                if (!escrow) return null;
                return (
                  <EscrowCard
                    key={escrow.address}
                    escrow={escrow}
                    tokenMetadata={tokensIndex?.tokens[escrow.token.toLowerCase()]}
                  />
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-secondary">
              No recently viewed escrows
            </div>
          )}
        </div>
      )}

      {activeTab === 'search' && (
        <div className="space-y-6">
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
              <div>
                {searchError && (
                  <p className="text-sm text-red-600 dark:text-red-400">{searchError}</p>
                )}
              </div>
              <label className="flex items-center gap-2 text-xs text-tertiary cursor-pointer">
                <span>Hide completed</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={hideCompleted}
                  onClick={() => setHideCompleted(!hideCompleted)}
                  className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${
                    hideCompleted ? 'bg-primary' : 'bg-divider-strong'
                  }`}
                >
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full bg-white transition-transform"
                    style={{ transform: hideCompleted ? 'translateX(14px)' : 'translateX(3px)' }}
                  />
                </button>
              </label>
            </div>
          </form>

          {searchResults && searchResults.length > 0 && (
            <div className="space-y-4">
              <p className="text-sm text-secondary">
                Found {filterEscrows(searchResults).length} escrow{filterEscrows(searchResults).length !== 1 ? 's' : ''} for this recipient
                {hideCompleted && searchResults.length !== filterEscrows(searchResults).length && (
                  <span className="text-tertiary"> ({searchResults.length - filterEscrows(searchResults).length} completed hidden)</span>
                )}
              </p>
              {filterEscrows(searchResults).map((escrow) => (
                <EscrowCard
                  key={escrow.address}
                  escrow={escrow}
                  tokenMetadata={tokensIndex?.tokens[escrow.token.toLowerCase()]}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
