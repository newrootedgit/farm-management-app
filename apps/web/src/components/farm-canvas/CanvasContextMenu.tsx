import { useEffect, useRef } from 'react';
import {
  ArrowUpToLine,
  ArrowUp,
  ArrowDown,
  ArrowDownToLine,
  Trash2,
} from 'lucide-react';
import { useCanvasStore } from '@/stores/canvas-store';

interface ContextMenuPosition {
  x: number;
  y: number;
  elementId: string;
}

interface CanvasContextMenuProps {
  position: ContextMenuPosition | null;
  onClose: () => void;
}

export function CanvasContextMenu({ position, onClose }: CanvasContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const {
    bringToFront,
    sendToBack,
    bringForward,
    sendBackward,
    deleteElement,
    elements,
  } = useCanvasStore();

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  if (!position) return null;

  const elementIndex = elements.findIndex((e) => e.id === position.elementId);
  const isAtTop = elementIndex === elements.length - 1;
  const isAtBottom = elementIndex === 0;

  const menuItems = [
    {
      label: 'Bring to Front',
      icon: ArrowUpToLine,
      onClick: () => {
        bringToFront(position.elementId);
        onClose();
      },
      disabled: isAtTop,
    },
    {
      label: 'Bring Forward',
      icon: ArrowUp,
      onClick: () => {
        bringForward(position.elementId);
        onClose();
      },
      disabled: isAtTop,
    },
    {
      label: 'Send Backward',
      icon: ArrowDown,
      onClick: () => {
        sendBackward(position.elementId);
        onClose();
      },
      disabled: isAtBottom,
    },
    {
      label: 'Send to Back',
      icon: ArrowDownToLine,
      onClick: () => {
        sendToBack(position.elementId);
        onClose();
      },
      disabled: isAtBottom,
    },
    { type: 'separator' as const },
    {
      label: 'Delete',
      icon: Trash2,
      onClick: () => {
        deleteElement(position.elementId);
        onClose();
      },
      danger: true,
    },
  ];

  // Adjust position to keep menu within viewport
  const menuWidth = 180;
  const menuHeight = 220;
  let adjustedX = position.x;
  let adjustedY = position.y;

  if (typeof window !== 'undefined') {
    if (position.x + menuWidth > window.innerWidth) {
      adjustedX = window.innerWidth - menuWidth - 10;
    }
    if (position.y + menuHeight > window.innerHeight) {
      adjustedY = window.innerHeight - menuHeight - 10;
    }
  }

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-popover border rounded-lg shadow-lg py-1 min-w-[160px]"
      style={{
        left: adjustedX,
        top: adjustedY,
      }}
    >
      {menuItems.map((item, index) => {
        if ('type' in item && item.type === 'separator') {
          return <div key={index} className="h-px bg-border my-1" />;
        }

        const Icon = item.icon;
        return (
          <button
            key={item.label}
            onClick={item.onClick}
            disabled={item.disabled}
            className={`
              w-full flex items-center gap-2 px-3 py-2 text-sm text-left
              transition-colors
              ${item.disabled
                ? 'text-muted-foreground cursor-not-allowed'
                : item.danger
                  ? 'text-destructive hover:bg-destructive/10'
                  : 'hover:bg-muted'
              }
            `}
          >
            <Icon className="w-4 h-4" />
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
