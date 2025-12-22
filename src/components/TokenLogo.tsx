import { useState, useMemo } from 'react';
import { getTokenLogoUrls } from '../lib/constants';

interface TokenLogoProps {
  address: string;
  symbol?: string;
  logoUrl?: string | null;
  size?: 32 | 128;
  className?: string;
}

export default function TokenLogo({
  address,
  symbol,
  logoUrl,
  size = 32,
  className = '',
}: TokenLogoProps) {
  const [sourceIndex, setSourceIndex] = useState(0);

  // Build URL list: cached URL first (if available), then fallbacks
  const urls = useMemo(() => {
    const fallbackUrls = getTokenLogoUrls(address, size);
    return logoUrl ? [logoUrl, ...fallbackUrls] : fallbackUrls;
  }, [address, size, logoUrl]);

  // All sources exhausted - show letter fallback
  if (sourceIndex >= urls.length) {
    return (
      <div
        className={`flex items-center justify-center bg-divider-subtle text-secondary rounded-full ring-1 ring-secondary/30 ${className}`}
        style={{ width: size, height: size }}
      >
        <span className="text-xs font-medium">
          {symbol?.charAt(0).toUpperCase() || '?'}
        </span>
      </div>
    );
  }

  return (
    <img
      src={urls[sourceIndex]}
      alt={symbol || 'Token'}
      width={size}
      height={size}
      className={`rounded-full ring-1 ring-secondary/30 ${className}`}
      onError={() => setSourceIndex((i) => i + 1)}
    />
  );
}
