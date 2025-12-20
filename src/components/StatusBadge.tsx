import { EscrowStatus } from '../lib/types';

interface StatusBadgeProps {
  status: EscrowStatus;
  className?: string;
}

const statusConfig: Record<EscrowStatus, { label: string; className: string }> = {
  cliff: {
    label: 'Cliff',
    className: 'bg-divider-subtle text-secondary',
  },
  vesting: {
    label: 'Vesting',
    className: 'bg-primary text-background',
  },
  claimable: {
    label: 'Claimable',
    className: 'bg-primary text-background',
  },
  completed: {
    label: 'Completed',
    className: 'bg-divider-subtle text-secondary',
  },
  revoked: {
    label: 'Revoked',
    className: 'bg-divider-subtle text-secondary',
  },
  disowned: {
    label: 'Disowned',
    className: 'bg-divider-subtle text-secondary',
  },
};

export default function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded ${config.className} ${className}`}
    >
      {config.label}
    </span>
  );
}
