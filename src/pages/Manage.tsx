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

type Tab = 'my-escrows' | 'recently-viewed' | 'search';

export default function Manage() {
  const { address, isConnected } = useAccount();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('my-escrows');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchError, setSearchError] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{
    address: string;
    token: string;
    recipient: string;
    funder: string;
    amount: string;
    vestingStart: number;
    vestingDuration: number;
    cliffLength: number;
    openClaim: boolean;
  }> | null>(null);

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
    const recipientEscrows = escrowsIndex?.escrows.filter(
      (e) => e.recipient.toLowerCase() === query.toLowerCase()
    ) || [];

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
        <h1 className="text-2xl font-bold text-primary mb-2">View Escrows</h1>
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
              {myEscrows.map((escrow) => (
                <EscrowCard
                  key={escrow.address}
                  escrow={escrow}
                  tokenMetadata={tokensIndex?.tokens[escrow.token.toLowerCase()]}
                />
              ))}
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
          <form onSubmit={handleSearch} className="max-w-xl space-y-4">
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-primary mb-2">
                Escrow or Recipient Address
              </label>
              <input
                id="search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="0x..."
                className="w-full px-4 py-2 border border-divider-strong rounded focus:outline-none focus:border-primary font-mono"
              />
              {searchError && (
                <p className="mt-2 text-sm text-red-600">{searchError}</p>
              )}
            </div>
            <Button type="submit">Search</Button>
          </form>

          {searchResults && searchResults.length > 0 && (
            <div className="space-y-4">
              <p className="text-sm text-secondary">
                Found {searchResults.length} escrow{searchResults.length !== 1 ? 's' : ''} for this recipient
              </p>
              {searchResults.map((escrow) => (
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
