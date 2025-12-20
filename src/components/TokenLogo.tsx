import { useState } from 'react';
import { getTokenLogoUrl } from '../lib/constants';

interface TokenLogoProps {
  address: string;
  symbol?: string;
  size?: 32 | 128;
  className?: string;
}

export default function TokenLogo({
  address,
  symbol,
  size = 32,
  className = '',
}: TokenLogoProps) {
  const [error, setError] = useState(false);

  if (error) {
    // Fallback to first letter of symbol or generic icon
    return (
      <div
        className={`flex items-center justify-center bg-divider-subtle text-secondary rounded-full ${className}`}
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
      src={getTokenLogoUrl(address, size)}
      alt={symbol || 'Token'}
      width={size}
      height={size}
      className={`rounded-full ${className}`}
      onError={() => setError(true)}
    />
  );
}
