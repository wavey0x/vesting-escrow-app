/**
 * Formatting utilities for human-readable token, date, and duration display.
 * Uses Intl.NumberFormat for locale-aware formatting.
 */

// Format token amount with proper decimals
export function formatTokenAmount(
  value: bigint | string,
  decimals: number = 18,
  maxDecimals: number = 6
): string {
  const val = typeof value === 'string' ? BigInt(value) : value;
  const divisor = BigInt(10 ** decimals);
  const intPart = val / divisor;
  const fracPart = val % divisor;

  // Convert to number for formatting (safe for display purposes)
  const num = Number(intPart) + Number(fracPart) / Number(divisor);

  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  }).format(num);
}

// Format USD value
export function formatUSD(value: number): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

// Format address (0x1234...abcd)
export function formatAddress(address: string, headChars: number = 4, tailChars: number = 4): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, headChars + 2)}...${address.slice(-tailChars)}`;
}

// Format date (human readable)
export function formatDate(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

// Format duration in human readable (e.g., "1 year", "6 months")
export function formatDurationHuman(seconds: number): string {
  const years = seconds / (365 * 24 * 60 * 60);
  const months = seconds / (30 * 24 * 60 * 60);
  const days = seconds / (24 * 60 * 60);

  if (years >= 1 && years === Math.floor(years)) {
    return `${years} ${years === 1 ? 'year' : 'years'}`;
  }
  if (months >= 1 && months === Math.floor(months)) {
    return `${months} ${months === 1 ? 'month' : 'months'}`;
  }
  if (days >= 1) {
    return `${Math.floor(days)} ${days === 1 ? 'day' : 'days'}`;
  }
  return `${Math.floor(seconds / 3600)} hours`;
}
