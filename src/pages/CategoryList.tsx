import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Tag } from 'lucide-react';
import { api, Category } from '../api';
import { useNotifications } from '../contexts/NotificationContext';

const CategoryList: React.FC = () => {
  const { notify, alertCustom, confirmCustom } = useNotifications();
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState('');

  useEffect(() => { loadCategories(); }, []);

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
    <>
      <style>{`
        

        .cl-root {
          font-family: 'Nunito', sans-serif;
          animation: fadeIn 0.25s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .cl-header { margin-bottom: 2rem; }

        .cl-title {
          font-size: 1.85rem;
          font-weight: 800;
          color: #1a3528;
          letter-spacing: -0.02em;
          margin: 0 0 0.25rem;
        }

        .cl-subtitle {
          color: #7a9e8a;
          font-size: 0.875rem;
          font-weight: 500;
          margin: 0;
        }

        .cl-grid {
          display: grid;
          grid-template-columns: 1fr 360px;
          gap: 1.5rem;
          align-items: start;
        }

        /* Table */
        .cl-table-wrap {
          background: #f5f0e8;
          border: 1.5px solid #ddd8cc;
          border-radius: 1.125rem;
          overflow: hidden;
        }

        .cl-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.875rem;
        }

        .cl-table thead tr {
          background: #edeae0;
          border-bottom: 1.5px solid #ddd8cc;
        }

        .cl-table th {
          padding: 0.75rem 1.1rem;
          text-align: left;
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          color: #7a9e8a;
        }

        .cl-table tbody tr {
          border-bottom: 1px solid #e8e4d8;
          transition: background 0.1s;
        }

        .cl-table tbody tr:last-child { border-bottom: none; }
        .cl-table tbody tr:hover { background: #edeae0; }

        .cl-table td {
          padding: 0.8rem 1.1rem;
          color: #1a3528;
          vertical-align: middle;
        }

        .cl-id {
          color: #b0a898;
          font-size: 0.75rem;
          font-weight: 700;
          font-family: monospace;
        }

        .cl-name {
          font-weight: 700;
          color: #1a3528;
          font-size: 0.9rem;
        }

        .cl-del-btn {
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 0.35rem;
          border-radius: 0.4rem;
          color: #c8a0a0;
          display: flex;
          align-items: center;
          transition: background 0.1s, color 0.1s;
        }

        .cl-del-btn:hover { background: #fdf0f0; color: #c05050; }

        /* Empty state */
        .cl-empty {
          text-align: center;
          color: #b0a898;
          padding: 4rem 2rem;
          font-size: 0.875rem;
          font-weight: 500;
        }

        /* Add card */
        .cl-add-card {
          background: #f5f0e8;
          border: 1.5px solid #ddd8cc;
          border-radius: 1.25rem;
          padding: 1.75rem;
        }

        .cl-add-title {
          font-size: 1.05rem;
          font-weight: 800;
          color: #1a3528;
          margin: 0 0 1.5rem;
          display: flex;
          align-items: center;
          gap: 0.6rem;
        }

        .cl-form-label {
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: #7a9e8a;
          display: block;
          margin-bottom: 0.4rem;
        }

        .cl-form-input {
          width: 100%;
          padding: 0.75rem 0.875rem;
          background: #edeae0;
          border: 1.5px solid #ddd8cc;
          border-radius: 0.625rem;
          font-family: 'Nunito', sans-serif;
          font-size: 0.9rem;
          color: #1a3528;
          outline: none;
          box-sizing: border-box;
          transition: border-color 0.12s;
        }

        .cl-form-input:focus { border-color: #2d5a3d; }
        .cl-form-input::placeholder { color: #b0a898; }

        .cl-submit-btn {
          width: 100%;
          margin-top: 1.25rem;
          padding: 0.875rem;
          background: #2d5a3d;
          border: none;
          border-radius: 0.75rem;
          font-family: 'Nunito', sans-serif;
          font-size: 0.95rem;
          font-weight: 800;
          color: #e8f4ec;
          cursor: pointer;
          transition: background 0.12s, transform 0.1s;
          box-shadow: 0 3px 10px rgba(45,90,61,0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.45rem;
        }

        .cl-submit-btn:hover { background: #245033; transform: translateY(-1px); }
      `}</style>

      <div className="cl-root">
        <div className="cl-header">
          <h1 className="cl-title">Categories</h1>
          <p className="cl-subtitle">Organize products into manageable groups</p>
        </div>

        <div className="cl-grid">
          {/* Table */}
          <div className="cl-table-wrap">
            <table className="cl-table">
              <thead>
                <tr>
                  <th style={{ width: '70px' }}>ID</th>
                  <th>Category Name</th>
                  <th style={{ width: '80px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map(cat => (
                  <tr key={cat.id}>
                    <td><span className="cl-id">#{cat.id}</span></td>
                    <td><span className="cl-name">{cat.name}</span></td>
                    <td style={{ textAlign: 'center' }}>
                      <button className="cl-del-btn" onClick={() => handleDelete(cat.id!)} title="Delete category">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {categories.length === 0 && (
                  <tr>
                    <td colSpan={3}>
                      <div className="cl-empty">
                        <Tag size={40} color="#ddd8cc" style={{ marginBottom: '0.75rem' }} />
                        <div>No categories created yet</div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Add card */}
          <div className="cl-add-card">
            <h2 className="cl-add-title">
              <Plus size={18} color="#2d5a3d" /> Add Category
            </h2>
            <form onSubmit={handleAdd}>
              <label className="cl-form-label">Category Name</label>
              <input
                required
                className="cl-form-input"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Beverages, Snacks..."
                autoFocus
              />
              <button type="submit" className="cl-submit-btn">
                <Plus size={16} /> Create Category
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default CategoryList;