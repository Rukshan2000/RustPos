import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

export type KeyboardLayout = 'full' | 'numeric' | 'password' | 'search';

interface VirtualKeyboardContextType {
  enabled: boolean;
  setEnabled: (v: boolean) => void;
  isOpen: boolean;
  activeInput: HTMLInputElement | HTMLTextAreaElement | null;
  layout: KeyboardLayout;
  openKeyboard: (input: HTMLInputElement | HTMLTextAreaElement, layout?: KeyboardLayout) => void;
  closeKeyboard: () => void;
}

const VirtualKeyboardContext = createContext<VirtualKeyboardContextType | undefined>(undefined);

function detectLayout(el: HTMLInputElement | HTMLTextAreaElement): KeyboardLayout {
  if (el instanceof HTMLTextAreaElement) return 'full';
  const type = el.type?.toLowerCase() || 'text';
  if (type === 'password') return 'password';
  if (type === 'number' || type === 'tel') return 'numeric';
  if (type === 'search' || el.getAttribute('role') === 'searchbox') return 'search';
  // Check for data attribute override
  const override = el.dataset.keyboardLayout as KeyboardLayout | undefined;
  if (override && ['full', 'numeric', 'password', 'search'].includes(override)) return override;
  return 'full';
}

export const VirtualKeyboardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [enabled, setEnabledRaw] = useState<boolean>(() => {
    const stored = localStorage.getItem('virtualKeyboardEnabled');
    return stored === 'true';
  });
  const [isOpen, setIsOpen] = useState(false);
  const [activeInput, setActiveInput] = useState<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const [layout, setLayout] = useState<KeyboardLayout>('full');

  const setEnabled = useCallback((v: boolean) => {
    setEnabledRaw(v);
    localStorage.setItem('virtualKeyboardEnabled', v ? 'true' : 'false');
    if (!v) {
      setIsOpen(false);
      setActiveInput(null);
    }
  }, []);

  const openKeyboard = useCallback((input: HTMLInputElement | HTMLTextAreaElement, overrideLayout?: KeyboardLayout) => {
    if (!enabled) return;
    setActiveInput(input);
    setLayout(overrideLayout || detectLayout(input));
    setIsOpen(true);
  }, [enabled]);

  const closeKeyboard = useCallback(() => {
    setIsOpen(false);
    setActiveInput(null);
  }, []);

  // Global focus/blur listeners
  useEffect(() => {
    if (!enabled) return;

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement
      ) {
        // Skip select elements, checkboxes, radio, file, hidden, color, range, date inputs
        if (target instanceof HTMLInputElement) {
          const skip = ['checkbox', 'radio', 'file', 'hidden', 'color', 'range', 'date', 'datetime-local', 'month', 'week', 'time', 'submit', 'reset', 'button', 'image'];
          if (skip.includes(target.type)) return;
        }
        // Skip inputs with data-no-virtual-keyboard
        if (target.dataset.noVirtualKeyboard === 'true') return;
        openKeyboard(target);
      }
    };

    const handleFocusOut = (e: FocusEvent) => {
      const related = e.relatedTarget;
      // Don't close if focus moves to the virtual keyboard itself
      if (related instanceof HTMLElement && related.closest('[data-virtual-keyboard]')) {
        return;
      }
      // Small delay to allow click events on keyboard to fire
      setTimeout(() => {
        const ae = document.activeElement;
        if (ae instanceof HTMLElement && ae.closest('[data-virtual-keyboard]')) return;
        if (!(ae instanceof HTMLInputElement) && !(ae instanceof HTMLTextAreaElement)) {
          closeKeyboard();
        }
      }, 100);
    };

    document.addEventListener('focusin', handleFocusIn, true);
    document.addEventListener('focusout', handleFocusOut, true);

    return () => {
      document.removeEventListener('focusin', handleFocusIn, true);
      document.removeEventListener('focusout', handleFocusOut, true);
    };
  }, [enabled, openKeyboard, closeKeyboard]);

  return (
    <VirtualKeyboardContext.Provider value={{ enabled, setEnabled, isOpen, activeInput, layout, openKeyboard, closeKeyboard }}>
      {children}
    </VirtualKeyboardContext.Provider>
  );
};

export const useVirtualKeyboard = () => {
  const ctx = useContext(VirtualKeyboardContext);
  if (!ctx) throw new Error('useVirtualKeyboard must be used within VirtualKeyboardProvider');
  return ctx;
};
