import { useState } from 'react';
import { EscrowStatus } from '../lib/types';
import { statusConfig } from './StatusBadge';

export const ALL_STATUSES: EscrowStatus[] = ['cliff', 'vesting', 'claimable', 'completed', 'revoked'];

interface StatusFilterProps {
  selectedStatuses: Set<EscrowStatus>;
  onToggle: (status: EscrowStatus) => void;
}

export default function StatusFilter({ selectedStatuses, onToggle }: StatusFilterProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className="flex items-center gap-1 text-sm text-secondary hover:text-primary cursor-pointer transition-colors"
      >
        <svg
          className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-90' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <span>Filter by status</span>
        {selectedStatuses.size < ALL_STATUSES.length && (
          <span className="text-xs text-tertiary">({selectedStatuses.size})</span>
        )}
      </button>
      {isOpen && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {ALL_STATUSES.map((status) => {
            const config = statusConfig[status];
            const isActive = selectedStatuses.has(status);

            return (
              <button
                key={status}
                onClick={() => onToggle(status)}
                className={`px-2 py-0.5 text-xs font-medium rounded cursor-pointer transition-opacity ${
                  isActive
                    ? config.className
                    : 'bg-divider-subtle text-tertiary opacity-50 hover:opacity-75'
                }`}
              >
                {config.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
