interface ProgressBarProps {
  progress: number; // 0-100
  className?: string;
  showLabel?: boolean;
}

export default function ProgressBar({
  progress,
  className = '',
  showLabel = false,
}: ProgressBarProps) {
  const clampedProgress = Math.max(0, Math.min(100, progress));

  return (
    <div className={`relative ${className}`}>
      <div className="h-2 bg-divider-subtle rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-300"
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
      {showLabel && (
        <span className="absolute right-0 -top-5 text-xs text-secondary">
          {clampedProgress.toFixed(0)}%
        </span>
      )}
    </div>
  );
}
