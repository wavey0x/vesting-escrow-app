interface ProgressBarProps {
  progress: number; // 0-100
  className?: string;
  showLabel?: boolean;
  cliffPercent?: number; // 0-100, position of cliff marker
}

export default function ProgressBar({
  progress,
  className = '',
  showLabel = false,
  cliffPercent,
}: ProgressBarProps) {
  const clampedProgress = Math.max(0, Math.min(100, progress));
  const hasCliff = cliffPercent !== undefined && cliffPercent > 0 && cliffPercent < 100;
  const isComplete = clampedProgress >= 100;

  return (
    <div className={`relative ${className}`}>
      <div className="relative h-2 bg-divider-subtle rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${clampedProgress}%`,
            background: isComplete
              ? '#888'
              : `repeating-linear-gradient(
                  -45deg,
                  #888,
                  #888 2px,
                  #bbb 2px,
                  #bbb 4px
                )`,
          }}
        />
        {hasCliff && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-amber-600 dark:bg-amber-400"
            style={{ left: `${cliffPercent}%` }}
          />
        )}
      </div>
      {showLabel && (
        <span className="absolute right-0 -top-5 text-xs text-secondary">
          {clampedProgress.toFixed(1)}%
        </span>
      )}
    </div>
  );
}
