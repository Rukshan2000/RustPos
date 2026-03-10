import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Tag } from 'lucide-react';
import { api, Category } from '../api';
import { useNotifications } from '../contexts/NotificationContext';

const CategoryList: React.FC = () => {
  const { notify, alertCustom, confirmCustom } = useNotifications();
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState('');

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    const data = await api.getCategories();
    setCategories(data);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await api.addCategory(name);
      setName('');
      loadCategories();
    } catch (err) {
      alertCustom("Error adding category: " + err, "Category Error", "error");
    }
  };

  const handleDelete = (id: number) => {
    confirmCustom("Are you sure? Products in this category will become uncategorized.", async () => {
      try {
        await api.deleteCategory(id);
        loadCategories();
        notify("Category deleted", "info");
      } catch (err) {
        alertCustom("Error: " + err, "Delete Error", "error");
      }
    }, "Delete Category", "warning");
  };

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)' }}>Categories</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Organize products into manageable groups</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '2.5rem', alignItems: 'start' }}>
        <div className="table-container shadow-sm">
          <table>
            <thead>
              <tr>
                <th style={{ width: '80px' }}>ID</th>
                <th>Category Name</th>
                <th style={{ width: '100px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map(cat => (
                <tr key={cat.id}>
                  <td style={{ color: 'var(--text-muted)', fontWeight: 600 }}>#{cat.id}</td>
                  <td style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.925rem' }}>{cat.name}</td>
                  <td style={{ textAlign: 'center' }}>
                    <button onClick={() => handleDelete(cat.id!)} className="btn-outline" style={{ color: 'var(--danger)', border: 'none', background: 'transparent', padding: '0.5rem' }}>
                      <Trash2 size={20} />
                    </button>
                  </td>
                </tr>
              ))}
              {categories.length === 0 && (
                <tr>
                  <td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '4rem 2rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                      <Tag size={48} opacity={0.1} />
                      <span>No categories created yet</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="card" style={{ padding: '2rem', background: 'white' }}>
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Plus size={20} color="var(--primary)" /> Add Category
            </h2>
          </div>
          <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="grid-form">
              <label className="form-label">Category Name</label>
              <input 
                required 
                className="w-full"
                value={name} 
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Beverages, Snacks..." 
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ padding: '0.875rem', borderRadius: '0.75rem', fontSize: '1rem' }}>
              Create Category
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CategoryList;
