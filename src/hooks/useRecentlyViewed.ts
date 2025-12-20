import { useCallback, useEffect, useState } from 'react';
import { RECENTLY_VIEWED_LIMIT } from '../lib/constants';
import { RecentlyViewedItem } from '../lib/types';

const STORAGE_KEY = 'vesting-escrow-recently-viewed';

function loadRecentlyViewed(): RecentlyViewedItem[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to load recently viewed:', error);
  }
  return [];
}

function saveRecentlyViewed(items: RecentlyViewedItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (error) {
    console.error('Failed to save recently viewed:', error);
  }
}

export function useRecentlyViewed() {
  const [items, setItems] = useState<RecentlyViewedItem[]>(() =>
    loadRecentlyViewed()
  );

  // Sync with localStorage on mount
  useEffect(() => {
    const stored = loadRecentlyViewed();
    setItems(stored);
  }, []);

  const addRecentlyViewed = useCallback(
    (item: Omit<RecentlyViewedItem, 'visitedAt'>) => {
      setItems((current) => {
        // Remove existing entry for this address
        const filtered = current.filter(
          (i) => i.address.toLowerCase() !== item.address.toLowerCase()
        );

        // Add new entry at the beginning
        const updated = [
          { ...item, visitedAt: Date.now() },
          ...filtered,
        ].slice(0, RECENTLY_VIEWED_LIMIT);

        saveRecentlyViewed(updated);
        return updated;
      });
    },
    []
  );

  const clearRecentlyViewed = useCallback(() => {
    setItems([]);
    saveRecentlyViewed([]);
  }, []);

  return {
    items,
    addRecentlyViewed,
    clearRecentlyViewed,
  };
}
