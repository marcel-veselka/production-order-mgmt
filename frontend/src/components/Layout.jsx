import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { path: '/', label: 'Dashboard', icon: '\u2302' },
  { path: '/orders', label: 'Orders', icon: '\u2630' },
  { path: '/workflows', label: 'Workflows', icon: '\u21c4' },
  { path: '/settings', label: 'Settings', icon: '\u2699', adminOnly: true },
];

function getBreadcrumbs(pathname) {
  if (pathname === '/') return [{ label: 'Dashboard' }];
  const segments = pathname.split('/').filter(Boolean);
  const crumbs = [];
  segments.forEach((seg) => {
    // Keep order IDs (e.g. ORD-001) uppercase
    if (seg.match(/^ORD-/i)) {
      crumbs.push({ label: seg.toUpperCase() });
    } else {
      crumbs.push({ label: seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, ' ') });
    }
  });
  return crumbs;
}

function getPageTitle(pathname) {
  if (pathname === '/') return 'Dashboard';
  if (pathname === '/orders') return 'Production Orders';
  if (pathname === '/orders/new') return 'New Order';
  if (pathname.startsWith('/orders/')) return 'Order Detail';
  if (pathname === '/workflows') return 'Workflows';
  if (pathname === '/settings') return 'Settings';
  return 'Page';
}

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const breadcrumbs = getBreadcrumbs(location.pathname);
  const pageTitle = getPageTitle(location.pathname);

  return (
    <>
      <a href="#main-content" className="skip-link">Skip to main content</a>
    <div className="layout">
      <aside className="sidebar" role="navigation" aria-label="Main navigation">
        <div className="sidebar-header">
          <h1 className="sidebar-title">{'\u2699\uFE0F'} Factory MES</h1>
        </div>
        <nav className="sidebar-nav">
          <ul>
            {navItems
              .filter((item) => !item.adminOnly || user?.role === 'admin')
              .map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    end={item.path === '/'}
                    className={({ isActive }) =>
                      `sidebar-link${isActive ? ' sidebar-link-active' : ''}`
                    }
                    aria-label={item.label}
                  >
                    <span className="sidebar-icon">{item.icon}</span>
                    <span>{item.label}</span>
                  </NavLink>
                </li>
              ))}
          </ul>
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-name">{user?.name || 'User'}</div>
            <span className={`role-badge role-${user?.role}`}>{user?.role}</span>
          </div>
          <button className="btn btn-outline btn-sm" onClick={logout} aria-label="Log out">
            Logout
          </button>
        </div>
      </aside>
      <main className="main-content">
        <header className="top-bar">
          <div>
            <h2 className="page-title">{pageTitle}</h2>
            <nav className="breadcrumbs" aria-label="Breadcrumb">
              <ol>
                {breadcrumbs.map((crumb, i) => (
                  <li key={i}>
                    {i > 0 && <span className="breadcrumb-sep">/</span>}
                    <span>{crumb.label}</span>
                  </li>
                ))}
              </ol>
            </nav>
          </div>
        </header>
        <div className="content-area" id="main-content">
          <Outlet />
        </div>
      </main>
    </div>
    </>
  );
}
