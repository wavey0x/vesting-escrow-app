import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getPendingEscrows,
  mergePendingEscrows,
  savePendingEscrow,
} from './pendingEscrows';
import type { EscrowsIndex, IndexedEscrow } from './types';

class MemoryStorage {
  private data = new Map<string, string>();

  getItem(key: string) {
    return this.data.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.data.set(key, value);
  }
}

const pending: IndexedEscrow = {
  address: '0x0000000000000000000000000000000000000001',
  factory: '0x0000000000000000000000000000000000000002',
  version: 2,
  funder: '0x0000000000000000000000000000000000000003',
  token: '0x0000000000000000000000000000000000000004',
  recipient: '0x0000000000000000000000000000000000000005',
  amount: '1000',
  vestingStart: 100,
  vestingDuration: 200,
  cliffLength: 0,
  openClaim: true,
  blockNumber: 42,
  txHash: `0x${'1'.repeat(64)}`,
  pending: true,
};

describe('pending escrow cache', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { localStorage: new MemoryStorage() });
  });

  it('makes a confirmed escrow available before the public index updates', () => {
    savePendingEscrow(pending, 1_000);
    expect(getPendingEscrows(1_001)).toEqual([pending]);
  });

  it('prefers an indexed record over its pending copy', () => {
    savePendingEscrow(pending, Date.now());
    const indexed = { ...pending, pending: undefined };
    const index: EscrowsIndex = {
      lastIndexed: 'now',
      chainId: 1,
      factories: {},
      escrows: [indexed],
    };

    expect(mergePendingEscrows(index).escrows).toEqual([indexed]);
  });
});
