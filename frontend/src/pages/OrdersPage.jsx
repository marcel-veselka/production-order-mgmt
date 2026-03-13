import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'approved', label: 'Approved' },
  { value: 'in_production', label: 'In Production' },
  { value: 'quality_check', label: 'Quality Check' },
  { value: 'quality_hold', label: 'Quality Hold' },
  { value: 'completed', label: 'Completed' },
];

const STATUS_LABELS = {
  draft: 'Draft',
  submitted: 'Submitted',
  approved: 'Approved',
  in_production: 'In Production',
  quality_check: 'Quality Check',
  quality_hold: 'Quality Hold',
  completed: 'Completed',
};

const PRIORITY_LABELS = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

const PAGE_SIZE = 10;

export default function OrdersPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortField, setSortField] = useState('createdAt');
  const [sortDir, setSortDir] = useState('desc');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState([]);
  const [searchTimeout, setSearchTimeout] = useState(null);

  const fetchOrders = useCallback(() => {
    setLoading(true);
    const token = localStorage.getItem('token');
    const params = new URLSearchParams({
      page: String(page),
      limit: String(PAGE_SIZE),
      sortBy: sortField,
      sortDir: sortDir,
    });
    if (search) params.set('search', search);
    if (statusFilter) params.set('status', statusFilter);

    fetch(`/api/orders?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setOrders(data.data || data.orders || []);
        setTotal(data.total || 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [page, search, statusFilter, sortField, sortDir]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
    setPage(1);
  };

  const sortIndicator = (field) => {
    if (sortField !== field) return '';
    return sortDir === 'asc' ? ' \u25B2' : ' \u25BC';
  };

  const toggleSelect = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selected.length === orders.length) {
      setSelected([]);
    } else {
      setSelected(orders.map(o => o.id));
    }
  };

  const exportCSV = () => {
    const headers = ['Order #', 'Product', 'Quantity', 'Status', 'Priority', 'Assigned To', 'Due Date'];
    const rows = (selected.length > 0 ? orders.filter(o => selected.includes(o.id)) : orders)
      .map(o => [
        o.orderNumber,
        `"${o.product}"`,
        o.quantity,
        STATUS_LABELS[o.status] || o.status,
        PRIORITY_LABELS[o.priority] || o.priority,
        o.assignedToName || o.assignedTo || '',
        o.dueDate ? new Date(o.dueDate).toLocaleDateString() : '',
      ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;
  const startItem = (page - 1) * PAGE_SIZE + 1;
  const endItem = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="orders-page">
      <div className="toolbar">
        <div className="toolbar-left">
          <input
            type="search"
            className="search-input"
            placeholder="Search orders..."
            value={search}
            onChange={(e) => {
              const val = e.target.value;
              setSearch(val);
              if (searchTimeout) clearTimeout(searchTimeout);
              setSearchTimeout(setTimeout(() => setPage(1), 300));
            }}
            aria-label="Search orders"
          />
          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by status"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="toolbar-right">
          <button
            className="btn btn-outline"
            onClick={exportCSV}
            aria-label="Export orders to CSV"
          >
            Export CSV
          </button>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/orders/new')}
            aria-label="Create new order"
          >
            New Order
          </button>
        </div>
      </div>

      {selected.length > 0 && (
        <div className="bulk-actions-bar" role="status" aria-live="polite">
          <span>{selected.length} order{selected.length > 1 ? 's' : ''} selected</span>
          <button className="btn btn-outline btn-sm" onClick={exportCSV} aria-label="Export selected orders">
            Export Selected
          </button>
          <button className="btn btn-outline btn-sm" onClick={() => setSelected([])} aria-label="Clear selection">
            Clear
          </button>
        </div>
      )}

      <div className="card">
        <table className="data-table" aria-label="Production orders">
          <thead>
            <tr>
              <th style={{width: 40}}>
                <input
                  type="checkbox"
                  className="bulk-checkbox"
                  checked={orders.length > 0 && selected.length === orders.length}
                  onChange={toggleSelectAll}
                  aria-label="Select all orders"
                />
              </th>
              <th
                onClick={() => handleSort('orderNumber')}
                className="sortable-header"
                aria-sort={sortField === 'orderNumber' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                role="columnheader"
              >
                Order #{sortIndicator('orderNumber')}
              </th>
              <th
                onClick={() => handleSort('product')}
                className="sortable-header"
                aria-sort={sortField === 'product' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                role="columnheader"
              >
                Product{sortIndicator('product')}
              </th>
              <th
                onClick={() => handleSort('quantity')}
                className="sortable-header"
                aria-sort={sortField === 'quantity' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                role="columnheader"
              >
                Quantity{sortIndicator('quantity')}
              </th>
              <th
                onClick={() => handleSort('status')}
                className="sortable-header"
                aria-sort={sortField === 'status' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                role="columnheader"
              >
                Status{sortIndicator('status')}
              </th>
              <th
                onClick={() => handleSort('priority')}
                className="sortable-header"
                aria-sort={sortField === 'priority' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                role="columnheader"
              >
                Priority{sortIndicator('priority')}
              </th>
              <th>Assigned To</th>
              <th
                onClick={() => handleSort('dueDate')}
                className="sortable-header"
                aria-sort={sortField === 'dueDate' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                role="columnheader"
              >
                Due Date{sortIndicator('dueDate')}
              </th>
              <th
                onClick={() => handleSort('createdAt')}
                className="sortable-header"
                aria-sort={sortField === 'createdAt' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                role="columnheader"
              >
                Created{sortIndicator('createdAt')}
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({length: 5}).map((_, i) => (
                <tr key={`skeleton-${i}`}>
                  <td><div className="skeleton" style={{width: 16, height: 16}}></div></td>
                  <td><div className="skeleton skeleton-text-short"></div></td>
                  <td><div className="skeleton skeleton-text"></div></td>
                  <td><div className="skeleton skeleton-text-short"></div></td>
                  <td><div className="skeleton skeleton-badge"></div></td>
                  <td><div className="skeleton skeleton-badge"></div></td>
                  <td><div className="skeleton skeleton-text-short"></div></td>
                  <td><div className="skeleton skeleton-text-short"></div></td>
                  <td><div className="skeleton skeleton-text-short"></div></td>
                </tr>
              ))
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={9}>
                  <div className="empty-state-container">
                    <div className="empty-state-icon">{'\u{1F4CB}'}</div>
                    <div className="empty-state-title">No orders found</div>
                    <div className="empty-state-description">
                      {search || statusFilter ? 'Try adjusting your search or filter criteria.' : 'Create your first production order to get started.'}
                    </div>
                    {!search && !statusFilter && (
                      <button className="btn btn-primary" onClick={() => navigate('/orders/new')} aria-label="Create first order">
                        Create Order
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr
                  key={order.id}
                  onClick={() => navigate(`/orders/${order.id}`)}
                  className="clickable-row"
                  role="link"
                  aria-label={`View order ${order.orderNumber}`}
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && navigate(`/orders/${order.id}`)}
                >
                  <td onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      className="bulk-checkbox"
                      checked={selected.includes(order.id)}
                      onChange={() => toggleSelect(order.id)}
                      aria-label={`Select order ${order.orderNumber}`}
                    />
                  </td>
                  <td>{order.orderNumber}</td>
                  <td>{order.product}</td>
                  <td>{order.quantity}</td>
                  <td>
                    <span className={`status-badge status-${order.status}`}>
                      {STATUS_LABELS[order.status] || order.status}
                    </span>
                  </td>
                  <td>
                    <span className={`priority-badge priority-${order.priority}`}>
                      {PRIORITY_LABELS[order.priority] || order.priority}
                    </span>
                  </td>
                  <td>{order.assignedToName || order.assignedTo || '-'}</td>
                  <td>{order.dueDate ? new Date(order.dueDate).toLocaleDateString() : '-'}</td>
                  <td>{order.createdAt ? new Date(order.createdAt).toLocaleDateString() : '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="pagination" role="navigation" aria-label="Pagination">
        <span className="pagination-info">
          Showing {total > 0 ? startItem : 0}-{endItem} of {total}
        </span>
        <div className="pagination-buttons">
          <button
            className="btn btn-outline btn-sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            aria-label="Previous page"
          >
            Previous
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
            .map((p, idx, arr) => (
              <React.Fragment key={p}>
                {idx > 0 && arr[idx - 1] !== p - 1 && <span className="pagination-ellipsis">...</span>}
                <button
                  className={`btn btn-sm ${p === page ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setPage(p)}
                  aria-label={`Page ${p}`}
                  aria-current={p === page ? 'page' : undefined}
                >
                  {p}
                </button>
              </React.Fragment>
            ))}
          <button
            className="btn btn-outline btn-sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            aria-label="Next page"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
