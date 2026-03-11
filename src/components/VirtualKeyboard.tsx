import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useVirtualKeyboard } from '../contexts/VirtualKeyboardContext';

// ── Key Layouts (Windows-style rows) ─────────────────────────

const ALPHA_ROW1 = ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'];
const ALPHA_ROW2 = ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', '"'];
const ALPHA_ROW3 = ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '?'];

const SYM_ROW1 = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
const SYM_ROW2 = ['@', '#', '$', '%', '&', '*', '-', '+', '(', ')'];
const SYM_ROW3 = ['!', "'", ':', ';', '/', '\\', '|', '{', '}', '~'];

const NUMERIC_KEYS = [
  ['7', '8', '9'],
  ['4', '5', '6'],
  ['1', '2', '3'],
  ['.', '0', '-'],
];

// ── Helpers ──────────────────────────────────────────────────

function setNativeValue(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const nativeSetter = Object.getOwnPropertyDescriptor(
    el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,
    'value'
  )?.set;
  if (nativeSetter) {
    nativeSetter.call(el, value);
  } else {
    el.value = value;
  }
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

// ── Component ────────────────────────────────────────────────

const VirtualKeyboard: React.FC = () => {
  const { isOpen, activeInput, layout, closeKeyboard } = useVirtualKeyboard();
  const [shifted, setShifted] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [showSymbols, setShowSymbols] = useState(false);
  const kbRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setShifted(false);
      setCapsLock(false);
      setShowSymbols(layout === 'numeric');
    }
  }, [isOpen, activeInput, layout]);

  useEffect(() => {
    if (isOpen && kbRef.current) {
      // Wait for keyboard to render, then shrink the app viewport
      const timer = setTimeout(() => {
        const kbHeight = kbRef.current?.offsetHeight ?? 0;
        document.documentElement.style.setProperty('--vk-offset', `${kbHeight}px`);
      }, 30);
      return () => clearTimeout(timer);
    } else {
      document.documentElement.style.setProperty('--vk-offset', '0px');
    }
  }, [isOpen, activeInput]);

  const isUpperCase = capsLock !== shifted;

  const pressKey = useCallback((key: string) => {
    if (!activeInput) return;
    activeInput.focus();
    const start = activeInput.selectionStart ?? activeInput.value.length;
    const end = activeInput.selectionEnd ?? activeInput.value.length;
    const char = isUpperCase && /^[a-z]$/.test(key) ? key.toUpperCase() : key;
    const newVal = activeInput.value.slice(0, start) + char + activeInput.value.slice(end);
    setNativeValue(activeInput, newVal);
    activeInput.setSelectionRange(start + 1, start + 1);
    if (shifted && !capsLock) setShifted(false);
  }, [activeInput, isUpperCase, shifted, capsLock]);

  const handleBackspace = useCallback(() => {
    if (!activeInput) return;
    activeInput.focus();
    const start = activeInput.selectionStart ?? activeInput.value.length;
    const end = activeInput.selectionEnd ?? activeInput.value.length;
    const v = activeInput.value;
    if (start === end && start > 0) {
      setNativeValue(activeInput, v.slice(0, start - 1) + v.slice(end));
      activeInput.setSelectionRange(start - 1, start - 1);
    } else if (start !== end) {
      setNativeValue(activeInput, v.slice(0, start) + v.slice(end));
      activeInput.setSelectionRange(start, start);
    }
  }, [activeInput]);

  const handleClear = useCallback(() => {
    if (!activeInput) return;
    activeInput.focus();
    setNativeValue(activeInput, '');
    activeInput.setSelectionRange(0, 0);
  }, [activeInput]);

  const handleSpace = useCallback(() => { pressKey(' '); }, [pressKey]);

  const handleEnter = useCallback(() => {
    if (!activeInput) return;
    activeInput.focus();
    if (activeInput instanceof HTMLTextAreaElement) { pressKey('\n'); return; }
    const form = activeInput.form;
    if (form) {
      const inputs = Array.from(form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
        'input:not([type=hidden]):not([type=submit]):not([type=button]):not([disabled]), textarea:not([disabled])'
      ));
      const idx = inputs.indexOf(activeInput as any);
      if (idx >= 0 && idx < inputs.length - 1) { inputs[idx + 1].focus(); return; }
      form.requestSubmit?.();
    }
    closeKeyboard();
  }, [activeInput, pressKey, closeKeyboard]);

  const moveCursor = useCallback((dir: -1 | 1) => {
    if (!activeInput) return;
    activeInput.focus();
    const pos = (activeInput.selectionStart ?? 0) + dir;
    const clamped = Math.max(0, Math.min(pos, activeInput.value.length));
    activeInput.setSelectionRange(clamped, clamped);
  }, [activeInput]);

  const handleShift = useCallback(() => { setShifted(s => !s); }, []);
  const handleCapsLock = useCallback(() => { setCapsLock(c => !c); setShifted(false); }, []);
  const toggleSymbols = useCallback(() => { setShowSymbols(s => !s); }, []);

  const pd = useCallback((e: React.MouseEvent | React.TouchEvent) => { e.preventDefault(); }, []);

  if (!isOpen || !activeInput) return null;

  const isNumeric = layout === 'numeric';
  const row1 = showSymbols ? SYM_ROW1 : ALPHA_ROW1;
  const row2 = showSymbols ? SYM_ROW2 : ALPHA_ROW2;
  const row3 = showSymbols ? SYM_ROW3 : ALPHA_ROW3;

  const K = ({ k, flex }: { k: string; flex?: number }) => (
    <button style={{ ...S.key, flex: flex ?? 1 }} onMouseDown={pd} onClick={() => pressKey(k)}>
      {isUpperCase && /^[a-z]$/.test(k) ? k.toUpperCase() : k}
    </button>
  );

  return (
    <div ref={kbRef} data-virtual-keyboard="true" onMouseDown={pd} onTouchStart={pd} style={S.wrap}>
      {/* Close button row */}
      <div style={S.topBar}>
        <button style={S.closeBtn} onMouseDown={pd} onClick={closeKeyboard}>✕</button>
      </div>

      {isNumeric ? (
        /* ── Numeric Pad ── */
        <div style={S.numGrid}>
          {NUMERIC_KEYS.flat().map((k, i) => (
            <button key={i} style={S.numKey} onMouseDown={pd} onClick={() => pressKey(k)}>{k}</button>
          ))}
          <button style={{ ...S.numKey, ...S.fnKey }} onMouseDown={pd} onClick={handleClear}>CLR</button>
          <button style={{ ...S.numKey, ...S.fnKey }} onMouseDown={pd} onClick={handleBackspace}>⌫</button>
          <button style={{ ...S.numKey, ...S.enterKey }} onMouseDown={pd} onClick={handleEnter}>↵</button>
        </div>
      ) : (
        /* ── Full Keyboard (Windows style) ── */
        <div style={S.board}>
          {/* Row 1: letters + backspace */}
          <div style={S.row}>
            {row1.map((k, i) => <K key={i} k={k} />)}
            <button style={{ ...S.key, flex: 1.5, ...S.fnKey }} onMouseDown={pd} onClick={handleBackspace}>⌫</button>
          </div>

          {/* Row 2: letters + enter */}
          <div style={S.row}>
            {row2.map((k, i) => <K key={i} k={k} />)}
            <button style={{ ...S.key, flex: 1.5, ...S.enterKey }} onMouseDown={pd} onClick={handleEnter}>↵</button>
          </div>

          {/* Row 3: shift + letters + shift */}
          <div style={S.row}>
            <button
              style={{ ...S.key, flex: 1.2, ...S.fnKey, ...(shifted || capsLock ? S.activeKey : {}) }}
              onMouseDown={pd}
              onClick={handleShift}
            >⇧</button>
            {row3.map((k, i) => <K key={i} k={k} />)}
            <button
              style={{ ...S.key, flex: 1.2, ...S.fnKey, ...(shifted || capsLock ? S.activeKey : {}) }}
              onMouseDown={pd}
              onClick={handleShift}
            >⇧</button>
          </div>

          {/* Row 4: &123 | Ctrl | CLR | ____space____ | ← | → | Caps */}
          <div style={S.row}>
            <button style={{ ...S.key, flex: 1.3, ...S.fnKey }} onMouseDown={pd} onClick={toggleSymbols}>
              {showSymbols ? 'ABC' : '&123'}
            </button>
            <button style={{ ...S.key, flex: 1, ...S.fnKey }} onMouseDown={pd} onClick={handleClear}>CLR</button>
            <button style={{ ...S.key, flex: 5 }} onMouseDown={pd} onClick={handleSpace}> </button>
            <button style={{ ...S.key, flex: 0.8, ...S.fnKey }} onMouseDown={pd} onClick={() => moveCursor(-1)}>‹</button>
            <button style={{ ...S.key, flex: 0.8, ...S.fnKey }} onMouseDown={pd} onClick={() => moveCursor(1)}>›</button>
            <button
              style={{ ...S.key, flex: 1.2, ...S.fnKey, ...(capsLock ? S.activeKey : {}) }}
              onMouseDown={pd}
              onClick={handleCapsLock}
              title="Caps Lock"
            >⇪</button>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Styles ───────────────────────────────────────────────────

const S: Record<string, React.CSSProperties> = {
  wrap: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    background: '#1a1a1d',
    borderTop: '1px solid #333',
    boxShadow: '0 -2px 24px rgba(0,0,0,0.6)',
    animation: 'vk-slide-up 0.18s ease-out',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    padding: '6px 6px 10px',
  },
  topBar: {
    display: 'flex',
    justifyContent: 'flex-end',
    padding: '0 2px 4px',
  },
  closeBtn: {
    background: 'transparent',
    color: '#888',
    border: 'none',
    fontSize: '1.1rem',
    lineHeight: 1,
    padding: '4px 10px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    borderRadius: '4px',
  },
  board: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
  },
  row: {
    display: 'flex',
    gap: '5px',
  },
  key: {
    height: '54px',
    borderRadius: '5px',
    border: 'none',
    background: '#2d2d30',
    color: '#e8e8e8',
    fontSize: '1.15rem',
    fontWeight: 500,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'Segoe UI', 'Inter', system-ui, sans-serif",
    transition: 'background 0.08s',
    minWidth: 0,
  },
  fnKey: {
    background: '#252528',
    color: '#bcbcbc',
    fontSize: '1rem',
  },
  enterKey: {
    background: '#252528',
    color: '#bcbcbc',
    fontSize: '1.2rem',
  },
  activeKey: {
    background: '#4f46e5',
    color: '#fff',
  },

  // Numeric
  numGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '5px',
    maxWidth: '380px',
    margin: '0 auto',
  },
  numKey: {
    height: '62px',
    borderRadius: '5px',
    border: 'none',
    background: '#2d2d30',
    color: '#e8e8e8',
    fontSize: '1.5rem',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'Segoe UI', 'Inter', system-ui, sans-serif",
    transition: 'background 0.08s',
  },
};

export default VirtualKeyboard;
