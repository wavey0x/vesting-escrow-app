import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'vesting-escrow-starred';

export function useStarredEscrows() {
  const [starred, setStarred] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(starred));
  }, [starred]);

  const isStarred = useCallback((address: string) => {
    return starred.some(a => a.toLowerCase() === address.toLowerCase());
  }, [starred]);

  const toggleStar = useCallback((address: string) => {
    setStarred(prev => {
      const normalizedAddress = address.toLowerCase();
      const exists = prev.some(a => a.toLowerCase() === normalizedAddress);
      if (exists) {
        return prev.filter(a => a.toLowerCase() !== normalizedAddress);
      } else {
        return [address, ...prev];
      }
    });
  }, []);

  const addStar = useCallback((address: string) => {
    setStarred(prev => {
      const normalizedAddress = address.toLowerCase();
      if (prev.some(a => a.toLowerCase() === normalizedAddress)) {
        return prev;
      }
      return [address, ...prev];
    });
  }, []);

  const removeStar = useCallback((address: string) => {
    setStarred(prev =>
      prev.filter(a => a.toLowerCase() !== address.toLowerCase())
    );
  }, []);

  return {
    starred,
    isStarred,
    toggleStar,
    addStar,
    removeStar,
  };
}
