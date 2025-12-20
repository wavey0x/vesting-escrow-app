import { EscrowStatus } from '../lib/types';

interface StatusBadgeProps {
  status?: EscrowStatus;
  className?: string;
  isLoading?: boolean;
}

const statusConfig: Record<EscrowStatus, { label: string; className: string }> = {
  cliff: {
    label: 'Cliff',
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  },
  vesting: {
    label: 'Vesting',
    className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  },
  claimable: {
    label: 'Claimable',
    className: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
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

export default function StatusBadge({ status, className = '', isLoading = false }: StatusBadgeProps) {
  // Show skeleton when loading
  if (isLoading || !status) {
    return (
      <span
        className={`inline-flex items-center justify-center min-w-[70px] px-2 py-0.5 text-xs font-medium rounded bg-divider-subtle animate-pulse ${className}`}
      >
        <span className="invisible">Vesting</span>
      </span>
    );
  }

  const config = statusConfig[status];

  return (
    <span
      className={`inline-flex items-center justify-center min-w-[70px] px-2 py-0.5 text-xs font-medium rounded ${config.className} ${className}`}
    >
      {config.label}
    </span>
  );
}
