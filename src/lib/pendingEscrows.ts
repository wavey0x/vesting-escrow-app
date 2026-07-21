import type { EscrowsIndex, IndexedEscrow } from './types';

const STORAGE_KEY = 'vesting-escrow-pending';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1_000;

interface StoredPendingEscrow extends IndexedEscrow {
  savedAt: number;
}

function storageAvailable(): boolean {
  return typeof window !== 'undefined' && !!window.localStorage;
}

export function getPendingEscrows(now = Date.now()): IndexedEscrow[] {
  if (!storageAvailable()) return [];

  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]');
    if (!Array.isArray(parsed)) return [];

    return (parsed as StoredPendingEscrow[])
      .filter(
        (escrow) =>
          typeof escrow.address === 'string' &&
          typeof escrow.savedAt === 'number' &&
          now - escrow.savedAt <= MAX_AGE_MS,
      )
      .map(({ savedAt, ...escrow }) => {
        void savedAt;
        return escrow;
      });
  } catch {
    return [];
  }
}

export function savePendingEscrow(escrow: IndexedEscrow, now = Date.now()): void {
  if (!storageAvailable()) return;

  const pending = getPendingEscrows(now)
    .filter((item) => item.address.toLowerCase() !== escrow.address.toLowerCase())
    .map((item) => ({ ...item, savedAt: now }));

  pending.push({ ...escrow, pending: true, savedAt: now });
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pending));
}

export function mergePendingEscrows(index: EscrowsIndex): EscrowsIndex {
  const indexedAddresses = new Set(index.escrows.map((escrow) => escrow.address.toLowerCase()));
  const pending = getPendingEscrows().filter(
    (escrow) => !indexedAddresses.has(escrow.address.toLowerCase()),
  );

  return { ...index, escrows: [...pending, ...index.escrows] };
}
