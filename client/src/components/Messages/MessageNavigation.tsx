import React from 'react';

type Props = {
  onPrevious: React.MouseEventHandler<HTMLButtonElement>;
  onNext: React.MouseEventHandler<HTMLButtonElement>;
  canGoPrevious: boolean;
  canGoNext: boolean;
};

export default function MessageNavigation({ onPrevious, onNext, canGoPrevious, canGoNext }: Props) {
  return (
    <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 gap-1">
      {/* Previous Message Button - always takes up space */}
      <button
        onClick={onPrevious}
        disabled={!canGoPrevious}
        className="flex h-7 w-7 items-center justify-center rounded-full border border-border-light bg-surface-secondary opacity-75 hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition-opacity duration-100"
        aria-label="Go to previous message"
        style={{ visibility: canGoPrevious ? 'visible' : 'hidden' }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-text-secondary">
          <path
            d="M7 11L12 6L17 11M12 18L12 7"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Next Message Button - always takes up space */}
      <button
        onClick={onNext}
        disabled={!canGoNext}
        className="flex h-7 w-7 items-center justify-center rounded-full border border-border-light bg-surface-secondary opacity-75 hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition-opacity duration-100"
        aria-label="Go to next message"
        style={{ visibility: canGoNext ? 'visible' : 'hidden' }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-text-secondary">
          <path
            d="M17 13L12 18L7 13M12 6L12 17"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}