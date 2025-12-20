import { formatTokenAmount } from '../lib/format';

interface TokenAmountProps {
  value: bigint;
  decimals: number;
  className?: string;
}

export default function TokenAmount({ value, decimals, className = '' }: TokenAmountProps) {
  const displayAmount = formatTokenAmount(value, decimals, 2);
  const fullAmount = formatTokenAmount(value, decimals, decimals);

  // Only show tooltip if amounts differ
  const showTooltip = displayAmount !== fullAmount;

  return (
    <span
      className={className}
      title={showTooltip ? fullAmount : undefined}
    >
      {displayAmount}
    </span>
  );
}
