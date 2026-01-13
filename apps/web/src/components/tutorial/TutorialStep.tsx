import { Check, Lock, Play, SkipForward } from 'lucide-react';
import { TutorialStepInfo, StepVisibility } from '@/stores/tutorial-store';

interface TutorialStepProps {
  step: TutorialStepInfo;
  stepNumber: number;
  visibility: StepVisibility;
  onNavigate: () => void;
  onStartTour: () => void;
  onSkip?: () => void;
}

export function TutorialStep({
  step,
  stepNumber,
  visibility,
  onNavigate,
  onStartTour,
  onSkip,
}: TutorialStepProps) {
  const isCompleted = visibility === 'completed';
  const isCurrent = visibility === 'current';
  const isNext = visibility === 'next';
  const isLocked = visibility === 'locked';

  // Don't render locked steps (show placeholder instead)
  if (isLocked) {
    return (
      <div className="flex items-center gap-3 px-3 py-2 opacity-30">
        <div className="w-5 h-5 flex items-center justify-center">
          <span className="text-xs text-muted-foreground">·····</span>
        </div>
      </div>
    );
  }

  const handleClick = () => {
    if (isCurrent || isNext) {
      onNavigate();
    }
  };

  return (
    <div
      className={`
        flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-300
        ${isCompleted ? 'bg-green-50 dark:bg-green-950/20' : ''}
        ${isCurrent ? 'bg-blue-50 dark:bg-blue-950/20 ring-1 ring-blue-200 dark:ring-blue-800' : ''}
        ${isNext ? 'opacity-60' : ''}
        ${(isCurrent || isNext) ? 'cursor-pointer hover:bg-muted' : ''}
      `}
      onClick={handleClick}
    >
      {/* Step Number/Status Icon */}
      <div className="flex-shrink-0">
        {isCompleted ? (
          <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
            <Check className="w-3.5 h-3.5 text-white" />
          </div>
        ) : isCurrent ? (
          <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
            <span className="text-xs font-semibold text-white">{stepNumber}</span>
          </div>
        ) : isNext ? (
          <div className="w-6 h-6 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center">
            <span className="text-xs font-medium text-muted-foreground">{stepNumber}</span>
          </div>
        ) : (
          <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
            <Lock className="w-3 h-3 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-medium truncate ${
            isCompleted
              ? 'text-green-700 dark:text-green-400 line-through'
              : isCurrent
                ? 'text-foreground'
                : 'text-muted-foreground'
          }`}
        >
          {step.title}
        </p>
        {isCurrent && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">{step.description}</p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* Tour Button */}
        {step.hasTour && isCurrent && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStartTour();
            }}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-blue-600 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 transition-colors"
            title="Start guided tour"
          >
            <Play className="w-3 h-3" />
            <span>Tour</span>
          </button>
        )}

        {/* Skip Button for optional steps */}
        {step.optional && isCurrent && onSkip && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSkip();
            }}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
            title="Skip this step"
          >
            <SkipForward className="w-3 h-3" />
            <span>Skip</span>
          </button>
        )}
      </div>
    </div>
  );
}
