import { useState } from 'react';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import type { Task } from '@farm/shared';

interface LogViewerModalProps {
  task: Task;
  onClose: () => void;
  onSaveEdit?: (taskId: string, data: LogEditData) => Promise<void>;
}

export interface LogEditData {
  completedBy?: string;
  completionNotes?: string;
  actualTrays?: number;
  seedLot?: string;
  actualYieldOz?: number;
  completedAt?: string; // ISO date string
}

const getTaskTypeInfo = (type: string) => {
  const info: Record<string, { label: string; icon: string; color: string; bgColor: string }> = {
    SOAK: {
      label: 'Soak Seeds',
      icon: '💧',
      color: 'text-blue-800 dark:text-blue-200',
      bgColor: 'bg-blue-100 dark:bg-blue-900',
    },
    SEED: {
      label: 'Plant Seeds',
      icon: '🌱',
      color: 'text-green-800 dark:text-green-200',
      bgColor: 'bg-green-100 dark:bg-green-900',
    },
    MOVE_TO_LIGHT: {
      label: 'Move to Light',
      icon: '☀️',
      color: 'text-yellow-800 dark:text-yellow-200',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900',
    },
    HARVESTING: {
      label: 'Harvest',
      icon: '✂️',
      color: 'text-purple-800 dark:text-purple-200',
      bgColor: 'bg-purple-100 dark:bg-purple-900',
    },
  };
  return info[type] || { label: type, icon: '📋', color: 'text-gray-800', bgColor: 'bg-gray-100' };
};

// Check if task is missing log data
const isMissingLog = (task: Task): boolean => {
  return task.status === 'COMPLETED' && !task.completedBy;
};

