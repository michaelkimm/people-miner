import { useState } from 'react';
import type { RejectionReason } from '../types/rejection';
import { REJECTION_REASON_LABELS } from '../types/rejection';

interface RejectDialogProps {
  isOpen: boolean;
  candidateName: string;
  onConfirm: (reason: RejectionReason, notes?: string) => void;
  onCancel: () => void;
}

const REASONS: RejectionReason[] = [
  'LOW_ACTIVITY',
  'WRONG_TECH_STACK',
  'JUNIOR_LEVEL',
  'LOW_SCORE',
  'WRONG_LOCATION',
  'NO_RECENT_ACTIVITY',
  'OTHER',
];

export function RejectDialog({
  isOpen,
  candidateName,
  onConfirm,
  onCancel,
}: RejectDialogProps) {
  const [selectedReason, setSelectedReason] = useState<RejectionReason | null>(
    null,
  );
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (!selectedReason) return;
    setIsSubmitting(true);
    try {
      await onConfirm(selectedReason, notes.trim() || undefined);
      setSelectedReason(null);
      setNotes('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setSelectedReason(null);
    setNotes('');
    onCancel();
  };

  return (
    <div className="fixed inset-0 z-[60] overflow-hidden">
      <div
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
        onClick={handleCancel}
      />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          className="relative w-full max-w-md bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-red-400"
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
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-100">
                  후보자 거부
                </h3>
                <p className="text-sm text-slate-400">{candidateName}</p>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-300 mb-3">
                거부 이유 선택 <span className="text-red-400">*</span>
              </label>
              <div className="space-y-2">
                {REASONS.map((reason) => (
                  <label
                    key={reason}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      selectedReason === reason
                        ? 'bg-red-500/10 border-red-500/50 text-red-300'
                        : 'bg-slate-800/30 border-slate-700/30 text-slate-300 hover:bg-slate-800/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="rejection-reason"
                      value={reason}
                      checked={selectedReason === reason}
                      onChange={() => setSelectedReason(reason)}
                      className="sr-only"
                    />
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        selectedReason === reason
                          ? 'border-red-500 bg-red-500'
                          : 'border-slate-500'
                      }`}
                    >
                      {selectedReason === reason && (
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                      )}
                    </div>
                    <span className="text-sm">{REJECTION_REASON_LABELS[reason]}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                메모 (선택)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="추가 메모를 입력하세요..."
                rows={3}
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                disabled={isSubmitting}
                className="flex-1 px-4 py-3 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={handleConfirm}
                disabled={!selectedReason || isSubmitting}
                className="flex-1 px-4 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? '처리 중...' : '거부하기'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
