import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

const STATUS_LABELS = {
  draft: 'Draft',
  submitted: 'Submitted',
  approved: 'Approved',
  in_production: 'In Production',
  quality_check: 'Quality Check',
  quality_hold: 'Quality Hold',
  completed: 'Completed',
};

export default function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addNotification } = useNotification();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [products, setProducts] = useState([]);

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetch('/api/products', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setProducts(Array.isArray(d) ? d : d.data || []))
      .catch(() => {});
  }, []);

  const fetchOrder = () => {
    setLoading(true);
    fetch(`/api/orders/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error('Not found');
        return r.json();
      })
      .then((data) => {
        const o = data.order || data;
        setOrder(o);
        setEditData({
          productId: o.productId || '',
          quantity: o.quantity || '',
          priority: o.priority || 'medium',
          dueDate: o.dueDate ? o.dueDate.slice(0, 10) : '',
          notes: o.notes || '',
        });
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
        addNotification('Order not found', 'error');
      });
  };

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const performAction = async (action) => {
    setActionLoading(true);
    try {
      // Map frontend action names (with hyphens) to backend action names (with underscores)
      const actionMap = {
        'start-production': 'start_production',
        'complete-production': 'complete_production',
        'quality-hold': 'quality_hold',
        'release': 'release_hold',
      };
      const backendAction = actionMap[action] || action;

      const res = await fetch(`/api/orders/${id}/transition`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: backendAction }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || err.message || 'Action failed');
      }
      addNotification(`Order ${action.replace(/-/g, ' ')} successful`, 'success');
      fetchOrder();
    } catch (err) {
      addNotification(err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editData),
      });
      if (!res.ok) throw new Error('Update failed');
      addNotification('Order updated', 'success');
      setEditing(false);
      fetchOrder();
    } catch (err) {
      addNotification(err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Delete failed');
      addNotification('Order deleted', 'success');
      navigate('/orders');
    } catch (err) {
      addNotification(err.message, 'error');
    } finally {
      setActionLoading(false);
      setShowDeleteDialog(false);
    }
  };

  if (loading) {
    return (
      <div className="order-detail">
        <div className="skeleton" style={{width: 120, height: 32, marginBottom: 16}}></div>
        <div className="skeleton skeleton-heading" style={{width: '30%'}}></div>
        <div className="order-detail-body">
          <div className="card">
            <div className="skeleton skeleton-heading"></div>
            <div className="detail-fields">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="detail-field">
                  <div className="skeleton skeleton-text-short" style={{width: '40%'}}></div>
                  <div className="skeleton skeleton-text" style={{width: '70%'}}></div>
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <div className="skeleton skeleton-heading"></div>
            {[1,2].map(i => <div key={i} className="skeleton" style={{height: 36, marginBottom: 8, borderRadius: 6}}></div>)}
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="error-page">
        <div className="error-page-icon">{'\u{1F50D}'}</div>
        <h2 className="error-page-title">Order not found</h2>
        <p className="error-page-message">The order you're looking for doesn't exist or has been deleted.</p>
        <button className="btn btn-primary" onClick={() => navigate('/orders')} aria-label="Back to orders">
          Back to Orders
        </button>
      </div>
    );
  }

  const isAdmin = user?.role === 'admin';
  const isSupervisor = user?.role === 'supervisor';
  const canApprove = isAdmin || isSupervisor;

  const getActions = () => {
    const actions = [];
    switch (order.status) {
      case 'draft':
        actions.push({ label: 'Submit for Approval', action: 'submit', variant: 'btn-primary' });
        actions.push({ label: 'Edit', action: 'edit', variant: 'btn-outline' });
        actions.push({ label: 'Delete', action: 'delete', variant: 'btn-danger' });
        break;
      case 'submitted':
        if (canApprove) {
          actions.push({ label: 'Approve', action: 'approve', variant: 'btn-success' });
          actions.push({ label: 'Reject', action: 'reject', variant: 'btn-danger' });
        }
        break;
      case 'approved':
        actions.push({ label: 'Start Production', action: 'start-production', variant: 'btn-primary' });
        break;
      case 'in_production':
        actions.push({ label: 'Complete Production', action: 'complete-production', variant: 'btn-success' });
        break;
      case 'quality_check':
        actions.push({ label: 'Quality Hold', action: 'quality-hold', variant: 'btn-danger' });
        actions.push({ label: 'Mark Complete', action: 'complete', variant: 'btn-success' });
        break;
      case 'quality_hold':
        actions.push({ label: 'Release', action: 'release', variant: 'btn-primary' });
        break;
      default:
        break;
    }
    return actions;
  };

  const actions = getActions();

  return (
    <div className="order-detail">
      <div className="order-detail-header">
        <button
          className="btn btn-outline btn-sm"
          onClick={() => navigate('/orders')}
          aria-label="Back to orders"
        >
          {'\u2190'} Back to Orders
        </button>
        <div className="order-detail-title-row">
          <h2>{order.orderNumber}</h2>
          <span className={`status-badge status-${order.status}`}>
            {STATUS_LABELS[order.status] || order.status}
          </span>
        </div>
      </div>

      <div className="order-detail-body">
        <div className="order-info card">
          <h3 className="card-title">Order Information</h3>
          {editing ? (
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="edit-product">Product</label>
                <select
                  id="edit-product"
                  value={editData.productId}
                  onChange={(e) => setEditData({ ...editData, productId: e.target.value })}
                >
                  <option value="">Select a product</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="edit-quantity">Quantity</label>
                <input
                  id="edit-quantity"
                  type="number"
                  value={editData.quantity}
                  onChange={(e) => setEditData({ ...editData, quantity: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label htmlFor="edit-priority">Priority</label>
                <select
                  id="edit-priority"
                  value={editData.priority}
                  onChange={(e) => setEditData({ ...editData, priority: e.target.value })}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="edit-dueDate">Due Date</label>
                <input
                  id="edit-dueDate"
                  type="date"
                  value={editData.dueDate}
                  onChange={(e) => setEditData({ ...editData, dueDate: e.target.value })}
                />
              </div>
              <div className="form-group form-group-full">
                <label htmlFor="edit-notes">Notes</label>
                <textarea
                  id="edit-notes"
                  value={editData.notes}
                  onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="form-actions">
                <button
                  className="btn btn-primary"
                  onClick={handleSaveEdit}
                  disabled={actionLoading}
                  aria-label="Save changes"
                >
                  Save Changes
                </button>
                <button
                  className="btn btn-outline"
                  onClick={() => setEditing(false)}
                  aria-label="Cancel editing"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="detail-fields">
              <div className="detail-field">
                <span className="detail-label">Product</span>
                <span className="detail-value">{order.product}</span>
              </div>
              <div className="detail-field">
                <span className="detail-label">Quantity</span>
                <span className="detail-value">{order.quantity}</span>
              </div>
              <div className="detail-field">
                <span className="detail-label">Priority</span>
                <span className={`priority-badge priority-${order.priority}`}>
                  {order.priority ? order.priority.charAt(0).toUpperCase() + order.priority.slice(1) : '-'}
                </span>
              </div>
              <div className="detail-field">
                <span className="detail-label">Due Date</span>
                <span className="detail-value">
                  {order.dueDate ? new Date(order.dueDate).toLocaleDateString() : '-'}
                </span>
              </div>
              <div className="detail-field">
                <span className="detail-label">Assigned To</span>
                <span className="detail-value">{order.assignedToName || order.assignedTo || '-'}</span>
              </div>
              <div className="detail-field">
                <span className="detail-label">Production Line</span>
                <span className="detail-value">{order.productionLineName || order.productionLineId || '-'}</span>
              </div>
              <div className="detail-field">
                <span className="detail-label">Shift</span>
                <span className="detail-value">{order.shift ? order.shift.charAt(0).toUpperCase() + order.shift.slice(1) : '-'}</span>
              </div>
              <div className="detail-field">
                <span className="detail-label">Created</span>
                <span className="detail-value">
                  {order.createdAt ? new Date(order.createdAt).toLocaleString() : '-'}
                </span>
              </div>
              {order.notes && (
                <div className="detail-field detail-field-full">
                  <span className="detail-label">Notes</span>
                  <span className="detail-value">{order.notes}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="order-actions card">
          <h3 className="card-title">Actions</h3>
          {actions.length === 0 ? (
            <p className="empty-state">No actions available for this status</p>
          ) : (
            <div className="actions-list">
              {actions.map((act) =>
                act.action === 'edit' ? (
                  <button
                    key={act.action}
                    className={`btn ${act.variant} btn-full`}
                    onClick={() => setEditing(true)}
                    disabled={actionLoading}
                    aria-label={act.label}
                  >
                    {act.label}
                  </button>
                ) : act.action === 'delete' ? (
                  <button
                    key={act.action}
                    className={`btn ${act.variant} btn-full`}
                    onClick={() => setShowDeleteDialog(true)}
                    disabled={actionLoading}
                    aria-label={act.label}
                  >
                    {act.label}
                  </button>
                ) : (
                  <button
                    key={act.action}
                    className={`btn ${act.variant} btn-full`}
                    onClick={() => performAction(act.action)}
                    disabled={actionLoading}
                    aria-label={act.label}
                  >
                    {act.label}
                  </button>
                )
              )}
            </div>
          )}
        </div>
      </div>

      <div className="card order-timeline">
        <h3 className="card-title">Activity Log</h3>
        <ul className="timeline" aria-label="Order activity log">
          {(order.activity || []).length === 0 ? (
            <li className="empty-state">No activity recorded</li>
          ) : (
            (order.activity || []).map((entry, i) => (
              <li key={i} className="timeline-item">
                <div className="timeline-dot"></div>
                <div className="timeline-content">
                  <p className="timeline-text">
                    {entry.comment || `${entry.action}: ${entry.fromStatus || 'none'} → ${entry.toStatus}`}
                  </p>
                  <span className="timeline-meta">
                    {entry.userId} &middot; {new Date(entry.timestamp).toLocaleString()}
                  </span>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>

      {showDeleteDialog && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Confirm delete order">
          <div className="modal">
            <h3 className="modal-title">Delete Order</h3>
            <p>Are you sure you want to delete order {order.orderNumber}? This action cannot be undone.</p>
            <div className="modal-actions">
              <button
                className="btn btn-danger"
                onClick={handleDelete}
                disabled={actionLoading}
                aria-label="Confirm delete"
              >
                Delete
              </button>
              <button
                className="btn btn-outline"
                onClick={() => setShowDeleteDialog(false)}
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
