import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Clock, X, AlertCircle } from 'lucide-react';
import { formatFullDate } from '@/lib/utils';

interface BlockTimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string; // YYYY-MM-DD
  onSave: (startTime: string, endTime: string, reason: string) => void;
}

const REASON_OPTIONS = [
  'Lunch & Rest',
  'Temple Ritual / Seva',
  'Personal / Family Work',
  'Travel / Out of Station',
  'Medical / Health Rest',
  'Other',
];

export const BlockTimeModal: React.FC<BlockTimeModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
  onSave,
}) => {
  const [startTime, setStartTime] = useState('13:00');
  const [endTime, setEndTime] = useState('16:00');
  const [selectedReasonOption, setSelectedReasonOption] = useState('Lunch & Rest');
  const [customReason, setCustomReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startTime || !endTime) {
      setError('Both start and end time are required.');
      return;
    }
    if (startTime >= endTime) {
      setError('End time must be after start time.');
      return;
    }

    const finalReason =
      selectedReasonOption === 'Other'
        ? customReason.trim() || 'Other / Personal'
        : selectedReasonOption;

    setError(null);
    onSave(startTime, endTime, finalReason);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-xl border-2 border-amber-300 w-full max-w-md overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-amber-100 bg-amber-50/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-md bg-amber-100 text-amber-800 border border-amber-300 flex items-center justify-center shrink-0">
              <Clock className="h-5 w-5 text-amber-700" />
            </div>
            <div>
              <h2 className="font-serif font-bold text-base text-stone-900">
                Block Busy Hours
              </h2>
              <p className="text-xs text-stone-600 font-medium">
                {selectedDate ? formatFullDate(selectedDate) : 'Select a date'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 p-1.5 rounded-md hover:bg-stone-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-md text-xs text-amber-900 leading-relaxed">
            Devotees will not be able to book home rituals during this blocked window.
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Time pickers */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700">From (Start Time)</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full border-2 border-stone-200 focus:border-amber-500 rounded-md p-2.5 text-sm font-mono text-stone-900 outline-none"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700">To (End Time)</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full border-2 border-stone-200 focus:border-amber-500 rounded-md p-2.5 text-sm font-mono text-stone-900 outline-none"
                required
              />
            </div>
          </div>

          {/* Reason Selection with Fixed Options & 'Other' Manual Input */}
          <div className="space-y-2 pt-1">
            <label className="text-xs font-bold text-stone-700">Reason for Blocking Time</label>
            <select
              value={selectedReasonOption}
              onChange={(e) => setSelectedReasonOption(e.target.value)}
              className="w-full border-2 border-stone-200 focus:border-amber-500 rounded-md p-2.5 text-sm text-stone-900 bg-white outline-none cursor-pointer font-medium"
            >
              {REASON_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>

            {selectedReasonOption === 'Other' && (
              <div className="pt-1 space-y-1">
                <input
                  type="text"
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Enter your custom reason..."
                  className="w-full border-2 border-amber-400 focus:border-amber-600 rounded-md p-2.5 text-sm text-stone-900 outline-none animate-in fade-in duration-100"
                  autoFocus
                  required
                />
              </div>
            )}
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-100">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-10 px-4 text-xs font-semibold border-stone-300"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="h-10 px-5 text-xs font-bold bg-[#780016] hover:bg-red-800 text-white shadow-xs"
            >
              Block Time Range
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
