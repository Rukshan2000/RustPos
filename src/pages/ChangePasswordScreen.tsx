import React, { useState } from 'react';
import { api } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { useKiosk } from '../contexts/KioskContext';
import { ShieldCheck, Lock, Eye, EyeOff } from 'lucide-react';

interface Props {
  username: string;
  oldPassword: string;
}

const ChangePasswordScreen: React.FC<Props> = ({ username, oldPassword }) => {
  const { login } = useAuth();
  const { isKioskActive } = useKiosk();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 4) { setError('Password must be at least 4 characters.'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return; }
    if (newPassword === oldPassword) { setError('New password must be different from your current password.'); return; }
    setLoading(true); setError('');
    try {
      await api.changePassword(username, oldPassword, newPassword);
      const user = await api.login(username, newPassword);
      login(user);
    } catch (err: any) {
      setError(err || 'Failed to change password.');
    } finally { setLoading(false); }
  };

  return (
    <>
      <style>{`
        

        .cp-root {
          min-height: ${isKioskActive ? '100vh' : 'calc(100vh - 44px)'};
          background: #2d5a3d;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          font-family: 'Nunito', sans-serif;
          position: relative;
        }

        .cp-root::before {
          content: '';
          position: fixed;
          inset: 0;
          background:
            radial-gradient(ellipse 70% 60% at 30% 20%, rgba(255,255,255,0.04) 0%, transparent 60%),
            radial-gradient(ellipse 50% 50% at 80% 80%, rgba(0,0,0,0.15) 0%, transparent 60%);
          pointer-events: none;
        }

        .cp-card {
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

        .cp-top-accent {
          position: absolute;
          top: 0;
          left: 15%;
          right: 15%;
          height: 3px;
          background: #c07a20;
          border-radius: 0 0 3px 3px;
        }

        .cp-logo-wrap {
          text-align: center;
          margin-bottom: 1.75rem;
        }

        .cp-logo-icon {
          width: 62px;
          height: 62px;
          background: #c07a20;
          border-radius: 1.25rem;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1rem;
          box-shadow: 0 4px 16px rgba(192,122,32,0.3);
        }

        .cp-title {
          color: #1a3528;
          font-size: 1.45rem;
          font-weight: 800;
          margin: 0 0 0.4rem;
          letter-spacing: -0.01em;
        }

        .cp-subtitle {
          color: #7a9e8a;
          font-size: 0.825rem;
          font-weight: 500;
          margin: 0;
          line-height: 1.55;
        }

        .cp-divider {
          border: none;
          border-top: 1.5px solid #e0d8cc;
          margin: 0 0 1.75rem;
        }

        .cp-error {
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

        .cp-field-label {
          display: block;
          color: #6b7f73;
          font-size: 0.78rem;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          margin-bottom: 0.45rem;
        }

        .cp-field-wrap {
          position: relative;
          margin-bottom: 1.1rem;
        }

        .cp-field-icon {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: #9ab5a4;
          display: flex;
          align-items: center;
          pointer-events: none;
        }

        .cp-input {
          width: 100%;
          padding: 0.85rem 3rem 0.85rem 2.75rem;
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

        .cp-input::placeholder { color: #b8b0a4; }
        .cp-input:focus { border-color: #2d5a3d; background: #e8e4d8; }

        .cp-toggle-btn {
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

        .cp-toggle-btn:hover { color: #2d5a3d; }

        .cp-submit-btn {
          width: 100%;
          margin-top: 0.5rem;
          padding: 0.9rem;
          background: #c07a20;
          color: #fff8ee;
          border: none;
          border-radius: 0.875rem;
          font-size: 0.975rem;
          font-weight: 700;
          font-family: 'Nunito', sans-serif;
          cursor: pointer;
          letter-spacing: 0.01em;
          transition: background 0.15s, transform 0.1s;
          box-shadow: 0 4px 14px rgba(192,122,32,0.3);
        }

        .cp-submit-btn:hover:not(:disabled) {
          background: #a86818;
          transform: translateY(-1px);
        }

        .cp-submit-btn:disabled {
          background: #c8a878;
          cursor: not-allowed;
          box-shadow: none;
        }

        .cp-footer {
          color: #b0a898;
          font-size: 0.72rem;
          text-align: center;
          margin-top: 1.75rem;
          font-weight: 500;
        }
      `}</style>

      <div className="cp-root">
        <div className="cp-card">
          <div className="cp-top-accent" />

          <div className="cp-logo-wrap">
            <div className="cp-logo-icon">
              <ShieldCheck size={28} color="#fff8ee" />
            </div>
            <h1 className="cp-title">Change Your Password</h1>
            <p className="cp-subtitle">
              You're using the default password.<br />Please set a new one to continue.
            </p>
          </div>

          <hr className="cp-divider" />

          <form onSubmit={handleSubmit}>
            {error && <div className="cp-error">{error}</div>}

            <div>
              <label className="cp-field-label">New Password</label>
              <div className="cp-field-wrap">
                <span className="cp-field-icon"><Lock size={15} /></span>
                <input
                  type={showNew ? 'text' : 'password'}
                  className="cp-input"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  autoFocus
                />
                <button type="button" className="cp-toggle-btn" onClick={() => setShowNew(s => !s)}>
                  {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div>
              <label className="cp-field-label">Confirm Password</label>
              <div className="cp-field-wrap">
                <span className="cp-field-icon"><Lock size={15} /></span>
                <input
                  type={showConfirm ? 'text' : 'password'}
                  className="cp-input"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                />
                <button type="button" className="cp-toggle-btn" onClick={() => setShowConfirm(s => !s)}>
                  {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="cp-submit-btn">
              {loading ? 'Saving...' : 'Set New Password & Continue'}
            </button>
          </form>

          <p className="cp-footer">NyxoPos · Secure Offline POS</p>
        </div>
      </div>
    </>
  );
};

export default ChangePasswordScreen;