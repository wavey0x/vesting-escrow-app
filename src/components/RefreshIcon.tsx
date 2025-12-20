interface RefreshIconProps {
  size?: number;
  className?: string;
  spinning?: boolean;
}

export default function RefreshIcon({ size = 16, className = '', spinning = false }: RefreshIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={`${className} ${spinning ? 'animate-rotate-once' : ''}`}
    >
      <path
        d="M21 12a9 9 0 1 1-9-9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M21 3v6h-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
