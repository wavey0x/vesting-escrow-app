import { useQuery } from '@tanstack/react-query';
import { ESCROWS_DATA_URL } from '../lib/constants';
import { EscrowsIndex } from '../lib/types';
import { mergePendingEscrows } from '../lib/pendingEscrows';

async function fetchEscrows(): Promise<EscrowsIndex> {
  const response = await fetch(ESCROWS_DATA_URL);
  if (!response.ok) {
    throw new Error('Failed to fetch escrows');
  }
  return response.json();
}

export function useEscrows() {
  const query = useQuery({
    queryKey: ['escrows'],
    queryFn: fetchEscrows,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return {
    ...query,
    data: query.data ? mergePendingEscrows(query.data) : undefined,
  };
}

export function useEscrowsByAddress(address?: string) {
  const { data, ...rest } = useEscrows();

  const escrows = data?.escrows.filter((e) => {
    if (!address) return false;
    const lowerAddress = address.toLowerCase();
    return (
      e.recipient.toLowerCase() === lowerAddress ||
      e.funder.toLowerCase() === lowerAddress
    );
  });

  return { escrows, ...rest };
}

export function useEscrowByAddress(escrowAddress?: string) {
  const { data, ...rest } = useEscrows();

  const escrow = data?.escrows.find(
    (e) => e.address.toLowerCase() === escrowAddress?.toLowerCase()
  );

  return { escrow, ...rest };
}
