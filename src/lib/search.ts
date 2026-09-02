import { Address, isAddress } from 'viem';
import { normalize } from 'viem/ens';
import { IndexedEscrow } from './types';

export type ParsedSearchQuery =
  | { kind: 'empty' }
  | { kind: 'address'; address: Address }
  | { kind: 'ens'; name: string }
  | { kind: 'invalid' };

export function parseSearchQuery(query: string): ParsedSearchQuery {
  const trimmed = query.trim();

  if (!trimmed) return { kind: 'empty' };
  if (isAddress(trimmed)) {
    return { kind: 'address', address: trimmed as Address };
  }

  // A malformed hexadecimal address should not be treated as an ENS name.
  if (/^0x/i.test(trimmed)) return { kind: 'invalid' };

  try {
    const name = normalize(trimmed);
    return name ? { kind: 'ens', name } : { kind: 'invalid' };
  } catch {
    return { kind: 'invalid' };
  }
}

export function findEscrowsBySearchAddress(
  escrows: IndexedEscrow[],
  address: Address,
  includeFunders: boolean,
): IndexedEscrow[] {
  const lowerAddress = address.toLowerCase();

  return escrows
    .filter((escrow) => (
      escrow.recipient.toLowerCase() === lowerAddress
      || (includeFunders && escrow.funder.toLowerCase() === lowerAddress)
    ))
    .sort((a, b) => b.blockNumber - a.blockNumber);
}

export function findEscrowByAddress(
  escrows: IndexedEscrow[],
  address: Address,
): IndexedEscrow | undefined {
  const lowerAddress = address.toLowerCase();
  return escrows.find((escrow) => escrow.address.toLowerCase() === lowerAddress);
}
