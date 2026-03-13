import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '../context/AuthContext';

const STATUS_LABELS = {
  draft: 'Draft',
  submitted: 'Submitted',
  approved: 'Approved',
  in_production: 'In Production',
  quality_check: 'Quality Check',
  quality_hold: 'Quality Hold',
  completed: 'Completed',
};

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch('/api/dashboard', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => {
        setData(null);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="dashboard">
        <div className="kpi-row">
          {[1,2,3,4].map(i => <div key={i} className="skeleton skeleton-kpi"></div>)}
        </div>
        <div className="card chart-card">
          <div className="skeleton skeleton-heading"></div>
          <div className="skeleton skeleton-chart"></div>
        </div>
        <div className="dashboard-bottom">
          <div className="card">
            <div className="skeleton skeleton-heading"></div>
            {[1,2,3,4,5].map(i => <div key={i} className="skeleton-row"><div className="skeleton skeleton-cell"></div><div className="skeleton skeleton-cell"></div><div className="skeleton skeleton-cell"></div></div>)}
          </div>
          <div className="card">
            <div className="skeleton skeleton-heading"></div>
            {[1,2,3,4,5].map(i => <div key={i} className="skeleton skeleton-card" style={{height: 40}}></div>)}
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="error-page">
        <div className="error-page-icon">{'\u26A0'}</div>
        <h2 className="error-page-title">Failed to load dashboard</h2>
        <p className="error-page-message">Could not connect to the server. Please check your connection and try again.</p>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  const kpis = data?.summary || data?.kpis || {
    totalOrders: 0,
    inProduction: 0,
    completedToday: 0,
    qualityHold: 0,
  };
  const trends = kpis.trends || {};

  const chartData = (data?.chartData || data?.dailyProduction || []).map(d => ({
    date: d.date,
    completed: d.count !== undefined ? d.count : d.completed,
    started: d.started || 0,
  }));
  const recentOrders = data?.recentOrders || [];
  const activityFeed = data?.activityFeed || [];

  return (
    <div className="dashboard">
      <div className="kpi-row">
        <div className="kpi-card">
          <div className="kpi-icon">{'\u{1F4CB}'}</div>
          <div className="kpi-content">
            <div className="kpi-value">{kpis.totalOrders}</div>
            <div className="kpi-label">Total Orders</div>
          </div>
          <div className={`kpi-trend ${(trends.totalOrders || 0) >= 0 ? 'kpi-trend-up' : 'kpi-trend-down'}`}>
            {(trends.totalOrders || 0) >= 0 ? '\u2191' : '\u2193'} {Math.abs(trends.totalOrders || 0)}%
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon">{'\u{1F3ED}'}</div>
          <div className="kpi-content">
            <div className="kpi-value">{kpis.inProduction}</div>
            <div className="kpi-label">In Production</div>
          </div>
          <div className={`kpi-trend ${(trends.inProduction || 0) >= 0 ? 'kpi-trend-up' : 'kpi-trend-down'}`}>
            {(trends.inProduction || 0) >= 0 ? '\u2191' : '\u2193'} {Math.abs(trends.inProduction || 0)}%
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon">{'\u2705'}</div>
          <div className="kpi-content">
            <div className="kpi-value">{kpis.completedToday}</div>
            <div className="kpi-label">Completed Today</div>
          </div>
          <div className={`kpi-trend ${(trends.completedToday || 0) >= 0 ? 'kpi-trend-up' : 'kpi-trend-down'}`}>
            {(trends.completedToday || 0) >= 0 ? '\u2191' : '\u2193'} {Math.abs(trends.completedToday || 0)}%
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon">{'\u26A0'}</div>
          <div className="kpi-content">
            <div className="kpi-value">{kpis.qualityHold}</div>
            <div className="kpi-label">Quality Hold</div>
          </div>
          <div className={`kpi-trend ${(trends.qualityHold || 0) >= 0 ? 'kpi-trend-up' : 'kpi-trend-down'}`}>
            {(trends.qualityHold || 0) >= 0 ? '\u2191' : '\u2193'} {Math.abs(trends.qualityHold || 0)}%
          </div>
        </div>
      </div>

      <div className="card chart-card">
        <h3 className="card-title">Daily Production Output</h3>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="completed" fill="#2a9d8f" name="Completed" />
              <Bar dataKey="started" fill="#4361ee" name="Started" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="dashboard-bottom">
        <div className="card">
          <h3 className="card-title">Recent Orders</h3>
          <table className="data-table" aria-label="Recent orders">
            <thead>
              <tr>
                <th>Order #</th>
                <th>Product</th>
                <th>Status</th>
                <th>Due Date</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={4} className="empty-state">No recent orders</td>
                </tr>
              ) : (
                recentOrders.map((order) => (
                  <tr
                    key={order.id}
                    onClick={() => navigate(`/orders/${order.id}`)}
                    className="clickable-row"
                    role="link"
                    aria-label={`View order ${order.orderNumber}`}
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && navigate(`/orders/${order.id}`)}
                  >
                    <td>{order.orderNumber}</td>
                    <td>{order.product}</td>
                    <td>
                      <span className={`status-badge status-${order.status}`}>
                        {STATUS_LABELS[order.status] || order.status}
                      </span>
                    </td>
                    <td>{order.dueDate ? new Date(order.dueDate).toLocaleDateString() : '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h3 className="card-title">Activity Feed</h3>
          <ul className="activity-feed" aria-label="Recent activity">
            {activityFeed.length === 0 ? (
              <li className="empty-state">No recent activity</li>
            ) : (
              activityFeed.map((item, i) => (
                <li key={i} className="activity-item">
                  <div className="activity-dot"></div>
                  <div className="activity-content">
                    <p className="activity-text">
                      {item.message || `${item.action}: ${item.fromStatus || 'none'} \u2192 ${item.toStatus}${item.comment ? ' \u2014 ' + item.comment : ''}`}
                    </p>
                    <span className="activity-time">
                      {new Date(item.timestamp).toLocaleString()}
                    </span>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
