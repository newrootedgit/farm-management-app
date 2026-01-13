import { useEffect } from 'react';

/**
 * Hook to handle ESC key press to close modals/popups
 * @param isOpen - Whether the modal/popup is currently open
 * @param onClose - Callback to close the modal/popup
 */
export function useEscapeKey(isOpen: boolean, onClose: () => void) {
  useEffect(() => {
    if (!isOpen) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }
    }

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);
}