export function LogViewerModal({ task, onClose, onSaveEdit }: LogViewerModalProps) {
  // Auto-enter edit mode if task is missing log data
  const missingLog = isMissingLog(task);
  const [isEditing, setIsEditing] = useState(missingLog);
  const [showWarning, setShowWarning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit form state - default date/time to now
  const [editForm, setEditForm] = useState(() => {
    const now = new Date();
    let completedDate = now.toISOString().split('T')[0];
    let completedTime = now.toTimeString().slice(0, 5);

    // For existing logs with completedAt, use that date/time instead
    if (task.completedAt && !missingLog) {
      const date = new Date(task.completedAt);
      completedDate = date.toISOString().split('T')[0];
      completedTime = date.toTimeString().slice(0, 5);
    }

    return {
      completedBy: task.completedBy || '',
      completionNotes: task.completionNotes || '',
      actualTrays: task.actualTrays?.toString() || '',
      seedLot: task.seedLot || '',
      actualYieldOz: (task as { actualYieldOz?: number }).actualYieldOz?.toString() || '',
      completedDate,
      completedTime,
    };
  });

  // Close on ESC key
  useEscapeKey(true, () => {
    if (isEditing) {
      handleCancelEdit();
    } else if (showWarning) {
      setShowWarning(false);
    } else {
      onClose();
    }
  });

  const typeInfo = getTaskTypeInfo(task.type);

  const handleEditClick = () => {
    // Skip warning for tasks missing log data - they're filling it in, not editing
    if (missingLog) {
      setIsEditing(true);
    } else {
      setShowWarning(true);
    }
  };

  const handleConfirmEdit = () => {
    setShowWarning(false);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    // Reset form to original values - default to now for date/time
    const now = new Date();
    let completedDate = now.toISOString().split('T')[0];
    let completedTime = now.toTimeString().slice(0, 5);
    if (task.completedAt && !missingLog) {
      const date = new Date(task.completedAt);
      completedDate = date.toISOString().split('T')[0];
      completedTime = date.toTimeString().slice(0, 5);
    }
    setEditForm({
      completedBy: task.completedBy || '',
      completionNotes: task.completionNotes || '',
      actualTrays: task.actualTrays?.toString() || '',
      seedLot: task.seedLot || '',
      actualYieldOz: (task as { actualYieldOz?: number }).actualYieldOz?.toString() || '',
      completedDate,
      completedTime,
    });
    setError(null);
  };

  const handleSaveEdit = async () => {
    if (!onSaveEdit) return;

    // Validation for missing logs - require name and date/time
    if (missingLog) {
      if (!editForm.completedBy.trim()) {
        setError('Please enter your name');
        return;
      }
      if (!editForm.completedDate || !editForm.completedTime) {
        setError('Please enter the completion date and time');
        return;
      }
    }

    // Always require actual trays
    if (!editForm.actualTrays || parseInt(editForm.actualTrays) < 0) {
      setError('Please enter the actual number of trays');
      return;
    }

    // Require actual yield for harvest tasks
    if (task.type === 'HARVESTING' && (!editForm.actualYieldOz || parseFloat(editForm.actualYieldOz) < 0)) {
      setError('Please enter the actual yield');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      // Build completedAt if date and time are provided
      let completedAt: string | undefined;
      if (editForm.completedDate && editForm.completedTime) {
        completedAt = new Date(`${editForm.completedDate}T${editForm.completedTime}`).toISOString();
      }

      await onSaveEdit(task.id, {
        completedBy: editForm.completedBy.trim() || undefined,
        completionNotes: editForm.completionNotes.trim() || undefined,
        actualTrays: editForm.actualTrays ? parseInt(editForm.actualTrays) : undefined,
        seedLot: editForm.seedLot.trim() || undefined,
        actualYieldOz: editForm.actualYieldOz ? parseFloat(editForm.actualYieldOz) : undefined,
        completedAt,
      });
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (dateStr: string | Date | null | undefined) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (dateStr: string | Date | null | undefined) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      {/* Edit Warning Modal */}
      {showWarning && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="bg-background border rounded-lg shadow-xl w-full max-w-sm mx-4 p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="flex-shrink-0 w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-lg">Edit Historical Log?</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Editing logs can affect historical records and reporting. Changes will be tracked but may impact past data.
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowWarning(false)}
                className="px-4 py-2 text-sm border rounded-md hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmEdit}
                className="px-4 py-2 text-sm bg-amber-600 text-white rounded-md hover:bg-amber-700"
              >
                Edit Log
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Modal */}
      <div className="bg-background border rounded-lg shadow-lg w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-background">
          <div className="flex items-center gap-3">
            <div className={`text-2xl p-2 rounded-lg ${typeInfo.bgColor}`}>
              {typeInfo.icon}
            </div>
            <div>
              <h2 className="text-lg font-semibold">
                {missingLog ? 'Complete Log Entry' : `${typeInfo.label} Log`}
              </h2>
              <p className="text-sm text-muted-foreground">
                {task.orderItem?.product?.name || task.title}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                  className="px-3 py-1.5 text-sm border rounded-md hover:bg-muted disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={isSaving}
                  className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
              </>
            ) : (
              <>
                {onSaveEdit && (
                  <button
                    onClick={handleEditClick}
                    className="px-3 py-1.5 text-sm border rounded-md hover:bg-muted"
                  >
                    Edit Log
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="text-muted-foreground hover:text-foreground p-1"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-sm bg-destructive/10 text-destructive rounded-md">
              {error}
            </div>
          )}

          {/* Missing Log Banner */}
          {missingLog && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md">
              <div className="flex items-start gap-2">
                <span className="text-amber-600 dark:text-amber-400 text-lg">📝</span>
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    Log data missing
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                    This task was marked complete but the log wasn't filled out. Please enter the details below.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Task Info */}
          <div className="p-4 bg-muted/50 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Product</span>
              <span className="font-medium">{task.orderItem?.product?.name || task.title}</span>
            </div>
            {task.orderItem?.order?.customer && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Customer</span>
                <span className="font-medium">{task.orderItem.order.customer}</span>
              </div>
            )}
            {task.orderItem?.order?.orderNumber && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Order</span>
                <span className="font-medium">#{task.orderItem.order.orderNumber}</span>
              </div>
            )}
            {task.orderItem?.traysNeeded && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Expected Trays</span>
                <span className="font-medium">{task.orderItem.traysNeeded}</span>
              </div>
            )}
          </div>

          {/* Dates */}
          <div className="p-4 bg-muted/50 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Due Date</span>
              <span className="font-medium">{formatDate(task.dueDate)}</span>
            </div>
            {/* Only show completed date if it exists and not in edit mode for missing logs */}
            {!missingLog && task.completedAt && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Completed</span>
                <span className="font-medium">
                  {formatDate(task.completedAt)}
                  {task.completedAt && ` at ${formatTime(task.completedAt)}`}
                </span>
              </div>
            )}
          </div>

          {/* Editable Fields */}
          <div className="space-y-4">
            {/* Date and Time - shown when editing */}
            {isEditing && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Completion Date *</label>
                  <input
                    type="date"
                    value={editForm.completedDate}
                    onChange={(e) => setEditForm({ ...editForm, completedDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md bg-background"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Time *</label>
                  <input
                    type="time"
                    value={editForm.completedTime}
                    onChange={(e) => setEditForm({ ...editForm, completedTime: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md bg-background"
                  />
                </div>
              </div>
            )}

            {/* Completed By */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Completed By{missingLog && ' *'}
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={editForm.completedBy}
                  onChange={(e) => setEditForm({ ...editForm, completedBy: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md bg-background"
                  placeholder="Enter your name"
                />
              ) : (
                <p className="px-3 py-2 bg-muted/50 rounded-md text-sm">
                  {task.completedBy || 'Not recorded'}
                </p>
              )}
            </div>

            {/* Actual Trays */}
            <div>
              <label className="block text-sm font-medium mb-1">Actual Trays *</label>
              {isEditing ? (
                <>
                  <input
                    type="number"
                    min="0"
                    value={editForm.actualTrays}
                    onChange={(e) => setEditForm({ ...editForm, actualTrays: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-md bg-background ${
                      editForm.actualTrays && task.orderItem?.traysNeeded && parseInt(editForm.actualTrays) !== task.orderItem.traysNeeded
                        ? 'border-amber-400 focus:border-amber-500 focus:ring-amber-500'
                        : ''
                    }`}
                  />
                  {editForm.actualTrays && task.orderItem?.traysNeeded && parseInt(editForm.actualTrays) !== task.orderItem.traysNeeded && (
                    <div className="mt-1.5 p-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded text-xs">
                      <span className="text-amber-700 dark:text-amber-300">
                        ⚠️ Different from expected ({task.orderItem.traysNeeded} trays).
                        {parseInt(editForm.actualTrays) > task.orderItem.traysNeeded
                          ? ` +${parseInt(editForm.actualTrays) - task.orderItem.traysNeeded} extra`
                          : ` ${parseInt(editForm.actualTrays) - task.orderItem.traysNeeded} short`
                        }
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <p className="px-3 py-2 bg-muted/50 rounded-md text-sm">
                  {task.actualTrays ?? 'Not recorded'}
                  {task.orderItem?.traysNeeded && task.actualTrays && (
                    <span className={`ml-2 ${task.actualTrays !== task.orderItem.traysNeeded ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`}>
                      (expected: {task.orderItem.traysNeeded})
                      {task.actualTrays !== task.orderItem.traysNeeded && ' ⚠️'}
                    </span>
                  )}
                </p>
              )}
            </div>

            {/* Seed Lot - editable only for SOAK and SEED tasks */}
            {(task.type === 'SOAK' || task.type === 'SEED') && (
              <div>
                <label className="block text-sm font-medium mb-1">Seed Lot</label>
                {isEditing ? (
                  <>
                    <input
                      type="text"
                      value={editForm.seedLot}
                      onChange={(e) => setEditForm({ ...editForm, seedLot: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md bg-background"
                      placeholder="e.g., SL-2026-001"
                    />
                    {!editForm.seedLot && (
                      <div className="mt-1.5 p-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded text-xs">
                        <span className="text-blue-700 dark:text-blue-300">
                          💡 Recording seed lot numbers helps track growing issues back to specific seed batches for quality control.
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="px-3 py-2 bg-muted/50 rounded-md text-sm">
                    {task.seedLot || 'Not recorded'}
                  </p>
                )}
              </div>
            )}

            {/* Seed Lot - read-only display for MOVE_TO_LIGHT and HARVESTING (inherited from earlier step) */}
            {(task.type === 'MOVE_TO_LIGHT' || task.type === 'HARVESTING') && task.seedLot && (
              <div>
                <label className="block text-sm font-medium mb-1">Seed Lot</label>
                <p className="px-3 py-2 bg-muted/50 rounded-md text-sm">
                  {task.seedLot}
                </p>
              </div>
            )}

            {/* Actual Yield (for HARVESTING tasks) */}
            {task.type === 'HARVESTING' && (
              <div>
                <label className="block text-sm font-medium mb-1">Actual Yield (oz) *</label>
                {isEditing ? (
                  <>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={editForm.actualYieldOz}
                      onChange={(e) => setEditForm({ ...editForm, actualYieldOz: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-md bg-background ${
                        editForm.actualYieldOz && task.orderItem?.quantityOz && parseFloat(editForm.actualYieldOz) !== task.orderItem.quantityOz
                          ? 'border-amber-400 focus:border-amber-500 focus:ring-amber-500'
                          : ''
                      }`}
                    />
                    {editForm.actualYieldOz && task.orderItem?.quantityOz && parseFloat(editForm.actualYieldOz) !== task.orderItem.quantityOz && (
                      <div className="mt-1.5 p-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded text-xs">
                        <span className="text-amber-700 dark:text-amber-300">
                          ⚠️ Different from target ({task.orderItem.quantityOz} oz).
                          {parseFloat(editForm.actualYieldOz) > task.orderItem.quantityOz
                            ? ` +${(parseFloat(editForm.actualYieldOz) - task.orderItem.quantityOz).toFixed(1)} oz over`
                            : ` ${(parseFloat(editForm.actualYieldOz) - task.orderItem.quantityOz).toFixed(1)} oz under`
                          }
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="px-3 py-2 bg-muted/50 rounded-md text-sm">
                    {(task as { actualYieldOz?: number }).actualYieldOz ?? 'Not recorded'} oz
                    {task.orderItem?.quantityOz && (
                      <span className={`ml-2 ${(task as { actualYieldOz?: number }).actualYieldOz !== task.orderItem.quantityOz ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`}>
                        (target: {task.orderItem.quantityOz} oz)
                        {(task as { actualYieldOz?: number }).actualYieldOz !== undefined && (task as { actualYieldOz?: number }).actualYieldOz !== task.orderItem.quantityOz && ' ⚠️'}
                      </span>
                    )}
                  </p>
                )}
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium mb-1">Notes</label>
              {isEditing ? (
                <textarea
                  value={editForm.completionNotes}
                  onChange={(e) => setEditForm({ ...editForm, completionNotes: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md bg-background resize-none"
                  rows={3}
                />
              ) : (
                <p className="px-3 py-2 bg-muted/50 rounded-md text-sm min-h-[60px]">
                  {task.completionNotes || 'No notes'}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer (read-only mode) */}
        {!isEditing && (
          <div className="px-6 py-4 border-t">
            <button
              onClick={onClose}
              className="w-full px-4 py-2 text-sm border rounded-md hover:bg-muted"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
