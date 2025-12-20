interface VestingTimelineProps {
  vestingStart: number;
  vestingDuration: number;
  cliffLength: number;
  claimedPercent: number;
  claimablePercent: number;
  lockedPercent: number;
}

export default function VestingTimeline({
  vestingStart,
  vestingDuration,
  cliffLength,
  claimedPercent,
  claimablePercent,
}: VestingTimelineProps) {
  const now = Math.floor(Date.now() / 1000);
  const vestingEnd = vestingStart + vestingDuration;
  const cliffEnd = vestingStart + cliffLength;
  const hasCliff = cliffLength > 0;

  // Calculate positions as percentages
  const cliffPosition = hasCliff ? (cliffLength / vestingDuration) * 100 : 0;
  const nowPosition = Math.max(0, Math.min(100, ((now - vestingStart) / vestingDuration) * 100));

  // Grey segment: shows claimed OR time progress if still in cliff
  const inCliffPeriod = hasCliff && now < cliffEnd;
  const greyPercent = inCliffPeriod ? nowPosition : claimedPercent;

  // Format dates
  const formatDateShort = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    const month = date.toLocaleString('en-US', { month: 'short' });
    const year = date.getFullYear();
    return `${month} ${year}`;
  };

  const formatDateFull = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-1">
      {/* Segmented progress bar */}
      <div className="relative h-4 border border-divider-strong bg-white">
        {/* Progress segment - grey fill (claimed or time progress during cliff) */}
        {greyPercent > 0 && (
          <div
            className="absolute inset-y-0 left-0 bg-secondary"
            style={{ width: `${greyPercent}%` }}
          />
        )}

        {/* Claimable segment - light green */}
        {claimablePercent > 0 && (
          <div
            className="absolute inset-y-0"
            style={{
              left: `${greyPercent}%`,
              width: `${claimablePercent}%`,
              backgroundColor: '#d1fae5'
            }}
          />
        )}

        {/* Cliff marker */}
        {hasCliff && cliffPosition > 0 && cliffPosition < 100 && (
          <div
            className="absolute top-0 bottom-0 w-px"
            style={{ left: `${cliffPosition}%`, backgroundColor: '#1e3a5f' }}
          />
        )}

        {/* Current time marker - at end of colored segments */}
        {(() => {
          const coloredEnd = greyPercent + claimablePercent;
          return coloredEnd > 0 && coloredEnd < 100 && (
            <div
              className="absolute top-0 bottom-0 w-px border-l border-divider-strong"
              style={{ left: `${coloredEnd}%` }}
            />
          );
        })()}

      </div>

      {/* Date markers below the bar */}
      <div className="relative h-8 text-[10px] text-tertiary">
        {/* Start */}
        <div className="absolute left-0 flex flex-col group cursor-default">
          <span className="uppercase tracking-wide">Start</span>
          <span className="font-mono">{formatDateShort(vestingStart)}</span>
          <div className="absolute top-full left-0 mt-1 px-2 py-1 bg-primary text-white text-[11px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
            {formatDateFull(vestingStart)}
          </div>
        </div>

        {/* Cliff */}
        {hasCliff && cliffPosition > 12 && cliffPosition < 88 && (
          <div
            className="absolute flex flex-col items-center group cursor-default"
            style={{ left: `${cliffPosition}%`, transform: 'translateX(-50%)' }}
          >
            <span className="uppercase tracking-wide" style={{ color: '#1e3a5f' }}>Cliff</span>
            <span className="font-mono">{formatDateShort(cliffEnd)}</span>
            <div className="absolute top-full mt-1 px-2 py-1 bg-primary text-white text-[11px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              {formatDateFull(cliffEnd)}
            </div>
          </div>
        )}

        {/* End */}
        <div className="absolute right-0 flex flex-col items-end group cursor-default">
          <span className="uppercase tracking-wide">End</span>
          <span className="font-mono">{formatDateShort(vestingEnd)}</span>
          <div className="absolute top-full right-0 mt-1 px-2 py-1 bg-primary text-white text-[11px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
            {formatDateFull(vestingEnd)}
          </div>
        </div>
      </div>

    </div>
  );
}
