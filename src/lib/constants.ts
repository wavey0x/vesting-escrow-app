// Chain configuration
export const CHAIN_ID = 1;

// Contract addresses
export const FACTORY_ADDRESS = '0x200C92Dd85730872Ab6A1e7d5E40A067066257cF' as const;

// Data endpoints
export const ESCROWS_DATA_URL = '/data/escrows.json';
export const TOKENS_DATA_URL = '/data/tokens.json';

// Token logo CDN
export const TOKEN_LOGO_CDN = 'https://assets.smold.app/api/token';

export function getTokenLogoUrl(tokenAddress: string, size: 32 | 128 = 32): string {
  return `${TOKEN_LOGO_CDN}/${CHAIN_ID}/${tokenAddress.toLowerCase()}/logo-${size}.png`;
}

// DeFiLlama price API
export const DEFILLAMA_PRICE_API = 'https://coins.llama.fi/prices/current';

export function getPriceApiUrl(tokenAddresses: string[]): string {
  const coins = tokenAddresses.map(addr => `ethereum:${addr.toLowerCase()}`).join(',');
  return `${DEFILLAMA_PRICE_API}/${coins}`;
}

// Price cache duration (1 hour)
export const PRICE_CACHE_DURATION = 3600 * 1000;

// Recently viewed limit
export const RECENTLY_VIEWED_LIMIT = 20;

// Etherscan
export const ETHERSCAN_URL = 'https://etherscan.io';

export function getEtherscanTxUrl(txHash: string): string {
  return `${ETHERSCAN_URL}/tx/${txHash}`;
}

export function getEtherscanAddressUrl(address: string): string {
  return `${ETHERSCAN_URL}/address/${address}`;
}

// Duration presets (in seconds)
export const DURATION_PRESETS = [
  { label: '6 months', value: 6 * 30 * 24 * 60 * 60 },
  { label: '1 year', value: 365 * 24 * 60 * 60 },
  { label: '2 years', value: 2 * 365 * 24 * 60 * 60 },
  { label: '4 years', value: 4 * 365 * 24 * 60 * 60 },
];

// Duration units (in seconds)
export const DURATION_UNITS = [
  { label: 'days', value: 24 * 60 * 60 },
  { label: 'months', value: 30 * 24 * 60 * 60 },
  { label: 'years', value: 365 * 24 * 60 * 60 },
];

// Zero address
export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
