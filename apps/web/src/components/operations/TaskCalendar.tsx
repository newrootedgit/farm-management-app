import { useMemo, useState } from 'react';
import type { Task } from '@farm/shared';

type CalendarView = 'day' | 'week' | 'month';

interface TaskCalendarProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  showCompleted: boolean;
}

// Task type colors
const TASK_TYPE_COLORS: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  SOAK: { bg: 'bg-indigo-100 dark:bg-indigo-900/50', text: 'text-indigo-700 dark:text-indigo-300', dot: 'bg-indigo-500', label: 'Soak' },
  SEED: { bg: 'bg-emerald-100 dark:bg-emerald-900/50', text: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500', label: 'Seed' },
  MOVE_TO_LIGHT: { bg: 'bg-amber-100 dark:bg-amber-900/50', text: 'text-amber-700 dark:text-amber-300', dot: 'bg-amber-500', label: 'Light' },
  HARVESTING: { bg: 'bg-rose-100 dark:bg-rose-900/50', text: 'text-rose-700 dark:text-rose-300', dot: 'bg-rose-500', label: 'Harvest' },
};

export default function TaskCalendar({ tasks, onTaskClick, showCompleted }: TaskCalendarProps) {
  const [calendarView, setCalendarView] = useState<CalendarView>('month');
  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  });
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // Get calendar grid data
  const calendarData = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    // First day of month and how many days
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();

    // Day of week the month starts on (0 = Sunday)
    const startDayOfWeek = firstDay.getDay();

    // Build weeks array
    const weeks: (Date | null)[][] = [];
    let currentWeek: (Date | null)[] = [];

    // Add empty cells for days before the month starts
    for (let i = 0; i < startDayOfWeek; i++) {
      currentWeek.push(null);
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      currentWeek.push(new Date(year, month, day));
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    // Fill remaining cells in last week
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(null);
      }
      weeks.push(currentWeek);
    }

    return weeks;
  }, [currentMonth]);

  // Group tasks by date
  const tasksByDate = useMemo(() => {
    const productionTypes = ['SOAK', 'SEED', 'MOVE_TO_LIGHT', 'HARVESTING'];
    const grouped: Record<string, Task[]> = {};

    tasks.forEach((task) => {
      if (!productionTypes.includes(task.type)) return;
      if (!showCompleted && task.status === 'COMPLETED') return;
      if (!task.dueDate) return;

      const date = new Date(task.dueDate);
      const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(task);
    });

    // Sort tasks within each day by type order
    const typeOrder = { SOAK: 0, SEED: 1, MOVE_TO_LIGHT: 2, HARVESTING: 3 };
    Object.values(grouped).forEach((dateTasks) => {
      dateTasks.sort((a, b) =>
        (typeOrder[a.type as keyof typeof typeOrder] ?? 4) -
        (typeOrder[b.type as keyof typeof typeOrder] ?? 4)
      );
    });

    return grouped;
  }, [tasks, showCompleted]);

  const getTasksForDate = (date: Date | null): Task[] => {
    if (!date) return [];
    const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    return tasksByDate[dateKey] || [];
  };

  // Get week data (7 days starting from current week's Sunday)
  const weekData = useMemo(() => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Go to Sunday

    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(day.getDate() + i);
      days.push(day);
    }
    return days;
  }, [currentDate]);

  const navigateMonth = (delta: number) => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  const navigateWeek = (delta: number) => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() + (delta * 7));
      return newDate;
    });
  };

  const navigateDay = (delta: number) => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() + delta);
      return newDate;
    });
  };

  const goToToday = () => {
    setCurrentDate(new Date(today));
    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
  };

  const isToday = (date: Date | null): boolean => {
    if (!date) return false;
    return date.toDateString() === today.toDateString();
  };

  // Get label based on view
  const getViewLabel = () => {
    if (calendarView === 'day') {
      return currentDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    } else if (calendarView === 'week') {
      const startOfWeek = weekData[0];
      const endOfWeek = weekData[6];
      const startMonth = startOfWeek.toLocaleDateString('en-US', { month: 'short' });
      const endMonth = endOfWeek.toLocaleDateString('en-US', { month: 'short' });
      if (startMonth === endMonth) {
        return `${startMonth} ${startOfWeek.getDate()} - ${endOfWeek.getDate()}, ${startOfWeek.getFullYear()}`;
      }
      return `${startMonth} ${startOfWeek.getDate()} - ${endMonth} ${endOfWeek.getDate()}, ${endOfWeek.getFullYear()}`;
    }
    return currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const handleNavigate = (delta: number) => {
    if (calendarView === 'day') {
      navigateDay(delta);
    } else if (calendarView === 'week') {
      navigateWeek(delta);
    } else {
      navigateMonth(delta);
    }
  };

  return (
    <div className="border rounded-lg bg-card overflow-hidden">
      {/* Calendar Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleNavigate(-1)}
            className="p-2 hover:bg-muted rounded-md transition-colors"
            aria-label="Previous"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-lg font-semibold min-w-[220px] text-center">{getViewLabel()}</h2>
          <button
            onClick={() => handleNavigate(1)}
            className="p-2 hover:bg-muted rounded-md transition-colors"
            aria-label="Next"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-2">
          <div className="flex border rounded-md overflow-hidden">
            {(['day', 'week', 'month'] as CalendarView[]).map((view) => (
              <button
                key={view}
                onClick={() => setCalendarView(view)}
                className={`px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                  calendarView === view
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background hover:bg-muted'
                }`}
              >
                {view}
              </button>
            ))}
          </div>
          <button
            onClick={goToToday}
            className="px-3 py-1.5 text-sm font-medium border rounded-md hover:bg-muted transition-colors"
          >
            Today
          </button>
        </div>
      </div>

      {/* Day View */}
      {calendarView === 'day' && (
        <div className="p-4">
          {(() => {
            const dayTasks = getTasksForDate(currentDate);
            if (dayTasks.length === 0) {
              return (
                <div className="text-center py-12">
                  <div className="text-4xl mb-3">📅</div>
                  <h3 className="font-medium">No tasks scheduled</h3>
                  <p className="text-sm text-muted-foreground">
                    No tasks for {currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </p>
                </div>
              );
            }
            return (
              <div className="space-y-3">
                {dayTasks.map((task) => {
                  const taskColors = TASK_TYPE_COLORS[task.type] || { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-500', label: task.type };
                  const isCompleted = task.status === 'COMPLETED';
                  const productName = task.orderItem?.product?.name || task.title;
                  const customerName = task.orderItem?.order?.customer || '';

                  return (
                    <div
                      key={task.id}
                      onClick={() => onTaskClick(task)}
                      className={`border rounded-lg p-4 bg-card transition-all ${
                        isCompleted ? 'opacity-60' : 'hover:border-primary hover:shadow-md cursor-pointer'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${taskColors.bg} ${taskColors.text}`}>
                          {isCompleted ? 'Completed' : taskColors.label}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {task.orderItem?.order?.orderNumber}
                        </span>
                      </div>
                      <h3 className={`font-semibold text-lg mb-1 ${isCompleted ? 'line-through' : ''}`}>
                        {productName}
                      </h3>
                      {customerName && <p className="text-sm text-muted-foreground mb-2">{customerName}</p>}
                      <div className="flex gap-4 text-sm">
                        <span><span className="text-muted-foreground">Trays:</span> <strong>{task.orderItem?.traysNeeded || '—'}</strong></span>
                        <span><span className="text-muted-foreground">Qty:</span> <strong>{task.orderItem?.quantityOz || '—'} oz</strong></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* Week View */}
      {calendarView === 'week' && (
        <>
          <div className="grid grid-cols-7 border-b bg-muted/20">
            {weekData.map((date, i) => (
              <div key={i} className={`px-2 py-2 text-center ${isToday(date) ? 'bg-primary/10' : ''}`}>
                <div className="text-xs text-muted-foreground">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i]}</div>
                <div className={`text-lg font-medium ${isToday(date) ? 'text-primary' : ''}`}>{date.getDate()}</div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 divide-x min-h-[400px]">
            {weekData.map((date, i) => {
              const dayTasks = getTasksForDate(date);
              return (
                <div key={i} className={`p-2 ${isToday(date) ? 'bg-primary/5' : ''}`}>
                  <div className="space-y-1">
                    {dayTasks.map((task) => {
                      const taskColors = TASK_TYPE_COLORS[task.type] || { bg: 'bg-gray-100', text: 'text-gray-700', label: task.type };
                      const isCompleted = task.status === 'COMPLETED';
                      const productName = task.orderItem?.product?.name || task.title;

                      return (
                        <button
                          key={task.id}
                          onClick={() => onTaskClick(task)}
                          className={`w-full text-left px-2 py-1.5 rounded text-xs ${taskColors.bg} ${taskColors.text} ${
                            isCompleted ? 'opacity-60 line-through' : 'hover:opacity-80'
                          }`}
                          title={`${productName}\nTask: ${taskColors.label}`}
                        >
                          <div className="font-medium truncate">{productName}</div>
                          <div className="text-[10px] opacity-80">{taskColors.label}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Month View */}
      {calendarView === 'month' && (
        <>
          <div className="grid grid-cols-7 border-b bg-muted/20">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="px-2 py-2 text-center text-sm font-medium text-muted-foreground">
                {day}
              </div>
            ))}
          </div>
          <div className="divide-y">
            {calendarData.map((week, weekIndex) => (
              <div key={weekIndex} className="grid grid-cols-7 divide-x min-h-[120px]">
                {week.map((date, dayIndex) => {
                  const dayTasks = getTasksForDate(date);
                  const pendingCount = dayTasks.filter((t) => t.status !== 'COMPLETED').length;
                  const completedCount = dayTasks.filter((t) => t.status === 'COMPLETED').length;

                  return (
                    <div
                      key={dayIndex}
                      className={`p-1 min-h-[120px] ${
                        date ? 'bg-card hover:bg-muted/30' : 'bg-muted/10'
                      } ${isToday(date) ? 'bg-primary/5' : ''}`}
                    >
                      {date && (
                        <>
                          <div className="flex items-center justify-between px-1 mb-1">
                            <span
                              className={`text-sm font-medium ${
                                isToday(date)
                                  ? 'bg-primary text-primary-foreground w-7 h-7 rounded-full flex items-center justify-center'
                                  : 'text-foreground'
                              }`}
                            >
                              {date.getDate()}
                            </span>
                            {(pendingCount > 0 || completedCount > 0) && (
                              <div className="flex items-center gap-1 text-xs">
                                {pendingCount > 0 && (
                                  <span className="px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300 rounded">
                                    {pendingCount}
                                  </span>
                                )}
                                {completedCount > 0 && (
                                  <span className="px-1.5 py-0.5 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded">
                                    {completedCount}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="space-y-0.5 overflow-hidden">
                            {dayTasks.slice(0, 4).map((task) => {
                              const taskColors = TASK_TYPE_COLORS[task.type] || { bg: 'bg-gray-100', text: 'text-gray-700', label: task.type };
                              const isCompleted = task.status === 'COMPLETED';
                              const productName = task.orderItem?.product?.name || task.title;

                              return (
                                <button
                                  key={task.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onTaskClick(task);
                                  }}
                                  className={`w-full text-left px-1.5 py-0.5 rounded text-xs truncate ${taskColors.bg} ${taskColors.text} ${
                                    isCompleted ? 'opacity-60 line-through' : 'hover:opacity-80'
                                  }`}
                                  title={`${productName}\nTask: ${taskColors.label}`}
                                >
                                  <span className="font-medium truncate">{productName}</span>
                                  <span className="text-[10px] opacity-70 ml-1">· {taskColors.label}</span>
                                </button>
                              );
                            })}
                            {dayTasks.length > 4 && (
                              <div className="text-xs text-muted-foreground px-1.5">+{dayTasks.length - 4} more</div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 px-4 py-2 border-t bg-muted/20 text-xs">
        <span className="text-muted-foreground">Tasks:</span>
        {Object.entries(TASK_TYPE_COLORS).map(([type, colors]) => (
          <span key={type} className={`px-2 py-0.5 rounded ${colors.bg} ${colors.text}`}>
            {colors.label}
          </span>
        ))}
      </div>
    </div>
  );
}
