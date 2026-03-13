import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

const COLUMNS = [
  { key: 'draft', label: 'Draft' },
  { key: 'submitted', label: 'Submitted' },
  { key: 'approved', label: 'Approved' },
  { key: 'in_production', label: 'In Production' },
  { key: 'quality_check', label: 'Quality Check' },
  { key: 'quality_hold', label: 'Quality Hold' },
  { key: 'completed', label: 'Completed' },
];

// Maps a (fromStatus, toStatus) pair to the backend transition action
const TRANSITION_MAP = {
  'draft->submitted': 'submit',
  'submitted->approved': 'approve',
  'submitted->draft': 'reject',
  'approved->in_production': 'start_production',
  'in_production->quality_check': 'complete_production',
  'quality_check->quality_hold': 'quality_hold',
  'quality_check->completed': 'complete',
  'quality_hold->quality_check': 'release_hold',
};

function getTransitionAction(fromStatus, toStatus) {
  return TRANSITION_MAP[`${fromStatus}->${toStatus}`] || null;
}

export default function WorkflowsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addNotification } = useNotification();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draggedOrder, setDraggedOrder] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [transitioning, setTransitioning] = useState(null);
  const dragCountRef = useRef({});

  const token = localStorage.getItem('token');

  const fetchOrders = () => {
    setLoading(true);
    fetch('/api/orders?limit=1000', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setOrders(data.data || data.orders || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const grouped = {};
  COLUMNS.forEach((col) => {
    grouped[col.key] = orders.filter((o) => o.status === col.key);
  });

  const isValidDrop = (order, targetStatus) => {
    if (!order || order.status === targetStatus) return false;
    return !!getTransitionAction(order.status, targetStatus);
  };

  const handleDragStart = (e, order) => {
    setDraggedOrder(order);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', order.id);
    requestAnimationFrame(() => {
      e.target.classList.add('kanban-card-dragging');
    });
  };

  const handleDragEnd = (e) => {
    e.target.classList.remove('kanban-card-dragging');
    setDraggedOrder(null);
    setDropTarget(null);
    dragCountRef.current = {};
  };

  const handleDragEnter = (e, colKey) => {
    e.preventDefault();
    dragCountRef.current[colKey] = (dragCountRef.current[colKey] || 0) + 1;
    setDropTarget(colKey);
  };

  const handleDragLeave = (e, colKey) => {
    dragCountRef.current[colKey] = (dragCountRef.current[colKey] || 0) - 1;
    if (dragCountRef.current[colKey] <= 0) {
      dragCountRef.current[colKey] = 0;
      if (dropTarget === colKey) {
        setDropTarget(null);
      }
    }
  };

  const handleDragOver = (e, colKey) => {
    e.preventDefault();
    if (draggedOrder && isValidDrop(draggedOrder, colKey)) {
      e.dataTransfer.dropEffect = 'move';
    } else {
      e.dataTransfer.dropEffect = 'none';
    }
  };

  const handleDrop = async (e, targetStatus) => {
    e.preventDefault();
    setDropTarget(null);
    dragCountRef.current = {};

    if (!draggedOrder || draggedOrder.status === targetStatus) return;

    const action = getTransitionAction(draggedOrder.status, targetStatus);
    if (!action) {
      const fromLabel = COLUMNS.find(c => c.key === draggedOrder.status)?.label;
      const toLabel = COLUMNS.find(c => c.key === targetStatus)?.label;
      addNotification(`Cannot move from "${fromLabel}" to "${toLabel}"`, 'error');
      return;
    }

    setTransitioning(draggedOrder.id);

    try {
      const res = await fetch(`/api/orders/${draggedOrder.id}/transition`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Transition failed');
      }

      setOrders((prev) =>
        prev.map((o) =>
          o.id === draggedOrder.id ? { ...o, status: targetStatus } : o
        )
      );

      const fromLabel = COLUMNS.find(c => c.key === draggedOrder.status)?.label;
      const toLabel = COLUMNS.find(c => c.key === targetStatus)?.label;
      addNotification(`${draggedOrder.orderNumber}: ${fromLabel} \u2192 ${toLabel}`, 'success');
    } catch (err) {
      addNotification(err.message, 'error');
      fetchOrders();
    } finally {
      setTransitioning(null);
    }
  };

  if (loading) {
    return (
      <div className="kanban-board" role="region" aria-label="Workflow board loading">
        {COLUMNS.map((col) => (
          <div key={col.key} className="kanban-column">
            <div className="kanban-header">
              <div className="skeleton skeleton-text-short"></div>
              <div className="skeleton skeleton-badge" style={{width: 24}}></div>
            </div>
            <div className="kanban-cards">
              {[1,2].map(i => <div key={i} className="skeleton skeleton-card"></div>)}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="workflows-page">
      <div className="kanban-board" role="region" aria-label="Workflow board">
        {COLUMNS.map((col) => {
          const isOver = dropTarget === col.key && draggedOrder;
          const canDrop = draggedOrder && isValidDrop(draggedOrder, col.key);
          const columnClass = [
            'kanban-column',
            isOver && canDrop ? 'kanban-column-drop-valid' : '',
            isOver && !canDrop ? 'kanban-column-drop-invalid' : '',
            draggedOrder && canDrop ? 'kanban-column-droppable' : '',
          ].filter(Boolean).join(' ');

          return (
            <div
              key={col.key}
              className={columnClass}
              onDragEnter={(e) => handleDragEnter(e, col.key)}
              onDragLeave={(e) => handleDragLeave(e, col.key)}
              onDragOver={(e) => handleDragOver(e, col.key)}
              onDrop={(e) => handleDrop(e, col.key)}
            >
              <div className="kanban-header">
                <h3 className="kanban-title">{col.label}</h3>
                <span className="kanban-count">{grouped[col.key].length}</span>
              </div>
              <div className="kanban-cards">
                {grouped[col.key].length === 0 ? (
                  <div className="kanban-empty">
                    {isOver && canDrop ? 'Drop here' : 'No orders'}
                  </div>
                ) : (
                  grouped[col.key].map((order) => (
                    <div
                      key={order.id}
                      className={`kanban-card${transitioning === order.id ? ' kanban-card-transitioning' : ''}`}
                      draggable={col.key !== 'completed' && transitioning !== order.id}
                      onDragStart={(e) => handleDragStart(e, order)}
                      onDragEnd={handleDragEnd}
                      onClick={() => navigate(`/orders/${order.id}`)}
                      role="link"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && navigate(`/orders/${order.id}`)}
                      aria-label={`Order ${order.orderNumber}, ${order.product}. Drag to change status.`}
                    >
                      <div className="kanban-card-header">
                        <span className="kanban-card-number">{order.orderNumber}</span>
                        <span className={`priority-badge priority-${order.priority}`}>
                          {order.priority}
                        </span>
                      </div>
                      <div className="kanban-card-product">{order.product}</div>
                      <div className="kanban-card-meta">
                        <span>Qty: {order.quantity}</span>
                        {(order.assignedToName || order.assignedTo) && (
                          <span>{order.assignedToName || order.assignedTo}</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
                {isOver && canDrop && grouped[col.key].length > 0 && (
                  <div className="kanban-drop-indicator">Drop here</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
