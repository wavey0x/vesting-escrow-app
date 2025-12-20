/**
 * Formatting utilities per REQUIREMENTS.md
 * Uses Intl.NumberFormat for locale-aware formatting
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

// Format percentage
export function formatPercent(value: number): string {
  return new Intl.NumberFormat(undefined, {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value / 100);
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

// Format date with time
export function formatDateTime(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

// Format relative time (e.g., "in 3 days", "2 hours ago")
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now() / 1000;
  const diff = timestamp - now;
  const absDiff = Math.abs(diff);

  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

  if (absDiff < 60) {
    return rtf.format(Math.round(diff), 'second');
  } else if (absDiff < 3600) {
    return rtf.format(Math.round(diff / 60), 'minute');
  } else if (absDiff < 86400) {
    return rtf.format(Math.round(diff / 3600), 'hour');
  } else if (absDiff < 604800) {
    return rtf.format(Math.round(diff / 86400), 'day');
  } else if (absDiff < 2592000) {
    return rtf.format(Math.round(diff / 604800), 'week');
  } else if (absDiff < 31536000) {
    return rtf.format(Math.round(diff / 2592000), 'month');
  } else {
    return rtf.format(Math.round(diff / 31536000), 'year');
  }
}

// Format duration (e.g., "45 days, 12 hours")
export function formatDuration(seconds: number): string {
  if (seconds < 0) return '0 seconds';

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  const parts: string[] = [];

  if (days > 0) {
    parts.push(`${days} ${days === 1 ? 'day' : 'days'}`);
  }
  if (hours > 0 && days < 30) {
    parts.push(`${hours} ${hours === 1 ? 'hour' : 'hours'}`);
  }
  if (minutes > 0 && days === 0) {
    parts.push(`${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`);
  }

  if (parts.length === 0) {
    return 'less than a minute';
  }

  return parts.slice(0, 2).join(', ');
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

// Get time ago string (e.g., "Updated 2m ago")
export function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}
