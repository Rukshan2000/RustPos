import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { availableMonitors, currentMonitor } from '@tauri-apps/api/window';
import type { Monitor } from '@tauri-apps/api/window';

export interface CustomerDisplayItem {
  name: string;
  quantity: number;
  unit: string;
  price: number;
  discountValue: number;
  discountType: 'percentage' | 'fixed';
}

export interface CustomerDisplayData {
  type: 'cart-update' | 'sale-complete' | 'idle';
  items: CustomerDisplayItem[];
  rawSubtotal: number;
  totalProductDiscount: number;
  billDiscount: number;
  finalTotal: number;
  currency: string;
  shopName: string;
  logoUrl: string | null;
  footerText: string | null;
}

export type CustomerDisplayMode = 'disabled' | 'auto' | 'manual';

interface CustomerDisplayContextType {
  displayMode: CustomerDisplayMode;
  setDisplayMode: (mode: CustomerDisplayMode) => void;
  selectedMonitorIndex: number;
  setSelectedMonitorIndex: (idx: number) => void;
  monitors: Monitor[];
  refreshMonitors: () => Promise<void>;
  isDisplayOpen: boolean;
  openCustomerDisplay: () => Promise<void>;
  closeCustomerDisplay: () => Promise<void>;
  broadcastCartUpdate: (data: CustomerDisplayData) => void;
  broadcastSaleComplete: (data: CustomerDisplayData) => void;
  broadcastIdle: (currency: string, shopName: string, logoUrl: string | null, footerText: string | null) => void;
}

const CustomerDisplayContext = createContext<CustomerDisplayContextType | undefined>(undefined);

const CHANNEL_NAME = 'smartpos-customer-display';
const DISPLAY_LABEL = 'customer-display';
const SETTINGS_KEY = 'customerDisplaySettings';

export const CustomerDisplayProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [displayMode, setDisplayModeState] = useState<CustomerDisplayMode>('disabled');
  const [selectedMonitorIndex, setSelectedMonitorIndexState] = useState<number>(1);
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [isDisplayOpen, setIsDisplayOpen] = useState(false);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const windowRef = useRef<WebviewWindow | null>(null);

  // Load saved settings from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.displayMode) setDisplayModeState(parsed.displayMode);
        if (typeof parsed.selectedMonitorIndex === 'number') setSelectedMonitorIndexState(parsed.selectedMonitorIndex);
      }
    } catch { /* ignore */ }
  }, []);

  // Save settings to localStorage
  const setDisplayMode = useCallback((mode: CustomerDisplayMode) => {
    setDisplayModeState(mode);
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    saved.displayMode = mode;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(saved));
  }, []);

  const setSelectedMonitorIndex = useCallback((idx: number) => {
    setSelectedMonitorIndexState(idx);
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    saved.selectedMonitorIndex = idx;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(saved));
  }, []);

  // Initialize BroadcastChannel
  useEffect(() => {
    channelRef.current = new BroadcastChannel(CHANNEL_NAME);
    return () => {
      channelRef.current?.close();
    };
  }, []);

  // Detect monitors
  const refreshMonitors = useCallback(async () => {
    try {
      const mons = await availableMonitors();
      setMonitors(mons);
    } catch (err) {
      console.error('Failed to detect monitors:', err);
    }
  }, []);

  useEffect(() => {
    refreshMonitors();
  }, [refreshMonitors]);

  const openCustomerDisplay = useCallback(async () => {
    // Check if window already exists
    const existing = await WebviewWindow.getByLabel(DISPLAY_LABEL);
    if (existing) {
      await existing.setFocus();
      setIsDisplayOpen(true);
      return;
    }

    let targetMonitor: Monitor | null = null;

    if (displayMode === 'auto') {
      // Auto: pick the first monitor that isn't the current one
      const current = await currentMonitor();
      const allMons = await availableMonitors();
      targetMonitor = allMons.find(m => m.name !== current?.name) || null;
    } else if (displayMode === 'manual') {
      const allMons = await availableMonitors();
      targetMonitor = allMons[selectedMonitorIndex] || null;
    }

    const x = targetMonitor ? targetMonitor.position.x : 0;
    const y = targetMonitor ? targetMonitor.position.y : 0;
    const width = targetMonitor ? targetMonitor.size.width : 1024;
    const height = targetMonitor ? targetMonitor.size.height : 768;

    const webview = new WebviewWindow(DISPLAY_LABEL, {
      url: '/customer-display',
      title: 'Customer Display',
      x,
      y,
      width,
      height,
      decorations: false,
      fullscreen: true,
      resizable: false,
      alwaysOnTop: true,
      skipTaskbar: true,
    });

    webview.once('tauri://created', () => {
      setIsDisplayOpen(true);
      windowRef.current = webview;
    });

    webview.once('tauri://error', (e) => {
      console.error('Failed to create customer display window:', e);
    });

    webview.once('tauri://destroyed', () => {
      setIsDisplayOpen(false);
      windowRef.current = null;
    });
  }, [displayMode, selectedMonitorIndex]);

  const closeCustomerDisplay = useCallback(async () => {
    const existing = await WebviewWindow.getByLabel(DISPLAY_LABEL);
    if (existing) {
      await existing.close();
    }
    setIsDisplayOpen(false);
    windowRef.current = null;
  }, []);

  const broadcastCartUpdate = useCallback((data: CustomerDisplayData) => {
    channelRef.current?.postMessage({ ...data, type: 'cart-update' });
  }, []);

  const broadcastSaleComplete = useCallback((data: CustomerDisplayData) => {
    channelRef.current?.postMessage({ ...data, type: 'sale-complete' });
  }, []);

  const broadcastIdle = useCallback((currency: string, shopName: string, logoUrl: string | null, footerText: string | null) => {
    channelRef.current?.postMessage({
      type: 'idle',
      items: [],
      rawSubtotal: 0,
      totalProductDiscount: 0,
      billDiscount: 0,
      finalTotal: 0,
      currency,
      shopName,
      logoUrl,
      footerText,
    } as CustomerDisplayData);
  }, []);

  return (
    <CustomerDisplayContext.Provider value={{
      displayMode,
      setDisplayMode,
      selectedMonitorIndex,
      setSelectedMonitorIndex,
      monitors,
      refreshMonitors,
      isDisplayOpen,
      openCustomerDisplay,
      closeCustomerDisplay,
      broadcastCartUpdate,
      broadcastSaleComplete,
      broadcastIdle,
    }}>
      {children}
    </CustomerDisplayContext.Provider>
  );
};

export const useCustomerDisplay = () => {
  const context = useContext(CustomerDisplayContext);
  if (context === undefined) {
    throw new Error('useCustomerDisplay must be used within a CustomerDisplayProvider');
  }
  return context;
};
