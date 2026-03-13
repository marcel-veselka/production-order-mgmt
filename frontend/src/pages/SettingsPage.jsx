import React, { useState, useEffect, useCallback } from 'react';
import { useNotification } from '../context/NotificationContext';

const TABS = [
  { key: 'users', label: 'Users', endpoint: '/api/users', fields: ['name', 'email', 'role', 'password'] },
  { key: 'production-lines', label: 'Production Lines', endpoint: '/api/production-lines', fields: ['name', 'location', 'status', 'capacity'] },
  { key: 'products', label: 'Products', endpoint: '/api/products', fields: ['name', 'category', 'unit'] },
];

const FIELD_CONFIG = {
  name: { label: 'Name', type: 'text', required: true },
  email: { label: 'Email', type: 'email', required: true },
  role: { label: 'Role', type: 'select', options: ['admin', 'supervisor', 'operator'], required: true },
  password: { label: 'Password', type: 'password', required: false },
  status: { label: 'Status', type: 'select', options: ['active', 'inactive', 'maintenance'], required: true },
  location: { label: 'Location', type: 'text', required: true },
  capacity: { label: 'Capacity', type: 'number', required: false },
  category: { label: 'Category', type: 'text', required: true },
  unit: { label: 'Unit', type: 'select', options: ['pcs', 'kg', 'liters', 'meters'], required: true },
};

export default function SettingsPage() {
  const { addNotification } = useNotification();
  const [activeTab, setActiveTab] = useState('users');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [showDeleteDialog, setShowDeleteDialog] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const token = localStorage.getItem('token');
  const tab = TABS.find((t) => t.key === activeTab);

  const fetchItems = useCallback(() => {
    setLoading(true);
    fetch(tab.endpoint, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setItems(Array.isArray(data) ? data : data[tab.key.replace('-', '')] || data.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [activeTab]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const openAdd = () => {
    setEditItem(null);
    const initial = {};
    tab.fields.forEach((f) => (initial[f] = ''));
    setFormData(initial);
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    const data = {};
    tab.fields.forEach((f) => {
      if (f === 'password') {
        data[f] = '';
      } else {
        data[f] = item[f] || '';
      }
    });
    setFormData(data);
    setShowModal(true);
  };

  const handleSave = async () => {
    setSubmitting(true);
    try {
      const url = editItem ? `${tab.endpoint}/${editItem.id}` : tab.endpoint;
      const method = editItem ? 'PUT' : 'POST';
      const body = { ...formData };
      if (body.password === '') delete body.password;

      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Save failed');
      addNotification(`${editItem ? 'Updated' : 'Created'} successfully`, 'success');
      setShowModal(false);
      fetchItems();
    } catch (err) {
      addNotification(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    setSubmitting(true);
    try {
      const res = await fetch(`${tab.endpoint}/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Delete failed');
      addNotification('Deleted successfully', 'success');
      setShowDeleteDialog(null);
      fetchItems();
    } catch (err) {
      addNotification(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const renderFieldInput = (fieldKey) => {
    const config = FIELD_CONFIG[fieldKey];
    if (!config) return null;

    const id = `settings-${fieldKey}`;

    if (config.type === 'select') {
      return (
        <div className="form-group" key={fieldKey}>
          <label htmlFor={id}>{config.label}</label>
          <select
            id={id}
            value={formData[fieldKey] || ''}
            onChange={(e) => setFormData({ ...formData, [fieldKey]: e.target.value })}
            aria-required={config.required}
          >
            <option value="">Select {config.label}</option>
            {config.options.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      );
    }

    return (
      <div className="form-group" key={fieldKey}>
        <label htmlFor={id}>{config.label}</label>
        <input
          id={id}
          type={config.type}
          value={formData[fieldKey] || ''}
          onChange={(e) => setFormData({ ...formData, [fieldKey]: e.target.value })}
          placeholder={`Enter ${config.label.toLowerCase()}`}
          aria-required={config.required}
        />
      </div>
    );
  };

  return (
    <div className="settings-page">
      <div className="tabs" role="tablist" aria-label="Settings tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={activeTab === t.key}
            className={`tab ${activeTab === t.key ? 'tab-active' : ''}`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="card" role="tabpanel" aria-label={`${tab.label} settings`}>
        <div className="toolbar">
          <h3 className="card-title">{tab.label}</h3>
          <button className="btn btn-primary" onClick={openAdd} aria-label={`Add new ${tab.label.slice(0, -1)}`}>
            Add {tab.label.slice(0, -1).replace(/ie$/, 'y').replace(/se$/, 'se')}
          </button>
        </div>

        <table className="data-table" aria-label={`${tab.label} list`}>
          <thead>
            <tr>
              {tab.fields.filter((f) => f !== 'password').map((f) => (
                <th key={f}>{FIELD_CONFIG[f]?.label || f}</th>
              ))}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={tab.fields.length + 1} className="empty-state">Loading...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={tab.fields.length + 1} className="empty-state">No items found</td></tr>
            ) : (
              items.map((item) => (
                <tr key={item.id}>
                  {tab.fields.filter((f) => f !== 'password').map((f) => (
                    <td key={f}>
                      {f === 'role' || f === 'status' ? (
                        <span className={`status-badge status-${item[f]}`}>{item[f]}</span>
                      ) : (
                        item[f] || '-'
                      )}
                    </td>
                  ))}
                  <td>
                    <div className="table-actions">
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => openEdit(item)}
                        aria-label={`Edit ${item.name}`}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => setShowDeleteDialog(item)}
                        aria-label={`Delete ${item.name}`}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={editItem ? 'Edit item' : 'Add item'}>
          <div className="modal">
            <h3 className="modal-title">{editItem ? 'Edit' : 'Add'} {tab.label.slice(0, -1)}</h3>
            <div className="modal-body">
              {tab.fields.map((f) => renderFieldInput(f))}
            </div>
            <div className="modal-actions">
              <button
                className="btn btn-primary"
                onClick={handleSave}
                disabled={submitting}
                aria-label="Save"
              >
                {submitting ? 'Saving...' : 'Save'}
              </button>
              <button
                className="btn btn-outline"
                onClick={() => setShowModal(false)}
                aria-label="Cancel"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteDialog && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Confirm delete">
          <div className="modal">
            <h3 className="modal-title">Confirm Delete</h3>
            <p>Are you sure you want to delete "{showDeleteDialog.name}"? This action cannot be undone.</p>
            <div className="modal-actions">
              <button
                className="btn btn-danger"
                onClick={() => handleDelete(showDeleteDialog.id)}
                disabled={submitting}
                aria-label="Confirm delete"
              >
                Delete
              </button>
              <button
                className="btn btn-outline"
                onClick={() => setShowDeleteDialog(null)}
                aria-label="Cancel delete"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
