import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useSettings } from './SettingsContext';

interface KioskContextType {
  isKioskActive: boolean;
  enterKiosk: () => Promise<void>;
  exitKiosk: () => Promise<void>;
  isIdle: boolean;
  resetIdleTimer: () => void;
}

const KioskContext = createContext<KioskContextType | undefined>(undefined);

export const KioskProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { settings } = useSettings();
  const [isKioskActive, setIsKioskActive] = useState(false);
  const [isIdle, setIsIdle] = useState(false);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const enterKiosk = useCallback(async () => {
    if (!('__TAURI_INTERNALS__' in window)) return;
    const appWindow = getCurrentWindow();
    await appWindow.setFullscreen(true);
    await appWindow.setResizable(false);
    await appWindow.setAlwaysOnTop(true);
    await appWindow.setClosable(false);
    setIsKioskActive(true);
  }, []);

  const exitKiosk = useCallback(async () => {
    if (!('__TAURI_INTERNALS__' in window)) return;
    const appWindow = getCurrentWindow();
    await appWindow.setFullscreen(false);
    await appWindow.setResizable(true);
    await appWindow.setAlwaysOnTop(false);
    await appWindow.setClosable(true);
    setIsKioskActive(false);
    setIsIdle(false);
  }, []);

  const resetIdleTimer = useCallback(() => {
    setIsIdle(false);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (!isKioskActive || !settings) return;
    const timeout = (settings.idle_timeout_minutes || 5) * 60 * 1000;
    idleTimerRef.current = setTimeout(() => setIsIdle(true), timeout);
  }, [isKioskActive, settings]);

  // Auto-start kiosk if setting is enabled
  useEffect(() => {
    if (settings?.auto_start_kiosk && settings?.kiosk_enabled && !isKioskActive) {
      enterKiosk();
    }
  }, [settings, enterKiosk, isKioskActive]);

  // Idle detection: listen for user activity
  useEffect(() => {
    if (!isKioskActive) return;
    const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll'];
    const handler = () => resetIdleTimer();
    events.forEach(e => window.addEventListener(e, handler, { passive: true }));
    resetIdleTimer();
    return () => {
      events.forEach(e => window.removeEventListener(e, handler));
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [isKioskActive, resetIdleTimer]);

  // Block keyboard shortcuts in kiosk mode
  useEffect(() => {
    if (!isKioskActive) return;
    const handler = (e: KeyboardEvent) => {
      // Block Alt+F4, Alt+Tab, Ctrl+W, F5, Ctrl+R, Ctrl+Shift+I (devtools)
      if (e.altKey && e.key === 'F4') { e.preventDefault(); e.stopPropagation(); return; }
      if (e.altKey && e.key === 'Tab') { e.preventDefault(); e.stopPropagation(); return; }
      if (e.ctrlKey && e.key === 'w') { e.preventDefault(); e.stopPropagation(); return; }
      if (e.key === 'F5') { e.preventDefault(); e.stopPropagation(); return; }
      if (e.ctrlKey && e.key === 'r') { e.preventDefault(); e.stopPropagation(); return; }
      if (e.ctrlKey && e.shiftKey && e.key === 'I') { e.preventDefault(); e.stopPropagation(); return; }
      if (e.ctrlKey && e.shiftKey && e.key === 'J') { e.preventDefault(); e.stopPropagation(); return; }
      if (e.key === 'F12') { e.preventDefault(); e.stopPropagation(); return; }
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [isKioskActive]);

  // Block right-click in kiosk mode
  useEffect(() => {
    if (!isKioskActive) return;
    const handler = (e: MouseEvent) => { e.preventDefault(); };
    window.addEventListener('contextmenu', handler, true);
    return () => window.removeEventListener('contextmenu', handler, true);
  }, [isKioskActive]);

  return (
    <KioskContext.Provider value={{ isKioskActive, enterKiosk, exitKiosk, isIdle, resetIdleTimer }}>
      {children}
    </KioskContext.Provider>
  );
};

export const useKiosk = () => {
  const context = useContext(KioskContext);
  if (context === undefined) {
    throw new Error('useKiosk must be used within a KioskProvider');
  }
  return context;
};
