import { useState } from 'react';
import { CheckCircle, X, Loader2 } from 'lucide-react';
import type { Task } from '@farm/shared';

interface BulkActionBarProps {
  selectedTasks: Task[];
  onClearSelection: () => void;
  onBulkComplete: (data: BulkCompleteData) => Promise<void>;
  isLoading?: boolean;
}

export interface BulkCompleteData {
  completedBy: string;
  completedDate: string;
  completedTime: string;
  completionNotes?: string;
}

export function BulkActionBar({
  selectedTasks,
  onClearSelection,
  onBulkComplete,
  isLoading = false,
}: BulkActionBarProps) {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<BulkCompleteData>(() => {
    const now = new Date();
    return {
      completedBy: '',
      completedDate: now.toISOString().split('T')[0],
      completedTime: now.toTimeString().slice(0, 5),
      completionNotes: '',
    };
  });
  const [error, setError] = useState<string | null>(null);

  if (selectedTasks.length === 0) return null;

  // Group selected tasks by type
  const tasksByType = selectedTasks.reduce((acc, task) => {
    acc[task.type] = (acc[task.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.completedBy.trim()) {
      setError('Please enter your name');
      return;
    }

    try {
      await onBulkComplete(formData);
      setShowModal(false);
      setFormData({
        completedBy: '',
        completedDate: new Date().toISOString().split('T')[0],
        completedTime: new Date().toTimeString().slice(0, 5),
        completionNotes: '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete tasks');
    }
  };

  return (
    <>
      {/* Floating Action Bar */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
        <div className="flex items-center gap-4 px-6 py-3 bg-primary text-primary-foreground rounded-full shadow-lg">
          <span className="font-medium">
            {selectedTasks.length} task{selectedTasks.length !== 1 ? 's' : ''} selected
          </span>

          <div className="flex items-center gap-1 text-sm opacity-80">
            {Object.entries(tasksByType).map(([type, count], i) => (
              <span key={type}>
                {i > 0 && ', '}
                {count} {type.replace('_', ' ').toLowerCase()}
              </span>
            ))}
          </div>

          <div className="w-px h-6 bg-primary-foreground/30" />

          <button
            onClick={() => setShowModal(true)}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-1.5 bg-white text-primary rounded-full font-medium hover:bg-white/90 disabled:opacity-50"
          >
            <CheckCircle className="w-4 h-4" />
            Complete All
          </button>

          <button
            onClick={onClearSelection}
            className="p-1.5 hover:bg-primary-foreground/20 rounded-full"
            title="Clear selection"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bulk Complete Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background border rounded-lg shadow-lg w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div>
                <h2 className="text-lg font-semibold">Complete {selectedTasks.length} Tasks</h2>
                <p className="text-sm text-muted-foreground">
                  Mark all selected tasks as complete
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 text-sm bg-destructive/10 text-destructive rounded-md">
                  {error}
                </div>
              )}

              {/* Task Summary */}
              <div className="p-3 bg-muted/50 rounded-md">
                <p className="text-sm font-medium mb-2">Tasks to complete:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {Object.entries(tasksByType).map(([type, count]) => (
                    <li key={type} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                      {count} {type.replace('_', ' ').toLowerCase()} task{count !== 1 ? 's' : ''}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Date and Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Date</label>
                  <input
                    type="date"
                    value={formData.completedDate}
                    onChange={(e) => setFormData({ ...formData, completedDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md bg-background"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Time</label>
                  <input
                    type="time"
                    value={formData.completedTime}
                    onChange={(e) => setFormData({ ...formData, completedTime: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md bg-background"
                  />
                </div>
              </div>

              {/* Completed By */}
              <div>
                <label className="block text-sm font-medium mb-1">Your Name *</label>
                <input
                  type="text"
                  value={formData.completedBy}
                  onChange={(e) => setFormData({ ...formData, completedBy: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md bg-background"
                  placeholder="Enter your name"
                  autoFocus
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium mb-1">Notes (optional)</label>
                <textarea
                  value={formData.completionNotes}
                  onChange={(e) => setFormData({ ...formData, completionNotes: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md bg-background resize-none"
                  rows={2}
                  placeholder="Add notes for all tasks..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border rounded-md hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Completing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Complete {selectedTasks.length} Tasks
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
