import { useState, useEffect } from 'react';
import { useEscapeKey } from '@/hooks/useEscapeKey';

export interface TourStep {
  title: string;
  description: string;
  targetSelector?: string;
  position: 'center' | 'top' | 'bottom' | 'left' | 'right';
  highlightPadding?: number;
}

interface TutorialGuidedTourProps {
  steps: TourStep[];
  onComplete: () => void;
  onSkip: () => void;
}

export function TutorialGuidedTour({ steps, onComplete, onSkip }: TutorialGuidedTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  // Close on ESC key
  useEscapeKey(true, onSkip);

  const step = steps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;

  // Update target rect when step changes
  useEffect(() => {
    let scrollTimeout: ReturnType<typeof setTimeout>;

    const updateTargetRect = () => {
      if (step.targetSelector) {
        const target = document.querySelector(step.targetSelector);
        if (target) {
          setTargetRect(target.getBoundingClientRect());
        } else {
          setTargetRect(null);
        }
      } else {
        setTargetRect(null);
      }
    };

    // Scroll target into view when step changes
    if (step.targetSelector) {
      const target = document.querySelector(step.targetSelector);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Wait for scroll to complete before measuring rect
        scrollTimeout = setTimeout(updateTargetRect, 350);
      } else {
        updateTargetRect();
      }
    } else {
      updateTargetRect();
    }

    // Update on scroll or resize
    window.addEventListener('scroll', updateTargetRect, true);
    window.addEventListener('resize', updateTargetRect);

    return () => {
      window.removeEventListener('scroll', updateTargetRect, true);
      window.removeEventListener('resize', updateTargetRect);
      if (scrollTimeout) clearTimeout(scrollTimeout);
    };
  }, [step.targetSelector, currentStep]);

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

  // Calculate position styles for the tooltip with viewport boundary checking
  const getPositionStyles = (): React.CSSProperties => {
    const tooltipWidth = 320; // w-80 = 20rem = 320px
    const tooltipHeight = 200; // Approximate height
    const margin = 16; // Minimum margin from viewport edges
    const gap = 12; // Gap between target and tooltip

    if (targetRect) {
      let top: number | undefined;
      let left: number | undefined;
      let right: number | undefined;
      let bottom: number | undefined;
      let transform = '';

      switch (step.position) {
        case 'bottom': {
          top = targetRect.bottom + gap;
          left = targetRect.left + targetRect.width / 2;
          transform = 'translateX(-50%)';

          // Check if tooltip goes off right edge
          const rightEdge = left + tooltipWidth / 2;
          if (rightEdge > window.innerWidth - margin) {
            left = window.innerWidth - margin - tooltipWidth / 2;
          }
          // Check if tooltip goes off left edge
          const leftEdge = left - tooltipWidth / 2;
          if (leftEdge < margin) {
            left = margin + tooltipWidth / 2;
          }
          // If tooltip goes off bottom, flip to top
          if (top + tooltipHeight > window.innerHeight - margin) {
            top = undefined;
            bottom = window.innerHeight - targetRect.top + gap;
          }
          break;
        }
        case 'top': {
          bottom = window.innerHeight - targetRect.top + gap;
          left = targetRect.left + targetRect.width / 2;
          transform = 'translateX(-50%)';

          // Check horizontal boundaries
          const rightEdge = left + tooltipWidth / 2;
          if (rightEdge > window.innerWidth - margin) {
            left = window.innerWidth - margin - tooltipWidth / 2;
          }
          const leftEdge = left - tooltipWidth / 2;
          if (leftEdge < margin) {
            left = margin + tooltipWidth / 2;
          }
          // If tooltip goes off top, flip to bottom
          if (window.innerHeight - bottom - tooltipHeight < margin) {
            bottom = undefined;
            top = targetRect.bottom + gap;
          }
          break;
        }
        case 'left': {
          top = targetRect.top + targetRect.height / 2;
          right = window.innerWidth - targetRect.left + gap;
          transform = 'translateY(-50%)';

          // Check if tooltip goes off left edge
          if (window.innerWidth - right - tooltipWidth < margin) {
            // Flip to right side
            right = undefined;
            left = targetRect.right + gap;
            // If right side also doesn't fit, position below
            if (left + tooltipWidth > window.innerWidth - margin) {
              left = targetRect.left + targetRect.width / 2;
              top = targetRect.bottom + gap;
              transform = 'translateX(-50%)';
            }
          }
          // Check vertical boundaries
          const topEdge = top - tooltipHeight / 2;
          if (topEdge < margin) {
            top = margin + tooltipHeight / 2;
          }
          const bottomEdge = top + tooltipHeight / 2;
          if (bottomEdge > window.innerHeight - margin) {
            top = window.innerHeight - margin - tooltipHeight / 2;
          }
          break;
        }
        case 'right': {
          top = targetRect.top + targetRect.height / 2;
          left = targetRect.right + gap;
          transform = 'translateY(-50%)';

          // Check if tooltip goes off right edge
          if (left + tooltipWidth > window.innerWidth - margin) {
            // Flip to left side
            left = undefined;
            right = window.innerWidth - targetRect.left + gap;
            // If left side also doesn't fit, position below
            if (window.innerWidth - right - tooltipWidth < margin) {
              right = undefined;
              left = targetRect.left + targetRect.width / 2;
              top = targetRect.bottom + gap;
              transform = 'translateX(-50%)';
            }
          }
          // Check vertical boundaries
          const topEdge = top - tooltipHeight / 2;
          if (topEdge < margin) {
            top = margin + tooltipHeight / 2;
          }
          const bottomEdge = top + tooltipHeight / 2;
          if (bottomEdge > window.innerHeight - margin) {
            top = window.innerHeight - margin - tooltipHeight / 2;
          }
          break;
        }
      }

      return { top, left, right, bottom, transform };
    }

    // Center position (fallback)
    return {
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
    };
  };

  // Get arrow styles
  const getArrowStyles = (): React.CSSProperties | null => {
    if (!targetRect || step.position === 'center') return null;

    const baseStyles: React.CSSProperties = {
      position: 'absolute',
      width: 16,
      height: 16,
      background: 'inherit',
      transform: 'rotate(45deg)',
    };

    switch (step.position) {
      case 'bottom':
        return { ...baseStyles, top: -8, left: '50%', marginLeft: -8 };
      case 'top':
        return { ...baseStyles, bottom: -8, left: '50%', marginLeft: -8 };
      case 'left':
        return { ...baseStyles, right: -8, top: '50%', marginTop: -8 };
      case 'right':
        return { ...baseStyles, left: -8, top: '50%', marginTop: -8 };
      default:
        return null;
    }
  };

  const arrowStyles = getArrowStyles();
  const padding = step.highlightPadding ?? 8;

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onSkip} />

      {/* Highlight target element */}
      {targetRect && (
        <div
          className="absolute bg-transparent ring-4 ring-primary ring-offset-2 rounded-md pointer-events-none"
          style={{
            top: targetRect.top - padding,
            left: targetRect.left - padding,
            width: targetRect.width + padding * 2,
            height: targetRect.height + padding * 2,
            zIndex: 101,
          }}
        />
      )}

      {/* Tutorial card */}
      <div
        className="absolute bg-card rounded-lg shadow-xl w-80 max-w-[90vw]"
        style={{ ...getPositionStyles(), zIndex: 102 }}
      >
        {/* Arrow pointer */}
        {arrowStyles && <div className="bg-card" style={arrowStyles} />}

        {/* Progress indicator */}
        <div className="flex gap-1 px-4 pt-4">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`h-1 flex-1 rounded-full transition-colors ${
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
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip
          </button>
          <div className="flex gap-2">
            {!isFirstStep && (
              <button
                onClick={handlePrevious}
                className="px-3 py-1.5 text-sm rounded-md hover:bg-muted transition-colors"
              >
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              {isLastStep ? 'Done' : 'Next'}
            </button>
          </div>
        </div>

        {/* Step counter */}
        <div className="text-center pb-3 text-xs text-muted-foreground">
          {currentStep + 1} of {steps.length}
        </div>
      </div>
    </div>
  );
}
