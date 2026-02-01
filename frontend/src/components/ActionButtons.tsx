import type { CandidateStatus } from '../types/rejection';

interface ActionButtonsProps {
  candidateId: string;
  status: CandidateStatus;
  onReject: () => void;
  onShortlist: (candidateId: string) => void;
  onUndo: (candidateId: string) => void;
  isLoading?: boolean;
}

export function ActionButtons({
  candidateId,
  status,
  onReject,
  onShortlist,
  onUndo,
  isLoading,
}: ActionButtonsProps) {
  if (status === 'REJECTED') {
    return (
      <div className="flex items-center gap-1">
        <span className="px-2 py-1 text-xs rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 whitespace-nowrap">
          거부됨
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onUndo(candidateId);
          }}
          disabled={isLoading}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors disabled:opacity-50"
          title="되돌리기"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
            />
          </svg>
        </button>
      </div>
    );
  }

  if (status === 'SHORTLISTED') {
    return (
      <div className="flex items-center gap-1">
        <span className="px-2 py-1 text-xs rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 whitespace-nowrap">
          관심
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onUndo(candidateId);
          }}
          disabled={isLoading}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors disabled:opacity-50"
          title="되돌리기"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
            />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={(e) => {
          e.stopPropagation();
          onShortlist(candidateId);
        }}
        disabled={isLoading}
        className="p-2 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors disabled:opacity-50"
        title="관심 후보"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
          />
        </svg>
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onReject();
        }}
        disabled={isLoading}
        className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
        title="거부"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  );
}
