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
      <div className="relative h-4">
        {/* Bar container with background - no border to allow fills to reach edges */}
        <div className="absolute inset-0 bg-background rounded-full overflow-hidden ring-1 ring-inset ring-divider-strong">
          {/* Progress segment - grey fill (claimed or time progress during cliff) */}
          {greyPercent > 0 && (
            <div
              className={`absolute bg-secondary ${
                greyPercent >= 99.5 && claimablePercent === 0 ? 'inset-0' : 'inset-y-0 left-0'
              }`}
              style={
                greyPercent >= 99.5 && claimablePercent === 0
                  ? undefined
                  : { width: `${greyPercent}%` }
              }
            />
          )}

          {/* Claimable segment - hatched pattern */}
          {claimablePercent > 0 && (
            <div
              className={`absolute ${
                greyPercent + claimablePercent >= 99.5 && greyPercent === 0
                  ? 'inset-0'
                  : greyPercent + claimablePercent >= 99.5
                    ? 'inset-y-0 right-0'
                    : 'inset-y-0'
              }`}
              style={{
                ...(greyPercent + claimablePercent >= 99.5 && greyPercent === 0
                  ? {}
                  : greyPercent + claimablePercent >= 99.5
                    ? { left: `${greyPercent}%` }
                    : { left: `${greyPercent}%`, width: `${claimablePercent}%` }),
                background: `repeating-linear-gradient(
                  -45deg,
                  #888,
                  #888 2px,
                  #bbb 2px,
                  #bbb 4px
                )`,
              }}
            />
          )}

          {/* Current time marker - at end of colored segments (hidden at/near 100%) */}
          {(() => {
            const coloredEnd = greyPercent + claimablePercent;
            return coloredEnd > 0 && coloredEnd < 99 && (
              <div
                className="absolute top-0 bottom-0 w-px bg-primary"
                style={{ left: `${coloredEnd}%`, transform: 'translateX(-50%)' }}
              />
            );
          })()}
        </div>

        {/* Cliff marker with tooltip - outside overflow-hidden but inset to fit within bar border */}
        {hasCliff && cliffPosition > 0 && cliffPosition < 100 && (
          <div
            className="absolute top-[1px] bottom-[1px] w-3 -ml-1.5 group cursor-default flex justify-center z-10"
            style={{ left: `${cliffPosition}%` }}
          >
            <div className="w-px h-full bg-amber-600 dark:bg-amber-400" />
            <div className="absolute bottom-full mb-1 px-2 py-1 bg-primary text-background text-[11px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              Cliff: {formatDateFull(cliffEnd)}
            </div>
          </div>
        )}
      </div>

      {/* Date markers below the bar */}
      <div className="relative h-8 text-[10px] text-tertiary">
        {/* Start */}
        <div className="absolute left-0 flex flex-col group cursor-default">
          <span className="uppercase tracking-wide">Start</span>
          <span className="font-mono">{formatDateShort(vestingStart)}</span>
          <div className="absolute top-full left-0 mt-1 px-2 py-1 bg-primary text-background text-[11px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
            {formatDateFull(vestingStart)}
          </div>
        </div>

        {/* End */}
        <div className="absolute right-0 flex flex-col items-end group cursor-default">
          <span className="uppercase tracking-wide">End</span>
          <span className="font-mono">{formatDateShort(vestingEnd)}</span>
          <div className="absolute top-full right-0 mt-1 px-2 py-1 bg-primary text-background text-[11px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
            {formatDateFull(vestingEnd)}
          </div>
        </div>
      </div>

    </div>
  );
}
