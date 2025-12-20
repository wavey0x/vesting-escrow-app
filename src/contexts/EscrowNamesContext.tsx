import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

const STORAGE_KEY = 'vesting-escrow-names';

interface EscrowNamesContextType {
  getName: (address: string) => string | undefined;
  setName: (address: string, name: string) => void;
  removeName: (address: string) => void;
}

const EscrowNamesContext = createContext<EscrowNamesContextType | undefined>(undefined);

function getInitialNames(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

export function EscrowNamesProvider({ children }: { children: ReactNode }) {
  const [names, setNames] = useState<Record<string, string>>(getInitialNames);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(names));
  }, [names]);

  const getName = useCallback((address: string) => {
    return names[address.toLowerCase()];
  }, [names]);

  const setName = useCallback((address: string, name: string) => {
    const trimmed = name.trim();
    if (trimmed) {
      setNames(prev => ({
        ...prev,
        [address.toLowerCase()]: trimmed,
      }));
    } else {
      // Remove if empty
      setNames(prev => {
        const next = { ...prev };
        delete next[address.toLowerCase()];
        return next;
      });
    }
  }, []);

  const removeName = useCallback((address: string) => {
    setNames(prev => {
      const next = { ...prev };
      delete next[address.toLowerCase()];
      return next;
    });
  }, []);

  return (
    <EscrowNamesContext.Provider value={{ getName, setName, removeName }}>
      {children}
    </EscrowNamesContext.Provider>
  );
}

export function useEscrowNames() {
  const context = useContext(EscrowNamesContext);
  if (context === undefined) {
    throw new Error('useEscrowNames must be used within an EscrowNamesProvider');
  }
  return context;
}
