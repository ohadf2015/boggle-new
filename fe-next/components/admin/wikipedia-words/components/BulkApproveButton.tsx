'use client';

import React, { useState } from 'react';
import { CheckCircle, Loader2 } from 'lucide-react';

interface BulkApproveButtonProps {
  selectedCount: number;
  onApprove: () => Promise<{ approved: number; skipped: number; failed: number }>;
  disabled?: boolean;
}

export function BulkApproveButton({
  selectedCount,
  onApprove,
  disabled = false,
}: BulkApproveButtonProps): React.ReactElement {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    approved: number;
    skipped: number;
    failed: number;
  } | null>(null);

  const handleClick = async (): Promise<void> => {
    if (selectedCount === 0 || loading) return;

    setLoading(true);
    setResult(null);

    try {
      const response = await onApprove();
      setResult(response);

      // Clear result after 5 seconds
      setTimeout(() => setResult(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <button type="button"
        onClick={handleClick}
        disabled={disabled || selectedCount === 0 || loading}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-lg font-medium
          border-2 border-black shadow-hard
          transition-all duration-150
          ${
            disabled || selectedCount === 0 || loading
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-neo-yellow text-black hover:bg-yellow-400 active:shadow-hard-pressed active:translate-x-[2px] active:translate-y-[2px]'
          }
        `}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <CheckCircle className="w-4 h-4" />
        )}
        {loading
          ? 'Approving...'
          : `Approve ${selectedCount} to Dictionary`}
      </button>

      {result && (
        <span className="text-sm">
          <span className="text-green-500">{result.approved} approved</span>
          {result.skipped > 0 && (
            <span className="text-yellow-500 ms-2">{result.skipped} skipped</span>
          )}
          {result.failed > 0 && (
            <span className="text-red-500 ms-2">{result.failed} failed</span>
          )}
        </span>
      )}
    </div>
  );
}
