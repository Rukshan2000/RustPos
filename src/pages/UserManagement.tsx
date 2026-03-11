import React, { useState, useEffect } from 'react';
import { api, UserPublic } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { Users, Plus, Edit2, Trash2, KeyRound, Shield, ShoppingCart, X, Check, Ban } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const UserManagement: React.FC = () => {
  const { currentUser } = useAuth();
  const { notify, alertCustom, confirmCustom } = useNotifications();
  const { t } = useTranslation();
  const [users, setUsers] = useState<UserPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showAdd, setShowAdd] = useState(false);
  const [addUsername, setAddUsername] = useState('');
  const [addPassword, setAddPassword] = useState('');
  const [addRole, setAddRole] = useState<'admin' | 'cashier'>('cashier');
  const [addError, setAddError] = useState('');

  const [editUser, setEditUser] = useState<UserPublic | null>(null);
  const [editRole, setEditRole] = useState<'admin' | 'cashier'>('cashier');
  const [editActive, setEditActive] = useState(true);

  const [resetUser, setResetUser] = useState<UserPublic | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetError, setResetError] = useState('');

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    setLoading(true);
    try { const data = await api.getUsers(); setUsers(data); }
    catch (e: any) { setError(e || t('err_load_users')); }
    finally { setLoading(false); }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault(); setAddError('');
    try {
      await api.addUser(addUsername.trim(), addPassword, addRole);
      setShowAdd(false); setAddUsername(''); setAddPassword(''); setAddRole('cashier');
      loadUsers();
    } catch (e: any) { setAddError(e || t('err_add_user')); }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!editUser) return;
    try { await api.updateUser(editUser.id, editRole, editActive); setEditUser(null); loadUsers(); }
    catch (e: any) { alertCustom(e || t('err_update_user'), t('update_error'), "error"); }
  };

  const handleDelete = (user: UserPublic) => {
    confirmCustom(`${t('confirm_delete_user')} "${user.username}"${t('confirm_delete_undo')}`, async () => {
      try { await api.deleteUser(user.id); loadUsers(); notify(`${t('user_deleted')} ${user.username}`, "info"); }
      catch (e: any) { alertCustom(e || t('err_delete_user'), t('delete_error'), "error"); }
    }, t('delete'), "error");
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault(); if (!resetUser) return; setResetError('');
    try {
      await api.resetUserPassword(resetUser.id, resetPassword);
      setResetUser(null); setResetPassword('');
      alertCustom(`${t('password_reset_success')} ${resetUser.username}${t('password_reset_success_2')}`, t('password_reset'), "success");
    } catch (e: any) { setResetError(e || t('err_reset_password')); }
  };

  const openEdit = (user: UserPublic) => { setEditUser(user); setEditRole(user.role); setEditActive(user.is_active); };

  if (currentUser?.role !== 'admin') {
    return <div style={{ padding: '2rem', color: '#7a9e8a', fontFamily: 'Nunito, sans-serif' }}>{t('access_denied')}</div>;
  }

  return (
    <>
      <style>{`
        

        .um-root {
          font-family: 'Nunito', sans-serif;
          animation: fadeIn 0.25s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .um-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1.75rem;
        }

        .um-title {
          font-size: 1.85rem;
          font-weight: 800;
          color: #1a3528;
          letter-spacing: -0.02em;
          margin: 0 0 0.2rem;
        }

        .um-subtitle {
          color: #7a9e8a;
          font-size: 0.875rem;
          font-weight: 500;
          margin: 0;
        }

        .um-add-btn {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          padding: 0.65rem 1.25rem;
          background: #2d5a3d;
          border: none;
          border-radius: 0.75rem;
          font-family: 'Nunito', sans-serif;
          font-size: 0.875rem;
          font-weight: 700;
          color: #e8f4ec;
          cursor: pointer;
          transition: background 0.12s, transform 0.1s;
          box-shadow: 0 3px 10px rgba(45,90,61,0.25);
        }

        .um-add-btn:hover { background: #245033; transform: translateY(-1px); }

        .um-error {
          background: #fdf0f0;
          border: 1.5px solid #e8c0c0;
          border-radius: 0.625rem;
          padding: 0.65rem 1rem;
          color: #c05050;
          font-size: 0.85rem;
          font-weight: 500;
          margin-bottom: 1rem;
        }

        /* Table */
        .um-table-wrap {
          background: #f5f0e8;
          border: 1.5px solid #ddd8cc;
          border-radius: 1.125rem;
          overflow: hidden;
        }

        .um-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.875rem;
        }

        .um-table thead tr {
          background: #edeae0;
          border-bottom: 1.5px solid #ddd8cc;
        }

        .um-table th {
          padding: 0.75rem 1.1rem;
          text-align: left;
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          color: #7a9e8a;
        }

        .um-table tbody tr {
          border-bottom: 1px solid #e8e4d8;
          transition: background 0.1s;
        }

        .um-table tbody tr:last-child { border-bottom: none; }
        .um-table tbody tr:hover { background: #edeae0; }

        .um-table td {
          padding: 0.8rem 1.1rem;
          vertical-align: middle;
          color: #1a3528;
        }

        /* Avatar */
        .um-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 0.875rem;
          flex-shrink: 0;
        }

        .um-avatar-admin { background: #2d5a3d; color: #e8f4ec; }
        .um-avatar-cashier { background: #e6ede8; color: #2d5a3d; }

        .um-username { font-weight: 700; color: #1a3528; }
        .um-you-tag { font-size: 0.68rem; color: #7a9e8a; font-weight: 600; }

        /* Role badges */
        .um-badge-admin {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          padding: 0.2rem 0.65rem;
          border-radius: 2rem;
          font-size: 0.72rem;
          font-weight: 700;
          background: #e6ede8;
          color: #2d5a3d;
        }

        .um-badge-cashier {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          padding: 0.2rem 0.65rem;
          border-radius: 2rem;
          font-size: 0.72rem;
          font-weight: 700;
          background: #edeae0;
          color: #5a7a6a;
        }

        .um-badge-active {
          display: inline-block;
          background: #e6ede8;
          color: #2d5a3d;
          border-radius: 0.4rem;
          padding: 0.2rem 0.65rem;
          font-size: 0.72rem;
          font-weight: 700;
        }

        .um-badge-inactive {
          display: inline-block;
          background: #fdf0f0;
          color: #c05050;
          border-radius: 0.4rem;
          padding: 0.2rem 0.65rem;
          font-size: 0.72rem;
          font-weight: 700;
        }

        .um-badge-default {
          display: inline-block;
          background: #fef9e8;
          color: #a07020;
          border: 1px solid #f0d890;
          border-radius: 0.4rem;
          padding: 0.2rem 0.6rem;
          font-size: 0.72rem;
          font-weight: 700;
        }

        /* Action buttons */
        .um-action-btn {
          background: #edeae0;
          border: 1.5px solid #ddd8cc;
          border-radius: 0.45rem;
          padding: 0.35rem 0.55rem;
          cursor: pointer;
          color: #5a7a6a;
          display: flex;
          align-items: center;
          transition: background 0.1s, border-color 0.1s, color 0.1s;
        }

        .um-action-btn:hover { background: #e6ede8; border-color: #2d5a3d; color: #1a3528; }

        .um-action-btn-del { color: #c8a0a0; }
        .um-action-btn-del:hover { background: #fdf0f0; border-color: #e8c0c0; color: #c05050; }

        /* Modal */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(26,53,40,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
          padding: 1.5rem;
          backdrop-filter: blur(2px);
        }

        .modal-card {
          background: #f5f0e8;
          border-radius: 1.5rem;
          padding: 2rem;
          width: 100%;
          max-width: 420px;
          box-shadow: 0 24px 48px rgba(0,0,0,0.18);
          border: 1.5px solid #ddd8cc;
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1.5rem;
        }

        .modal-title {
          font-size: 1.15rem;
          font-weight: 800;
          color: #1a3528;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .modal-close {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #edeae0;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #7a9e8a;
          cursor: pointer;
          flex-shrink: 0;
          transition: background 0.12s;
        }

        .modal-close:hover { background: #ddd8cc; color: #1a3528; }

        .modal-form-group {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
          margin-bottom: 1rem;
        }

        .modal-label {
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: #7a9e8a;
        }

        .modal-input {
          padding: 0.7rem 0.875rem;
          background: #edeae0;
          border: 1.5px solid #ddd8cc;
          border-radius: 0.625rem;
          font-family: 'Nunito', sans-serif;
          font-size: 0.9rem;
          color: #1a3528;
          outline: none;
          width: 100%;
          box-sizing: border-box;
          transition: border-color 0.12s;
        }

        .modal-input:focus { border-color: #2d5a3d; }
        .modal-input::placeholder { color: #b0a898; }

        .modal-select {
          padding: 0.7rem 0.875rem;
          background: #edeae0;
          border: 1.5px solid #ddd8cc;
          border-radius: 0.625rem;
          font-family: 'Nunito', sans-serif;
          font-size: 0.9rem;
          color: #1a3528;
          outline: none;
          width: 100%;
          box-sizing: border-box;
          cursor: pointer;
          transition: border-color 0.12s;
        }

        .modal-select:focus { border-color: #2d5a3d; }
        .modal-select:disabled { opacity: 0.5; cursor: not-allowed; }

        .modal-error {
          background: #fdf0f0;
          border: 1.5px solid #e8c0c0;
          border-radius: 0.5rem;
          padding: 0.6rem 0.875rem;
          color: #c05050;
          font-size: 0.82rem;
          font-weight: 500;
          margin-bottom: 0.75rem;
        }

        .modal-note {
          font-size: 0.85rem;
          color: #7a9e8a;
          font-weight: 500;
          margin-bottom: 1.25rem;
          line-height: 1.5;
        }

        .modal-actions {
          display: flex;
          gap: 0.75rem;
          margin-top: 1.25rem;
        }

        .modal-btn-cancel {
          flex: 1;
          padding: 0.8rem;
          background: transparent;
          border: 1.5px solid #ddd8cc;
          border-radius: 0.75rem;
          font-family: 'Nunito', sans-serif;
          font-size: 0.9rem;
          font-weight: 700;
          color: #7a9e8a;
          cursor: pointer;
          transition: background 0.12s;
        }

        .modal-btn-cancel:hover { background: #edeae0; }

        .modal-btn-confirm {
          flex: 1;
          padding: 0.8rem;
          background: #2d5a3d;
          border: none;
          border-radius: 0.75rem;
          font-family: 'Nunito', sans-serif;
          font-size: 0.9rem;
          font-weight: 800;
          color: #e8f4ec;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          transition: background 0.12s;
          box-shadow: 0 3px 10px rgba(45,90,61,0.25);
        }

        .modal-btn-confirm:hover { background: #245033; }

        /* Status toggle */
        .status-toggle-row {
          display: flex;
          gap: 0.6rem;
        }

        .status-btn {
          flex: 1;
          padding: 0.65rem;
          border-radius: 0.625rem;
          font-family: 'Nunito', sans-serif;
          font-size: 0.85rem;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.35rem;
          transition: all 0.12s;
          border: 1.5px solid #ddd8cc;
          background: #edeae0;
          color: #7a9e8a;
        }

        .status-btn-active.selected {
          background: #2d5a3d;
          color: #e8f4ec;
          border-color: #2d5a3d;
        }

        .status-btn-inactive.selected {
          background: #fdf0f0;
          color: #c05050;
          border-color: #e8c0c0;
        }

        .status-btn:disabled { opacity: 0.45; cursor: not-allowed; }
      `}</style>

      <div className="um-root">
        {/* Header */}
        <div className="um-header">
          <div>
            <h1 className="um-title">{t('user_management')}</h1>
            <p className="um-subtitle">{t('user_management_subtitle')}</p>
          </div>
          <button className="um-add-btn" onClick={() => setShowAdd(true)}>
            <Plus size={16} /> {t('add_user')}
          </button>
        </div>

        {error && <div className="um-error">{error}</div>}

        {/* Table */}
        <div className="um-table-wrap">
          <table className="um-table">
            <thead>
              <tr>
                <th>{t('username')}</th>
                <th>{t('role')}</th>
                <th>{t('status')}</th>
                <th>{t('password')}</th>
                <th>{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', color: '#b0a898', padding: '2.5rem', fontWeight: 600 }}>{t('loading')}</td></tr>
              ) : users.map((user: UserPublic) => (
                <tr key={user.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div className={`um-avatar ${user.role === 'admin' ? 'um-avatar-admin' : 'um-avatar-cashier'}`}>
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="um-username">{user.username}</div>
                        {user.id === currentUser?.id && <div className="um-you-tag">{t('you')}</div>}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={user.role === 'admin' ? 'um-badge-admin' : 'um-badge-cashier'}>
                      {user.role === 'admin' ? <Shield size={11} /> : <ShoppingCart size={11} />}
                      {user.role === 'admin' ? t('admin') : t('cashier')}
                    </span>
                  </td>
                  <td>
                    <span className={user.is_active ? 'um-badge-active' : 'um-badge-inactive'}>
                      {user.is_active ? t('active') : t('inactive')}
                    </span>
                  </td>
                  <td>
                    {user.is_default_password && (
                      <span className="um-badge-default">{t('default_pass')}</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      <button className="um-action-btn" onClick={() => openEdit(user)} title={t('edit')}><Edit2 size={14} /></button>
                      <button className="um-action-btn" onClick={() => { setResetUser(user); setResetPassword(''); setResetError(''); }} title={t('reset_password')}><KeyRound size={14} /></button>
                      {user.id !== currentUser?.id && (
                        <button className="um-action-btn um-action-btn-del" onClick={() => handleDelete(user)} title={t('delete')}><Trash2 size={14} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Add User Modal */}
        {showAdd && (
          <div className="modal-overlay">
            <div className="modal-card">
              <div className="modal-header">
                <h2 className="modal-title"><Users size={16} /> {t('add_user')}</h2>
                <button className="modal-close" onClick={() => { setShowAdd(false); setAddError(''); }}><X size={16} /></button>
              </div>
              <form onSubmit={handleAdd}>
                {addError && <div className="modal-error">{addError}</div>}
                <div className="modal-form-group">
                  <label className="modal-label">{t('username')}</label>
                  <input className="modal-input" value={addUsername} onChange={e => setAddUsername(e.target.value)} placeholder={t('eg_cashier')} required autoFocus />
                </div>
                <div className="modal-form-group">
                  <label className="modal-label">{t('password')}</label>
                  <input className="modal-input" type="password" value={addPassword} onChange={e => setAddPassword(e.target.value)} placeholder={t('min_4_chars')} required />
                </div>
                <div className="modal-form-group">
                  <label className="modal-label">{t('role')}</label>
                  <select className="modal-select" value={addRole} onChange={e => setAddRole(e.target.value as any)}>
                    <option value="cashier">{t('cashier')}</option>
                    <option value="admin">{t('admin')}</option>
                  </select>
                </div>
                <div className="modal-actions">
                  <button type="button" className="modal-btn-cancel" onClick={() => setShowAdd(false)}>{t('cancel')}</button>
                  <button type="submit" className="modal-btn-confirm"><Check size={15} /> {t('create_user')}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit User Modal */}
        {editUser && (
          <div className="modal-overlay">
            <div className="modal-card">
              <div className="modal-header">
                <h2 className="modal-title"><Edit2 size={16} /> {t('edit')} "{editUser.username}"</h2>
                <button className="modal-close" onClick={() => setEditUser(null)}><X size={16} /></button>
              </div>
              <form onSubmit={handleEdit}>
                <div className="modal-form-group">
                  <label className="modal-label">{t('role')}</label>
                  <select className="modal-select" value={editRole} onChange={e => setEditRole(e.target.value as any)} disabled={editUser.id === currentUser?.id}>
                    <option value="cashier">{t('cashier')}</option>
                    <option value="admin">{t('admin')}</option>
                  </select>
                </div>
                <div className="modal-form-group">
                  <label className="modal-label">{t('status')}</label>
                  <div className="status-toggle-row">
                    <button
                      type="button"
                      className={`status-btn status-btn-active ${editActive ? 'selected' : ''}`}
                      onClick={() => setEditActive(true)}
                      disabled={editUser.id === currentUser?.id}
                    >
                      <Check size={14} /> {t('active')}
                    </button>
                    <button
                      type="button"
                      className={`status-btn status-btn-inactive ${!editActive ? 'selected' : ''}`}
                      onClick={() => setEditActive(false)}
                      disabled={editUser.id === currentUser?.id}
                    >
                      <Ban size={14} /> {t('inactive')}
                    </button>
                  </div>
                </div>
                <div className="modal-actions">
                  <button type="button" className="modal-btn-cancel" onClick={() => setEditUser(null)}>{t('cancel')}</button>
                  <button type="submit" className="modal-btn-confirm">{t('save_changes')}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Reset Password Modal */}
        {resetUser && (
          <div className="modal-overlay">
            <div className="modal-card">
              <div className="modal-header">
                <h2 className="modal-title"><KeyRound size={16} /> {t('reset_password')}</h2>
                <button className="modal-close" onClick={() => setResetUser(null)}><X size={16} /></button>
              </div>
              <p className="modal-note">
                {t('password_reset_success')} <strong style={{ color: '#1a3528' }}>{resetUser.username}</strong> {t('reset_pass_note')}
              </p>
              <form onSubmit={handleReset}>
                {resetError && <div className="modal-error">{resetError}</div>}
                <div className="modal-form-group">
                  <label className="modal-label">{t('new_temp_password')}</label>
                  <input className="modal-input" type="password" value={resetPassword} onChange={e => setResetPassword(e.target.value)} placeholder={t('min_4_chars')} required autoFocus />
                </div>
                <div className="modal-actions">
                  <button type="button" className="modal-btn-cancel" onClick={() => setResetUser(null)}>{t('cancel')}</button>
                  <button type="submit" className="modal-btn-confirm">{t('reset_password')}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default UserManagement;