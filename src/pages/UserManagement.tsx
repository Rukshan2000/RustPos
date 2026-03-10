import React, { useState, useEffect } from 'react';
import { api, UserPublic } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { Users, Plus, Edit2, Trash2, KeyRound, Shield, ShoppingCart, X, Check, Ban } from 'lucide-react';

const UserManagement: React.FC = () => {
  const { currentUser } = useAuth();
  const { notify, alertCustom, confirmCustom } = useNotifications();
  const [users, setUsers] = useState<UserPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Add user modal
  const [showAdd, setShowAdd] = useState(false);
  const [addUsername, setAddUsername] = useState('');
  const [addPassword, setAddPassword] = useState('');
  const [addRole, setAddRole] = useState<'admin' | 'cashier'>('cashier');
  const [addError, setAddError] = useState('');

  // Edit user modal
  const [editUser, setEditUser] = useState<UserPublic | null>(null);
  const [editRole, setEditRole] = useState<'admin' | 'cashier'>('cashier');
  const [editActive, setEditActive] = useState(true);

  // Reset password modal
  const [resetUser, setResetUser] = useState<UserPublic | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetError, setResetError] = useState('');

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await api.getUsers();
      setUsers(data);
    } catch (e: any) {
      setError(e || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');
    try {
      await api.addUser(addUsername.trim(), addPassword, addRole);
      setShowAdd(false);
      setAddUsername(''); setAddPassword(''); setAddRole('cashier');
      loadUsers();
    } catch (e: any) { setAddError(e || 'Failed to add user'); }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    try {
      await api.updateUser(editUser.id, editRole, editActive);
      setEditUser(null);
      loadUsers();
    } catch (e: any) { alertCustom(e || 'Failed to update user', "Update Error", "error"); }
  };

  const handleDelete = (user: UserPublic) => {
    confirmCustom(`Delete user "${user.username}"? This cannot be undone.`, async () => {
      try {
        await api.deleteUser(user.id);
        loadUsers();
        notify(`User ${user.username} deleted`, "info");
      } catch (e: any) { alertCustom(e || 'Failed to delete user', "Delete Error", "error"); }
    }, "Delete User", "error");
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetUser) return;
    setResetError('');
    try {
      await api.resetUserPassword(resetUser.id, resetPassword);
      setResetUser(null);
      setResetPassword('');
      alertCustom(`Password reset for ${resetUser.username}. They will need to set a new password on next login.`, "Password Reset", "success");
    } catch (e: any) { setResetError(e || 'Failed to reset password'); }
  };

  const openEdit = (user: UserPublic) => {
    setEditUser(user);
    setEditRole(user.role);
    setEditActive(user.is_active);
  };

  if (currentUser?.role !== 'admin') {
    return <div className="animate-fade-in" style={{ padding: '2rem', color: 'var(--text-muted)' }}>Access denied.</div>;
  }

  return (
    <div className="animate-fade-in">
      <div className="flex-between" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>User Management</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Manage system users, roles and access
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)} style={{ padding: '0.75rem 1.5rem' }}>
          <Plus size={18} /> Add User
        </button>
      </div>

      {error && <div style={{ color: 'var(--danger)', marginBottom: '1rem' }}>{error}</div>}

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Username</th>
              <th>Role</th>
              <th>Status</th>
              <th>Password</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>Loading...</td></tr>
            ) : users.map((user: UserPublic) => (
              <tr key={user.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '50%',
                      background: user.role === 'admin' ? 'var(--primary)' : '#e0e7ff',
                      color: user.role === 'admin' ? 'white' : 'var(--primary)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontSize: '0.875rem',
                    }}>
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600 }}>{user.username}</div>
                      {user.id === currentUser?.id && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>You</div>}
                    </div>
                  </div>
                </td>
                <td>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                    padding: '0.25rem 0.75rem', borderRadius: '2rem', fontSize: '0.75rem', fontWeight: 700,
                    background: user.role === 'admin' ? '#eef2ff' : '#ecfdf5',
                    color: user.role === 'admin' ? 'var(--primary)' : 'var(--success)',
                  }}>
                    {user.role === 'admin' ? <Shield size={12} /> : <ShoppingCart size={12} />}
                    {user.role === 'admin' ? 'Admin' : 'Cashier'}
                  </span>
                </td>
                <td>
                  <span className={`badge ${user.is_active ? 'badge-success' : 'badge-danger'}`}>
                    {user.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  {user.is_default_password && (
                    <span style={{ fontSize: '0.75rem', color: '#d97706', fontWeight: 600, background: '#fffbeb', padding: '0.2rem 0.6rem', borderRadius: '1rem', border: '1px solid #fde68a' }}>
                      ⚠ Default
                    </span>
                  )}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => openEdit(user)} title="Edit" className="btn-outline" style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem' }}>
                      <Edit2 size={13} />
                    </button>
                    <button onClick={() => { setResetUser(user); setResetPassword(''); setResetError(''); }} title="Reset Password" className="btn-outline" style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem' }}>
                      <KeyRound size={13} />
                    </button>
                    {user.id !== currentUser?.id && (
                      <button onClick={() => handleDelete(user)} title="Delete" className="btn-outline" style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem', color: 'var(--danger)' }}>
                        <Trash2 size={13} />
                      </button>
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
          <div className="modal-content" style={{ maxWidth: '420px' }}>
            <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}><Users size={18} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />Add User</h2>
              <button onClick={() => { setShowAdd(false); setAddError(''); }} style={{ background: 'var(--bg-main)', borderRadius: '50%', width: '32px', height: '32px' }}><X size={16} /></button>
            </div>
            <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {addError && <div style={{ color: 'var(--danger)', fontSize: '0.875rem' }}>{addError}</div>}
              <div className="grid-form">
                <label className="form-label">Username</label>
                <input value={addUsername} onChange={e => setAddUsername(e.target.value)} placeholder="e.g. cashier1" required />
              </div>
              <div className="grid-form">
                <label className="form-label">Password</label>
                <input type="password" value={addPassword} onChange={e => setAddPassword(e.target.value)} placeholder="Min. 4 characters" required />
              </div>
              <div className="grid-form">
                <label className="form-label">Role</label>
                <select value={addRole} onChange={e => setAddRole(e.target.value as any)}>
                  <option value="cashier">Cashier</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowAdd(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}><Check size={16} /> Create User</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editUser && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '380px' }}>
            <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Edit "{editUser.username}"</h2>
              <button onClick={() => setEditUser(null)} style={{ background: 'var(--bg-main)', borderRadius: '50%', width: '32px', height: '32px' }}><X size={16} /></button>
            </div>
            <form onSubmit={handleEdit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="grid-form">
                <label className="form-label">Role</label>
                <select value={editRole} onChange={e => setEditRole(e.target.value as any)} disabled={editUser.id === currentUser?.id}>
                  <option value="cashier">Cashier</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="grid-form">
                <label className="form-label">Status</label>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button type="button" onClick={() => setEditActive(true)} className={`btn ${editActive ? 'btn-primary' : 'btn-outline'}`} style={{ flex: 1, opacity: editUser.id === currentUser?.id ? 0.5 : 1 }} disabled={editUser.id === currentUser?.id}>
                    <Check size={14} /> Active
                  </button>
                  <button type="button" onClick={() => setEditActive(false)} className={`btn ${!editActive ? 'btn-outline' : 'btn-outline'}`} style={{ flex: 1, color: 'var(--danger)', opacity: editUser.id === currentUser?.id ? 0.5 : 1 }} disabled={editUser.id === currentUser?.id}>
                    <Ban size={14} /> Inactive
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setEditUser(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetUser && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '380px' }}>
            <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}><KeyRound size={18} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />Reset Password</h2>
              <button onClick={() => setResetUser(null)} style={{ background: 'var(--bg-main)', borderRadius: '50%', width: '32px', height: '32px' }}><X size={16} /></button>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Reset password for <strong>{resetUser.username}</strong>. They will be asked to change it on next login.
            </p>
            <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {resetError && <div style={{ color: 'var(--danger)', fontSize: '0.875rem' }}>{resetError}</div>}
              <div className="grid-form">
                <label className="form-label">New Temporary Password</label>
                <input type="password" value={resetPassword} onChange={e => setResetPassword(e.target.value)} placeholder="Min. 4 characters" required />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setResetUser(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Reset Password</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
