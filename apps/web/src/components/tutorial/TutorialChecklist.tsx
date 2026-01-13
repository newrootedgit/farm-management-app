import { X, Minus, RotateCcw, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTutorialStore, TUTORIAL_STEPS, CATEGORY_LABELS, StepCategory } from '@/stores/tutorial-store';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { TutorialStep } from './TutorialStep';

export function TutorialChecklist() {
  const navigate = useNavigate();
  const {
    showChecklist,
    isMinimized,
    toggleChecklist,
    toggleMinimize,
    skipTutorial,
    startTour,
    getProgress,
    getCurrentStepIndex,
    getStepVisibility,
    skipStep,
    resetTutorial,
    isAllComplete,
  } = useTutorialStore();

  // Minimize on ESC key (when not already minimized)
  useEscapeKey(showChecklist && !isMinimized, toggleMinimize);

  if (!showChecklist) return null;

  const progress = getProgress();
  const currentStepIndex = getCurrentStepIndex();
  const isComplete = isAllComplete();

  // Group steps by category while maintaining order
  const categories: StepCategory[] = ['setup', 'varieties', 'supplies', 'pricing', 'business', 'production'];
  const stepsByCategory = categories.reduce((acc, category) => {
    acc[category] = TUTORIAL_STEPS
      .map((step, index) => ({ step, globalIndex: index }))
      .filter(({ step }) => step.category === category);
    return acc;
  }, {} as Record<StepCategory, Array<{ step: typeof TUTORIAL_STEPS[number]; globalIndex: number }>>);

  // Determine which categories should be visible (have at least one visible step)
  const visibleCategories = categories.filter((category) => {
    const categorySteps = stepsByCategory[category];
    return categorySteps.some(({ globalIndex }) => {
      const visibility = getStepVisibility(globalIndex);
      return visibility !== 'locked';
    });
  });

  if (isMinimized) {
    return (
      <button
        onClick={toggleMinimize}
        className="fixed bottom-4 right-4 z-40 bg-primary text-primary-foreground rounded-full p-3 shadow-lg hover:bg-primary/90 transition-colors"
        title="Show tutorial checklist"
      >
        <div className="relative">
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
          </svg>
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full text-[10px] font-bold flex items-center justify-center">
            {progress.percentage}%
          </div>
        </div>
      </button>
    );
  }

  return (
    <div className="fixed right-4 top-20 z-40 w-80 bg-card border rounded-lg shadow-xl max-h-[calc(100vh-6rem)] flex flex-col animate-in slide-in-from-right-5 duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 rounded-t-lg">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-500" />
          <h3 className="font-semibold text-sm">Getting Started</h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={toggleMinimize}
            className="p-1 hover:bg-white/50 dark:hover:bg-black/20 rounded transition-colors"
            title="Minimize"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            onClick={toggleChecklist}
            className="p-1 hover:bg-white/50 dark:hover:bg-black/20 rounded transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="px-4 py-3 border-b">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-muted-foreground">
            {isComplete ? 'All done!' : `Step ${currentStepIndex + 1} of ${progress.total}`}
          </span>
          <span className="font-medium text-blue-600">{progress.percentage}%</span>
        </div>
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ease-out ${
              isComplete ? 'bg-green-500' : 'bg-gradient-to-r from-blue-500 to-purple-500'
            }`}
            style={{ width: `${progress.percentage}%` }}
          />
        </div>
      </div>

      {/* Steps List */}
      <div className="flex-1 overflow-y-auto p-2">
        {isComplete ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center animate-bounce">
              <svg className="w-8 h-8 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 12l2 2 4-4" />
                <circle cx="12" cy="12" r="10" />
              </svg>
            </div>
            <h4 className="font-semibold mb-1">Congratulations!</h4>
            <p className="text-sm text-muted-foreground mb-4">
              You've completed all the setup steps. Your farm is ready to go!
            </p>
            <button
              onClick={resetTutorial}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Reset tutorial
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {visibleCategories.map((category) => {
              const categorySteps = stepsByCategory[category];
              // Only show steps that are visible
              const visibleSteps = categorySteps.filter(({ globalIndex }) => {
                const visibility = getStepVisibility(globalIndex);
                return visibility !== 'locked';
              });

              // Check if any locked steps exist in this category
              const hasLockedSteps = categorySteps.some(({ globalIndex }) => {
                const visibility = getStepVisibility(globalIndex);
                return visibility === 'locked';
              });

              return (
                <div key={category}>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-1.5">
                    {CATEGORY_LABELS[category]}
                  </h4>
                  <div className="space-y-0.5">
                    {visibleSteps.map(({ step, globalIndex }) => (
                      <TutorialStep
                        key={step.id}
                        step={step}
                        stepNumber={globalIndex + 1}
                        visibility={getStepVisibility(globalIndex)}
                        onNavigate={() => navigate(step.route)}
                        onStartTour={() => {
                          navigate(step.route);
                          // Small delay to allow navigation to complete
                          setTimeout(() => startTour(step.id), 100);
                        }}
                        onSkip={step.optional ? () => skipStep(step.id) : undefined}
                      />
                    ))}
                    {/* Show placeholder for locked steps */}
                    {hasLockedSteps && (
                      <div className="flex items-center gap-3 px-3 py-2 opacity-30">
                        <span className="text-xs text-muted-foreground tracking-widest">· · · · ·</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      {!isComplete && (
        <div className="px-4 py-3 border-t">
          <button
            onClick={skipTutorial}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip tutorial
          </button>
        </div>
      )}
    </div>
  );
}
