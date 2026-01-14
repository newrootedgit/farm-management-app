import { useState, useEffect } from 'react';

interface TutorialCelebrationProps {
  stepTitle: string;
  onComplete: () => void;
}

// Generate random confetti particles
function generateConfetti(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 0.5,
    duration: 1 + Math.random() * 1,
    color: ['#22c55e', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6'][Math.floor(Math.random() * 5)],
    size: 6 + Math.random() * 6,
  }));
}

export function TutorialCelebration({ stepTitle, onComplete }: TutorialCelebrationProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [confetti] = useState(() => generateConfetti(30));

  useEffect(() => {
    // Trigger enter animation
    requestAnimationFrame(() => {
      setIsVisible(true);
    });

    // Auto-dismiss after animation completes
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 300);
    }, 2500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[200] pointer-events-none flex items-center justify-center">
      {/* Confetti */}
      <div className="absolute inset-0 overflow-hidden">
        {confetti.map((particle) => (
          <div
            key={particle.id}
            className="absolute animate-confetti"
            style={{
              left: `${particle.x}%`,
              top: '-20px',
              width: particle.size,
              height: particle.size,
              backgroundColor: particle.color,
              borderRadius: Math.random() > 0.5 ? '50%' : '2px',
              animationDelay: `${particle.delay}s`,
              animationDuration: `${particle.duration}s`,
            }}
          />
        ))}
      </div>

      {/* Celebration Card */}
      <div
        className={`
          relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6
          transform transition-all duration-500 ease-out
          ${isVisible ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}
        `}
      >
        {/* Animated Checkmark */}
        <div className="flex justify-center mb-4">
          <div className={`
            w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30
            flex items-center justify-center
            ${isVisible ? 'animate-bounce-once' : ''}
          `}>
            <svg
              className={`w-10 h-10 text-green-500 ${isVisible ? 'animate-checkmark' : ''}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path
                d="M5 13l4 4L19 7"
                className="checkmark-path"
                style={{
                  strokeDasharray: 24,
                  strokeDashoffset: isVisible ? 0 : 24,
                  transition: 'stroke-dashoffset 0.4s ease-out 0.2s',
                }}
              />
            </svg>
          </div>
        </div>

        {/* Text */}
        <div className="text-center">
          <p className="text-sm font-medium text-green-600 dark:text-green-400 mb-1">
            Step Complete!
          </p>
          <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {stepTitle}
          </p>
        </div>

        {/* Sparkle decorations */}
        <div className="absolute -top-2 -left-2 text-yellow-400 animate-pulse">
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
          </svg>
        </div>
        <div className="absolute -bottom-2 -right-2 text-yellow-400 animate-pulse" style={{ animationDelay: '0.3s' }}>
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
          </svg>
        </div>
      </div>

      {/* CSS for custom animations */}
      <style>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }

        @keyframes bounce-once {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.1);
          }
        }

        .animate-confetti {
          animation: confetti-fall linear forwards;
        }

        .animate-bounce-once {
          animation: bounce-once 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}
