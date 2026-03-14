import { EscrowStatus } from '../lib/types';
import { statusConfig } from './StatusBadge';

export const ALL_STATUSES: EscrowStatus[] = ['cliff', 'vesting', 'claimable', 'completed', 'revoked'];

interface StatusFilterProps {
  selectedStatuses: Set<EscrowStatus>;
  onToggle: (status: EscrowStatus) => void;
}

export default function StatusFilter({ selectedStatuses, onToggle }: StatusFilterProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
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
  );
}
