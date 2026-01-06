import { useState } from 'react';

interface TutorialStep {
  title: string;
  description: string;
  targetSelector?: string;
  position: 'center' | 'top' | 'bottom' | 'left' | 'right';
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: 'Welcome to Farm Layout',
    description:
      'This is your visual layout editor where you can design your farm by adding walls, equipment, and more. Let\'s take a quick tour!',
    position: 'center',
  },
  {
    title: 'Selection Tool',
    description:
      'Use the Select tool (S) to click and select any element. Once selected, you can drag to move it or use the properties panel to edit it.',
    targetSelector: '[data-tutorial="tool-select"]',
    position: 'bottom',
  },
  {
    title: 'Add Elements',
    description:
      'Click "Add Element" to place walls, sinks, tables, grow racks, and custom elements. For walls, click once to set the start point, then click again to set the end point.',
    targetSelector: '[data-tutorial="add-element"]',
    position: 'bottom',
  },
  {
    title: 'Unit System',
    description:
      'Toggle between feet and meters using the unit button. All dimensions will be displayed and can be entered in your preferred unit.',
    targetSelector: '[data-tutorial="unit-toggle"]',
    position: 'bottom',
  },
  {
    title: 'Grid & Snap',
    description:
      'Toggle the grid for visual alignment. Enable "Snap" to automatically align elements to the grid when you move or resize them.',
    position: 'center',
  },
  {
    title: 'Properties Panel',
    description:
      'When you select an element, the properties panel on the right shows all its details. You can edit the name, dimensions, color, and more.',
    position: 'left',
  },
  {
    title: 'Save Your Work',
    description:
      'Don\'t forget to save your layout! Click "Save Layout" when you\'ve made changes. You\'re all set to start designing!',
    position: 'center',
  },
];

interface LayoutTutorialProps {
  onComplete: () => void;
  onSkip: () => void;
}

export function LayoutTutorial({ onComplete, onSkip }: LayoutTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const step = TUTORIAL_STEPS[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (!isFirstStep) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Calculate position styles
  const getPositionStyles = () => {
    if (step.targetSelector) {
      const target = document.querySelector(step.targetSelector);
      if (target) {
        const rect = target.getBoundingClientRect();
        switch (step.position) {
          case 'bottom':
            return {
              top: rect.bottom + 12,
              left: rect.left + rect.width / 2,
              transform: 'translateX(-50%)',
            };
          case 'top':
            return {
              bottom: window.innerHeight - rect.top + 12,
              left: rect.left + rect.width / 2,
              transform: 'translateX(-50%)',
            };
          case 'left':
            return {
              top: rect.top + rect.height / 2,
              right: window.innerWidth - rect.left + 12,
              transform: 'translateY(-50%)',
            };
          case 'right':
            return {
              top: rect.top + rect.height / 2,
              left: rect.right + 12,
              transform: 'translateY(-50%)',
            };
        }
      }
    }
    // Center position
    return {
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
    };
  };

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Highlight target element */}
      {step.targetSelector && (
        <TargetHighlight selector={step.targetSelector} />
      )}

      {/* Tutorial card */}
      <div
        className="absolute bg-card rounded-lg shadow-xl w-80 max-w-[90vw] z-10"
        style={getPositionStyles()}
      >
        {/* Arrow pointer */}
        {step.targetSelector && step.position === 'bottom' && (
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-card rotate-45" />
        )}

        {/* Progress indicator */}
        <div className="flex gap-1 px-4 pt-4">
          {TUTORIAL_STEPS.map((_, index) => (
            <div
              key={index}
              className={`h-1 flex-1 rounded-full ${
                index <= currentStep ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="font-semibold text-lg mb-2">{step.title}</h3>
          <p className="text-sm text-muted-foreground">{step.description}</p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 pb-4">
          <button
            onClick={onSkip}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Skip Tutorial
          </button>
          <div className="flex gap-2">
            {!isFirstStep && (
              <button
                onClick={handlePrevious}
                className="px-3 py-1.5 text-sm rounded-md hover:bg-muted"
              >
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md"
            >
              {isLastStep ? 'Get Started' : 'Next'}
            </button>
          </div>
        </div>

        {/* Step counter */}
        <div className="text-center pb-3 text-xs text-muted-foreground">
          {currentStep + 1} of {TUTORIAL_STEPS.length}
        </div>
      </div>
    </div>
  );
}

// Component to highlight target element
function TargetHighlight({ selector }: { selector: string }) {
  const target = document.querySelector(selector);
  if (!target) return null;

  const rect = target.getBoundingClientRect();
  const padding = 8;

  return (
    <div
      className="absolute bg-transparent ring-4 ring-primary ring-offset-2 rounded-md z-5 pointer-events-none"
      style={{
        top: rect.top - padding,
        left: rect.left - padding,
        width: rect.width + padding * 2,
        height: rect.height + padding * 2,
      }}
    />
  );
}
