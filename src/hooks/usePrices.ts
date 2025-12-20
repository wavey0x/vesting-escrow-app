import { useQuery } from '@tanstack/react-query';
import { getPriceApiUrl, PRICE_CACHE_DURATION } from '../lib/constants';
import { TokenPrice } from '../lib/types';

interface DefiLlamaPriceResponse {
  coins: Record<
    string,
    {
      price: number;
      confidence: number;
      timestamp: number;
    }
  >;
}

async function fetchPrices(
  tokenAddresses: string[]
): Promise<Record<string, TokenPrice>> {
  if (tokenAddresses.length === 0) return {};

  const url = getPriceApiUrl(tokenAddresses);
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Failed to fetch prices');
  }

  const data: DefiLlamaPriceResponse = await response.json();

  const prices: Record<string, TokenPrice> = {};
  for (const [key, value] of Object.entries(data.coins)) {
    // Key format is "ethereum:0x..."
    const address = key.split(':')[1]?.toLowerCase();
    if (address) {
      prices[address] = {
        price: value.price,
        confidence: value.confidence,
        timestamp: value.timestamp,
      };
    }
  }

  return prices;
}

export function usePrices(tokenAddresses: string[]) {
  const uniqueAddresses = [...new Set(tokenAddresses.map((a) => a.toLowerCase()))];

  return useQuery({
    queryKey: ['prices', uniqueAddresses.sort().join(',')],
    queryFn: () => fetchPrices(uniqueAddresses),
    staleTime: PRICE_CACHE_DURATION,
    enabled: uniqueAddresses.length > 0,
  });
}

export function useTokenPrice(tokenAddress?: string): number | undefined {
  const { data } = usePrices(tokenAddress ? [tokenAddress] : []);

  if (!tokenAddress || !data) return undefined;

  return data[tokenAddress.toLowerCase()]?.price;
}
