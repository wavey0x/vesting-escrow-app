import { EscrowStatus } from '../lib/types';

interface StatusBadgeProps {
  status?: EscrowStatus;
  className?: string;
  isLoading?: boolean;
}

const statusConfig: Record<EscrowStatus, { label: string; className: string }> = {
  cliff: {
    label: 'Pre Cliff',
    className: 'bg-amber-100 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:ring-amber-800',
  },
  vesting: {
    label: 'In Progress',
    className: 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:ring-emerald-800',
  },
  claimable: {
    label: 'Claimable',
    className: 'bg-blue-100 text-blue-700 ring-1 ring-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:ring-blue-800',
  },
  completed: {
    label: 'Completed',
    className: 'bg-divider-subtle text-secondary ring-1 ring-divider-strong',
  },
  revoked: {
    label: 'Revoked',
    className: 'bg-red-100 text-red-700 ring-1 ring-red-200 dark:bg-red-900/40 dark:text-red-300 dark:ring-red-800',
  },
  disowned: {
    label: 'Disowned',
    className: 'bg-divider-subtle text-secondary ring-1 ring-divider-strong',
  },
};

export default function StatusBadge({ status, className = '', isLoading = false }: StatusBadgeProps) {
  // Show skeleton when loading
  if (isLoading || !status) {
    return (
      <span
        className={`inline-flex items-center justify-center min-w-[70px] px-2 py-0.5 text-xs font-medium rounded skeleton ${className}`}
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
