import { useState } from 'react';
import { formatAddress } from '../lib/format';
import { getEtherscanAddressUrl } from '../lib/constants';

interface AddressProps {
  address: string;
  headChars?: number;
  tailChars?: number;
  showCopy?: boolean;
  showLink?: boolean;
  className?: string;
}

export default function Address({
  address,
  headChars = 4,
  tailChars = 4,
  showCopy = true,
  showLink = true,
  className = '',
}: AddressProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatted = formatAddress(address, headChars, tailChars);

  return (
    <span className={`inline-flex items-center gap-1.5 font-mono ${className}`}>
      {showLink ? (
        <a
          href={getEtherscanAddressUrl(address)}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-primary transition-colors"
        >
          {formatted}
        </a>
      ) : (
        <span>{formatted}</span>
      )}
      {showCopy && (
        <button
          onClick={handleCopy}
          className="text-tertiary hover:text-primary transition-colors"
          title={copied ? 'Copied!' : 'Copy address'}
        >
          {copied ? (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          )}
        </button>
      )}
    </span>
  );
}
