import React, { useState } from 'react';
import { api } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { useKiosk } from '../contexts/KioskContext';
import { ShoppingBag, Lock, User, Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const LoginScreen: React.FC<{ onNeedPasswordChange: (username: string) => void }> = ({ onNeedPasswordChange }) => {
  const { login } = useAuth();
  const { isKioskActive } = useKiosk();
  const { t } = useTranslation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [logoClickCount, setLogoClickCount] = useState(0);
  const [showResetPopup, setShowResetPopup] = useState(false);
  const [resetPin, setResetPin] = useState('');
  const [resetError, setResetError] = useState('');

  const handleLogoClick = () => {
    const nextCount = logoClickCount + 1;
    setLogoClickCount(nextCount);

    if (nextCount >= 4) {
      setShowResetPopup(true);
      setResetPin('');
      setResetError('');
      setLogoClickCount(0);
      return;
    }

    // Reset the sequence if clicks are too slow.
    setTimeout(() => {
      setLogoClickCount(current => (current === nextCount ? 0 : current));
    }, 2000);
  };

  const handleResetWithPin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (loading) return;
    if (resetPin !== '1234') {
      setResetError('Invalid PIN.');
      return;
    }

    const confirmed = window.confirm(
      'WARNING: This will permanently delete all data and reset the application. Continue?'
    );
    if (!confirmed) return;

    setLoading(true);
    setResetError('');
    try {
      await api.resetDb();
      alert('Database reset complete. The app will now reload.');
      window.location.reload();
    } catch (err: any) {
      setResetError(`Failed to reset database: ${err || 'Unknown error'}`);
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError(t('please_enter_credentials'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      const user = await api.login(username.trim(), password);
      if (user.is_default_password) {
        onNeedPasswordChange(username.trim());
      } else {
        login(user);
      }
    } catch (err: any) {
      setError(err || t('login_failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        

        .login-root {
          min-height: ${isKioskActive ? 'calc(100vh - var(--vk-offset, 0px))' : 'calc(100vh - 44px - var(--vk-offset, 0px))'};
          background: #2d5a3d;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          font-family: 'Nunito', sans-serif;
          position: relative;
          overflow: hidden;
        }

        .login-root::before {
          content: '';
          position: fixed;
          inset: 0;
          background:
            radial-gradient(ellipse 70% 60% at 30% 20%, rgba(255,255,255,0.04) 0%, transparent 60%),
            radial-gradient(ellipse 50% 50% at 80% 80%, rgba(0,0,0,0.15) 0%, transparent 60%);
          pointer-events: none;
        }

        .login-card {
          background: #f5f0e8;
          border-radius: 1.75rem;
          padding: 2.75rem 2.5rem 2.5rem;
          width: 100%;
          max-width: 400px;
          position: relative;
          box-shadow:
            0 2px 0 rgba(255,255,255,0.6) inset,
            0 32px 64px rgba(0,0,0,0.22),
            0 8px 24px rgba(0,0,0,0.12);
        }

        .logo-wrap {
          text-align: center;
          margin-bottom: 2rem;
        }

        .logo-icon {
          width: 62px;
          height: 62px;
          background: #2d5a3d;
          border-radius: 1.25rem;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1rem;
          box-shadow: 0 4px 16px rgba(45,90,61,0.35);
        }

        .logo-title {
          color: #1a3528;
          font-size: 1.65rem;
          font-weight: 800;
          margin: 0;
          letter-spacing: -0.01em;
        }

        .logo-sub {
          color: #7a9e8a;
          font-size: 0.82rem;
          margin-top: 0.2rem;
          font-weight: 500;
        }

        .divider {
          border: none;
          border-top: 1.5px solid #e0d8cc;
          margin: 0 0 1.75rem;
        }

        .field-label {
          display: block;
          color: #6b7f73;
          font-size: 0.78rem;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          margin-bottom: 0.45rem;
        }

        .field-wrap {
          position: relative;
          margin-bottom: 1.1rem;
        }

        .field-icon {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: #9ab5a4;
          display: flex;
          align-items: center;
        }

        .field-input {
          width: 100%;
          padding: 0.85rem 1rem 0.85rem 2.75rem;
          background: #edeae0;
          border: 1.5px solid #ddd8cc;
          border-radius: 0.75rem;
          color: #1a3528;
          font-size: 0.95rem;
          font-family: 'Nunito', sans-serif;
          font-weight: 500;
          outline: none;
          box-sizing: border-box;
          transition: border-color 0.15s, background 0.15s;
        }

        .field-input::placeholder {
          color: #b8b0a4;
        }

        .field-input:focus {
          border-color: #2d5a3d;
          background: #e8e4d8;
        }

        .field-input-pr {
          padding-right: 3rem;
        }

        .toggle-btn {
          position: absolute;
          right: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: #9ab5a4;
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 0;
          display: flex;
          align-items: center;
        }

        .toggle-btn:hover {
          color: #2d5a3d;
        }

        .error-box {
          background: #fdf0f0;
          border: 1.5px solid #e8c0c0;
          border-radius: 0.75rem;
          padding: 0.7rem 1rem;
          color: #c05050;
          font-size: 0.85rem;
          text-align: center;
          margin-bottom: 1rem;
          font-weight: 500;
        }

        .submit-btn {
          width: 100%;
          margin-top: 0.5rem;
          padding: 0.9rem;
          background: #2d5a3d;
          color: #e8f4ec;
          border: none;
          border-radius: 0.875rem;
          font-size: 0.975rem;
          font-weight: 700;
          font-family: 'Nunito', sans-serif;
          cursor: pointer;
          letter-spacing: 0.01em;
          transition: background 0.15s, transform 0.1s;
          box-shadow: 0 4px 14px rgba(45,90,61,0.3);
        }

        .submit-btn:hover:not(:disabled) {
          background: #245033;
          transform: translateY(-1px);
        }

        .submit-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        .submit-btn:disabled {
          background: #7a9e8a;
          cursor: not-allowed;
          box-shadow: none;
        }

        .footer-text {
          color: #b0a898;
          font-size: 0.72rem;
          text-align: center;
          margin-top: 1.75rem;
          font-weight: 500;
        }

        .logo-click-target {
          cursor: pointer;
        }

        .reset-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.45);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
        }

        .reset-popup {
          width: 100%;
          max-width: 360px;
          background: #f5f0e8;
          border: 1.5px solid #ddd8cc;
          border-radius: 1rem;
          padding: 1.4rem;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.25);
        }

        .reset-title {
          margin: 0 0 0.4rem;
          color: #1a3528;
          font-size: 1.1rem;
          font-weight: 800;
        }

        .reset-sub {
          margin: 0 0 1rem;
          color: #7a9e8a;
          font-size: 0.84rem;
        }

        .reset-actions {
          margin-top: 1rem;
          display: flex;
          gap: 0.6rem;
        }

        .reset-cancel {
          flex: 1;
          padding: 0.72rem;
          border-radius: 0.7rem;
          border: 1.5px solid #ddd8cc;
          background: #edeae0;
          color: #6b7f73;
          font-weight: 700;
          cursor: pointer;
          font-family: 'Nunito', sans-serif;
        }

        .reset-confirm {
          flex: 1;
          padding: 0.72rem;
          border-radius: 0.7rem;
          border: none;
          background: #8f2d2d;
          color: #fff;
          font-weight: 700;
          cursor: pointer;
          font-family: 'Nunito', sans-serif;
        }

        .reset-confirm:disabled,
        .reset-cancel:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>

      <div className="login-root">
        <div className="login-card">
          <div className="logo-wrap">
            <div className="logo-icon logo-click-target" onClick={handleLogoClick}>
              <ShoppingBag size={28} color="#a8d4b8" />
            </div>
            <h1 className="logo-title">SmartPos</h1>
            <p className="logo-sub">{t('pos_system')}</p>
          </div>

          <hr className="divider" />

          <form onSubmit={handleSubmit}>
            {error && <div className="error-box">{error}</div>}

            <div>
              <label className="field-label">{t('username')}</label>
              <div className="field-wrap">
                <span className="field-icon"><User size={15} /></span>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder={t('enter_username')}
                  autoFocus
                  className="field-input"
                />
              </div>
            </div>

            <div>
              <label className="field-label">{t('password')}</label>
              <div className="field-wrap">
                <span className="field-icon"><Lock size={15} /></span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={t('enter_password')}
                  className="field-input field-input-pr"
                />
                <button
                  type="button"
                  className="toggle-btn"
                  onClick={() => setShowPassword(s => !s)}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="submit-btn">
              {loading ? t('signing_in') : t('login')}
            </button>
          </form>

          <p className="footer-text">SmartPos · {t('secure_offline_pos')}</p>
        </div>
      </div>

      {showResetPopup && (
        <div className="reset-overlay">
          <form className="reset-popup" onSubmit={handleResetWithPin}>
            <h2 className="reset-title">Reset Database</h2>
            <p className="reset-sub">Enter PIN to reset all data.</p>

            {resetError && <div className="error-box">{resetError}</div>}

            <input
              type="password"
              value={resetPin}
              onChange={e => setResetPin(e.target.value)}
              placeholder="Enter reset PIN"
              className="field-input"
              autoFocus
            />

            <div className="reset-actions">
              <button
                type="button"
                className="reset-cancel"
                onClick={() => {
                  if (loading) return;
                  setShowResetPopup(false);
                  setResetPin('');
                  setResetError('');
                }}
                disabled={loading}
              >
                Cancel
              </button>
              <button type="submit" className="reset-confirm" disabled={loading}>
                Reset
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
};

export default LoginScreen;