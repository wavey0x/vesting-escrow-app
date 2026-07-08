import { useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent, ReactNode, RefObject } from 'react';
import { formatTokenAmount } from '../lib/format';

interface VestingTimelineProps {
  vestingStart: number;
  vestingDuration: number;
  cliffLength: number;
  claimedAmount: bigint;
  claimableAmount: bigint;
  lockedAmount: bigint;
  totalAmount: bigint;
  decimals: number;
  tokenSymbol?: string;
  isLoading?: boolean;
}

type TooltipPlacement = 'start' | 'center' | 'end';

interface SegmentTooltipState {
  label: string;
  amount: bigint;
  percent: number;
  x: number;
  containerWidth: number;
}

interface SegmentTooltipContent {
  label: string;
  amount: bigint;
  percent: number;
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function percentOf(amount: bigint, total: bigint): number {
  if (total <= 0n || amount <= 0n) return 0;

  const partsPerMillion = (amount * 1_000_000n) / total;
  return partsPerMillion === 0n ? 0.0001 : Number(partsPerMillion) / 10_000;
}

function displayPercent(value: number): string {
  const clamped = clampPercent(value);

  if (clamped > 0 && clamped < 0.1) {
    return '<0.1%';
  }

  return `${clamped.toFixed(1)}%`;
}

function formatTokenDisplay(amount: bigint, decimals: number, tokenSymbol?: string): string {
  const formattedAmount = formatTokenAmount(amount, decimals, 2);
  return tokenSymbol ? `${formattedAmount} ${tokenSymbol}` : formattedAmount;
}

function formatEdgeDate(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  const month = new Intl.DateTimeFormat(undefined, { month: 'short' }).format(date);
  const year = String(date.getFullYear()).slice(-2);

  return `${month} '${year}`;
}

function formatDateTimeSeconds(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(new Date(timestamp * 1000));
}

function tooltipPlacement(centerPercent: number): TooltipPlacement {
  if (centerPercent < 25) return 'start';
  if (centerPercent > 75) return 'end';
  return 'center';
}

export default function VestingTimeline({
  vestingStart,
  vestingDuration,
  cliffLength,
  claimedAmount,
  claimableAmount,
  lockedAmount,
  totalAmount,
  decimals,
  tokenSymbol,
  isLoading = false,
}: VestingTimelineProps) {
  const timelineRef = useRef<HTMLDivElement>(null);
  const floatingTooltipRef = useRef<HTMLDivElement>(null);
  const [segmentTooltip, setSegmentTooltip] = useState<SegmentTooltipState | null>(null);
  const [floatingTooltipWidth, setFloatingTooltipWidth] = useState(0);

  const vestingEnd = vestingStart + vestingDuration;
  const cliffEnd = vestingStart + cliffLength;
  const hasCliff = cliffLength > 0 && vestingDuration > 0;
  const cliffPercent = hasCliff
    ? clampPercent((cliffLength / vestingDuration) * 100)
    : 0;
  const vestedAmount = claimedAmount + claimableAmount;
  const claimedPercent = clampPercent(percentOf(claimedAmount, totalAmount));
  const vestedPercent = clampPercent(percentOf(vestedAmount, totalAmount));
  const claimedWidthPercent = Math.min(claimedPercent, vestedPercent);
  const claimablePercent = clampPercent(vestedPercent - claimedWidthPercent);
  const lockedPercent = clampPercent(100 - vestedPercent);
  const claimableDisplayPercent = percentOf(claimableAmount, totalAmount);
  const lockedDisplayPercent = percentOf(lockedAmount, totalAmount);

  useLayoutEffect(() => {
    if (!segmentTooltip || !floatingTooltipRef.current) {
      setFloatingTooltipWidth(0);
      return;
    }

    setFloatingTooltipWidth(floatingTooltipRef.current.offsetWidth);
  }, [segmentTooltip]);

  const showPointerSegmentTooltip = (
    event: PointerEvent<HTMLDivElement>,
    content: SegmentTooltipContent
  ) => {
    if (!timelineRef.current) return;

    const rect = timelineRef.current.getBoundingClientRect();
    setSegmentTooltip({
      ...content,
      x: clampNumber(event.clientX - rect.left, 0, rect.width),
      containerWidth: rect.width,
    });
  };

  const showFocusedSegmentTooltip = (
    element: HTMLDivElement,
    content: SegmentTooltipContent
  ) => {
    if (!timelineRef.current) return;

    const timelineRect = timelineRef.current.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    setSegmentTooltip({
      ...content,
      x: clampNumber(
        elementRect.left + elementRect.width / 2 - timelineRect.left,
        0,
        timelineRect.width
      ),
      containerWidth: timelineRect.width,
    });
  };

  const hideSegmentTooltip = () => {
    setSegmentTooltip(null);
  };

  if (isLoading) {
    return (
      <div ref={timelineRef} aria-busy="true" className="relative pt-4 pb-7">
        <div className="skeleton h-5 overflow-hidden rounded-full" />
        <EdgeDate
          label="Start Date"
          timestamp={vestingStart}
          className="left-0"
          tooltipPlacement="start"
        />
        <EdgeDate
          label="End Date"
          timestamp={vestingEnd}
          className="right-0"
          tooltipPlacement="end"
        />
      </div>
    );
  }

  return (
    <div ref={timelineRef} className="relative pt-4 pb-7">
      <div className="flex h-5 overflow-hidden rounded-full bg-divider-strong">
        {claimedAmount > 0n && (
          <div
            className="h-full flex-none bg-primary transition-[width] duration-300"
            style={{ width: `${claimedWidthPercent}%` }}
          />
        )}
        {claimableAmount > 0n && (
          <div
            className="h-full flex-none bg-claimable transition-[width] duration-300"
            style={{
              width: `${claimablePercent}%`,
              minWidth: claimablePercent < 0.5 ? '3px' : undefined,
            }}
          />
        )}
        {lockedPercent > 0 && (
          <div className="h-full min-w-0 flex-1 bg-divider-strong" />
        )}
      </div>

      <div className="absolute inset-x-0 top-4 h-5">
        {claimedAmount > 0n && (
          <AmountHitZone
            label="Claimed"
            amount={claimedAmount}
            percent={claimedPercent}
            decimals={decimals}
            tokenSymbol={tokenSymbol}
            style={{ left: 0, width: `${claimedWidthPercent}%` }}
            onPointerMove={showPointerSegmentTooltip}
            onPointerLeave={hideSegmentTooltip}
            onFocus={showFocusedSegmentTooltip}
            onBlur={hideSegmentTooltip}
          />
        )}
        {claimableAmount > 0n && (
          <AmountHitZone
            label="Claimable"
            amount={claimableAmount}
            percent={claimableDisplayPercent}
            decimals={decimals}
            tokenSymbol={tokenSymbol}
            style={{
              right: `${100 - vestedPercent}%`,
              width: `${claimablePercent}%`,
              minWidth: claimablePercent < 0.5 ? '3px' : undefined,
            }}
            onPointerMove={showPointerSegmentTooltip}
            onPointerLeave={hideSegmentTooltip}
            onFocus={showFocusedSegmentTooltip}
            onBlur={hideSegmentTooltip}
          />
        )}
        {lockedAmount > 0n && lockedPercent > 0 && (
          <AmountHitZone
            label="Locked"
            amount={lockedAmount}
            percent={lockedDisplayPercent}
            decimals={decimals}
            tokenSymbol={tokenSymbol}
            style={{ left: `${vestedPercent}%`, right: 0 }}
            onPointerMove={showPointerSegmentTooltip}
            onPointerLeave={hideSegmentTooltip}
            onFocus={showFocusedSegmentTooltip}
            onBlur={hideSegmentTooltip}
          />
        )}
      </div>

      {segmentTooltip && (
        <FloatingSegmentTooltip
          refElement={floatingTooltipRef}
          tooltip={segmentTooltip}
          tooltipWidth={floatingTooltipWidth}
          decimals={decimals}
          tokenSymbol={tokenSymbol}
        />
      )}

      {hasCliff && cliffPercent > 0 && cliffPercent < 100 && (
        <div
          aria-label={`Cliff: ${formatDateTimeSeconds(cliffEnd)}`}
          className="group absolute top-10 h-3 w-6 -translate-x-1/2 outline-none"
          role="img"
          tabIndex={0}
          style={{ left: `${cliffPercent}%` }}
        >
          <span className="absolute left-1/2 top-0 h-0 w-0 -translate-x-1/2 border-x-[4px] border-b-[5px] border-x-transparent border-b-tertiary" />
          <Tooltip placement={tooltipPlacement(cliffPercent)}>
            <span className="whitespace-nowrap font-mono text-[11px] text-background">
              Cliff
              {' · '}
              {formatDateTimeSeconds(cliffEnd)}
            </span>
          </Tooltip>
        </div>
      )}

      <EdgeDate
        label="Start Date"
        timestamp={vestingStart}
        className="left-0"
        tooltipPlacement="start"
      />
      <EdgeDate
        label="End Date"
        timestamp={vestingEnd}
        className="right-0"
        tooltipPlacement="end"
      />
    </div>
  );
}

function AmountHitZone({
  label,
  amount,
  percent,
  decimals,
  tokenSymbol,
  style,
  onPointerMove,
  onPointerLeave,
  onFocus,
  onBlur,
}: {
  label: string;
  amount: bigint;
  percent: number;
  decimals: number;
  tokenSymbol?: string;
  style: CSSProperties;
  onPointerMove: (
    event: PointerEvent<HTMLDivElement>,
    content: SegmentTooltipContent
  ) => void;
  onPointerLeave: () => void;
  onFocus: (element: HTMLDivElement, content: SegmentTooltipContent) => void;
  onBlur: () => void;
}) {
  const content = { label, amount, percent };

  return (
    <div
      aria-label={`${label}: ${formatTokenDisplay(amount, decimals, tokenSymbol)}, ${displayPercent(percent)}`}
      className="group absolute inset-y-0 outline-none"
      role="img"
      tabIndex={0}
      style={style}
      onPointerEnter={(event) => onPointerMove(event, content)}
      onPointerMove={(event) => onPointerMove(event, content)}
      onPointerLeave={onPointerLeave}
      onFocus={(event) => onFocus(event.currentTarget, content)}
      onBlur={onBlur}
    />
  );
}

function FloatingSegmentTooltip({
  refElement,
  tooltip,
  tooltipWidth,
  decimals,
  tokenSymbol,
}: {
  refElement: RefObject<HTMLDivElement>;
  tooltip: SegmentTooltipState;
  tooltipWidth: number;
  decimals: number;
  tokenSymbol?: string;
}) {
  const edgePadding = 6;
  const arrowPadding = 8;
  const measuredWidth = tooltipWidth || 0;
  const halfWidth = measuredWidth / 2;
  const arrowMax = Math.max(arrowPadding, measuredWidth - arrowPadding);
  const minLeft = measuredWidth > 0
    ? Math.min(tooltip.containerWidth / 2, halfWidth + edgePadding)
    : tooltip.x;
  const maxLeft = measuredWidth > 0
    ? Math.max(minLeft, tooltip.containerWidth - halfWidth - edgePadding)
    : tooltip.x;
  const left = measuredWidth > 0
    ? clampNumber(tooltip.x, minLeft, maxLeft)
    : tooltip.x;
  const arrowLeft = measuredWidth > 0
    ? clampNumber(tooltip.x - (left - halfWidth), arrowPadding, arrowMax)
    : 0;

  return (
    <div
      ref={refElement}
      className="pointer-events-none absolute top-2 z-30 -translate-x-1/2 -translate-y-full rounded border border-divider-strong bg-primary px-2 py-1.5 text-xs leading-tight text-background"
      style={{
        left: `${left}px`,
        maxWidth: `${tooltip.containerWidth}px`,
      }}
    >
      <span className="block truncate whitespace-nowrap font-mono text-[11px] text-background">
        {tooltip.label}
        {' · '}
        {formatTokenDisplay(tooltip.amount, decimals, tokenSymbol)}
        {' · '}
        {displayPercent(tooltip.percent)}
      </span>
      {measuredWidth > 0 && (
        <span
          className="absolute top-full h-0 w-0 -translate-x-1/2 border-x-[5px] border-t-[5px] border-x-transparent border-t-primary"
          style={{ left: `${arrowLeft}px` }}
        />
      )}
    </div>
  );
}

function EdgeDate({
  label,
  timestamp,
  className,
  tooltipPlacement,
}: {
  label: 'Start Date' | 'End Date';
  timestamp: number;
  className: string;
  tooltipPlacement: TooltipPlacement;
}) {
  return (
    <div
      aria-label={`${label}: ${formatDateTimeSeconds(timestamp)}`}
      className={`group absolute bottom-0 text-xs text-tertiary outline-none ${className}`}
      role="img"
      tabIndex={0}
    >
      <span className="font-mono">{formatEdgeDate(timestamp)}</span>
      <Tooltip placement={tooltipPlacement}>
        <span className="whitespace-nowrap font-mono text-[11px] text-background">
          {formatDateTimeSeconds(timestamp)}
        </span>
      </Tooltip>
    </div>
  );
}

function Tooltip({
  children,
  placement,
}: {
  children: ReactNode;
  placement: TooltipPlacement;
}) {
  const placementClassName = placement === 'start'
    ? 'left-0'
    : placement === 'end'
      ? 'right-0'
      : 'left-1/2 -translate-x-1/2';
  const arrowClassName = placement === 'start'
    ? 'left-3'
    : placement === 'end'
      ? 'right-3'
      : 'left-1/2 -translate-x-1/2';

  return (
    <div
      className={`pointer-events-none absolute bottom-full z-20 mb-2 hidden min-w-max items-start gap-2 rounded border border-divider-strong bg-primary px-2 py-1.5 text-xs leading-tight text-background group-hover:flex group-focus:flex ${placementClassName}`}
    >
      {children}
      <span
        className={`absolute top-full h-0 w-0 border-x-[5px] border-t-[5px] border-x-transparent border-t-primary ${arrowClassName}`}
      />
    </div>
  );
}
