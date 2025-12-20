import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

const STORAGE_KEY = 'vesting-escrow-starred';

interface StarredEscrowsContextType {
  starred: string[];
  isStarred: (address: string) => boolean;
  toggleStar: (address: string) => void;
  addStar: (address: string) => void;
  removeStar: (address: string) => void;
}

const StarredEscrowsContext = createContext<StarredEscrowsContextType | undefined>(undefined);

function getInitialStarred(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function StarredEscrowsProvider({ children }: { children: ReactNode }) {
  const [starred, setStarred] = useState<string[]>(getInitialStarred);

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

  return (
    <StarredEscrowsContext.Provider value={{ starred, isStarred, toggleStar, addStar, removeStar }}>
      {children}
    </StarredEscrowsContext.Provider>
  );
}

export function useStarredEscrows() {
  const context = useContext(StarredEscrowsContext);
  if (context === undefined) {
    throw new Error('useStarredEscrows must be used within a StarredEscrowsProvider');
  }
  return context;
}
