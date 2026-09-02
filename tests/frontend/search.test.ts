import { describe, expect, it } from 'vitest';
import { Address } from 'viem';
import {
  findEscrowByAddress,
  findEscrowsBySearchAddress,
  parseSearchQuery,
} from '../../src/lib/search';
import { IndexedEscrow } from '../../src/lib/types';

const ESCROW_ADDRESS = '0x1111111111111111111111111111111111111111' as Address;
const RECIPIENT = '0x2222222222222222222222222222222222222222' as Address;
const FUNDER = '0x3333333333333333333333333333333333333333' as Address;

const escrow: IndexedEscrow = {
  address: ESCROW_ADDRESS,
  funder: FUNDER,
  token: '0x4444444444444444444444444444444444444444',
  recipient: RECIPIENT,
  amount: '1',
  vestingStart: 1,
  vestingDuration: 1,
  cliffLength: 0,
  openClaim: false,
  blockNumber: 10,
  txHash: '0x01',
};

describe('search query parsing', () => {
  it('preserves direct Ethereum addresses', () => {
    expect(parseSearchQuery(`  ${RECIPIENT}  `)).toEqual({
      kind: 'address',
      address: RECIPIENT,
    });
  });

  it('normalizes valid ENS names', () => {
    expect(parseSearchQuery('RaFFY🚴‍♂️.eTh')).toEqual({
      kind: 'ens',
      name: 'raffy🚴‍♂.eth',
    });
  });

  it('rejects malformed ENS names and hexadecimal addresses', () => {
    expect(parseSearchQuery('bad_name.eth')).toEqual({ kind: 'invalid' });
    expect(parseSearchQuery('0x1234')).toEqual({ kind: 'invalid' });
  });
});

describe('search address matching', () => {
  it('matches recipients and exact escrow addresses case-insensitively', () => {
    expect(findEscrowsBySearchAddress([escrow], RECIPIENT, false)).toEqual([escrow]);
    expect(findEscrowByAddress([escrow], ESCROW_ADDRESS.toUpperCase() as Address)).toBe(escrow);
  });

  it('only matches funders when requested', () => {
    expect(findEscrowsBySearchAddress([escrow], FUNDER, false)).toEqual([]);
    expect(findEscrowsBySearchAddress([escrow], FUNDER, true)).toEqual([escrow]);
  });
});
