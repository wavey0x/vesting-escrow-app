import { useQuery } from '@tanstack/react-query';
import { TOKENS_DATA_URL } from '../lib/constants';
import { TokensIndex, TokenMetadata } from '../lib/types';

async function fetchTokens(): Promise<TokensIndex> {
  const response = await fetch(TOKENS_DATA_URL);
  if (!response.ok) {
    throw new Error('Failed to fetch tokens');
  }
  return response.json();
}

export function useTokens() {
  return useQuery({
    queryKey: ['tokens'],
    queryFn: fetchTokens,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

export function useTokenMetadata(tokenAddress?: string): TokenMetadata | undefined {
  const { data } = useTokens();

  if (!tokenAddress || !data) return undefined;

  return data.tokens[tokenAddress.toLowerCase()];
}
