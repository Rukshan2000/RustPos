import React, { useState, useEffect, useRef } from 'react';
import { Lock, X } from 'lucide-react';
import { api } from '../api';
import { useKiosk } from '../contexts/KioskContext';
import { useTranslation } from 'react-i18next';

const KioskExitDialog: React.FC = () => {
  const { isKioskActive, exitKiosk } = useKiosk();
  const [showDialog, setShowDialog] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();

  // Listen for Ctrl+Shift+K to open dialog
  useEffect(() => {
    if (!isKioskActive) return;
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && (e.key === 'K' || e.key === 'k')) {
        e.preventDefault();
        setShowDialog(true);
        setPin('');
        setError('');
      }
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [isKioskActive]);

  useEffect(() => {
    if (showDialog && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showDialog]);

  const handleVerify = async () => {
    if (!pin.trim()) return;
    setLoading(true);
    setError('');
    try {
      const valid = await api.verifyKioskPin(pin);
      if (valid) {
        setShowDialog(false);
        setPin('');
        await exitKiosk();
      } else {
        setError(t('kiosk_invalid_pin'));
        setPin('');
      }
    } catch {
      setError(t('kiosk_pin_error'));
    } finally {
      setLoading(false);
    }
  };

  if (!isKioskActive || !showDialog) return null;

  return (
    <>
      <style>{`
        .kiosk-overlay {
          position: fixed;
          inset: 0;
          z-index: 99999;
          background: rgba(0,0,0,0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(6px);
        }
        .kiosk-dialog {
          background: #f5f0e8;
          border: 2px solid #ddd8cc;
          border-radius: 1.5rem;
          padding: 2.5rem 2rem;
          width: 360px;
          font-family: 'Nunito', sans-serif;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        .kiosk-dialog-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1.5rem;
        }
        .kiosk-dialog-title {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 1.1rem;
          font-weight: 800;
          color: #1a3528;
        }
        .kiosk-close-btn {
          background: transparent;
          border: none;
          color: #7a9e8a;
          cursor: pointer;
          padding: 0.25rem;
          border-radius: 0.5rem;
          transition: background 0.12s;
        }
        .kiosk-close-btn:hover {
          background: rgba(0,0,0,0.06);
          color: #1a3528;
        }
        .kiosk-pin-input {
          width: 100%;
          padding: 0.85rem 1rem;
          background: #edeae0;
          border: 2px solid #ddd8cc;
          border-radius: 0.75rem;
          font-family: 'Nunito', sans-serif;
          font-size: 1.2rem;
          letter-spacing: 0.3em;
          text-align: center;
          color: #1a3528;
          outline: none;
          box-sizing: border-box;
          transition: border-color 0.12s;
        }
        .kiosk-pin-input:focus {
          border-color: #2d5a3d;
        }
        .kiosk-error {
          color: #c05050;
          font-size: 0.8rem;
          font-weight: 600;
          text-align: center;
          margin-top: 0.75rem;
        }
        .kiosk-submit-btn {
          width: 100%;
          margin-top: 1.25rem;
          padding: 0.85rem;
          background: #2d5a3d;
          border: none;
          border-radius: 0.75rem;
          color: #e8f4ec;
          font-family: 'Nunito', sans-serif;
          font-size: 0.95rem;
          font-weight: 800;
          cursor: pointer;
          transition: background 0.12s;
        }
        .kiosk-submit-btn:hover:not(:disabled) {
          background: #245033;
        }
        .kiosk-submit-btn:disabled {
          background: #7a9e8a;
          cursor: not-allowed;
        }
        .kiosk-hint {
          color: #7a9e8a;
          font-size: 0.72rem;
          text-align: center;
          margin-top: 1rem;
        }
      `}</style>
      <div className="kiosk-overlay">
        <div className="kiosk-dialog">
          <div className="kiosk-dialog-header">
            <div className="kiosk-dialog-title">
              <Lock size={18} /> {t('kiosk_exit_title')}
            </div>
            <button className="kiosk-close-btn" onClick={() => setShowDialog(false)}>
              <X size={18} />
            </button>
          </div>
          <input
            ref={inputRef}
            type="password"
            className="kiosk-pin-input"
            placeholder="••••••"
            value={pin}
            onChange={e => setPin(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleVerify(); }}
            maxLength={20}
            autoComplete="off"
          />
          {error && <div className="kiosk-error">{error}</div>}
          <button
            className="kiosk-submit-btn"
            onClick={handleVerify}
            disabled={loading || !pin.trim()}
          >
            {loading ? t('loading') : t('kiosk_unlock')}
          </button>
          <div className="kiosk-hint">{t('kiosk_exit_hint')}</div>
        </div>
      </div>
    </>
  );
};

export default KioskExitDialog;
