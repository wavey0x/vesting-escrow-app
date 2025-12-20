import { useStarredEscrows } from '../contexts/StarredEscrowsContext';

interface StarButtonProps {
  address: string;
  size?: number;
  className?: string;
}

export default function StarButton({ address, size = 18, className = '' }: StarButtonProps) {
  const { isStarred, toggleStar } = useStarredEscrows();
  const starred = isStarred(address);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleStar(address);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`p-1 flex-shrink-0 transition-colors ${starred ? 'text-yellow-500' : 'text-tertiary hover:text-yellow-500'} ${className}`}
      aria-label={starred ? 'Remove from starred' : 'Add to starred'}
      title={starred ? 'Remove from starred' : 'Add to starred'}
    >
      {starred ? (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="1"
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ) : (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      )}
    </button>
  );
}
