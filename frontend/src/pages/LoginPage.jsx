import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

const demoAccounts = [
  { label: 'Admin', email: 'admin@factory.local', password: 'admin123' },
  { label: 'Supervisor', email: 'jan.novak@factory.local', password: 'super123' },
  { label: 'Operator', email: 'petra.svoboda@factory.local', password: 'oper123' },
];

export default function LoginPage() {
  const { login } = useAuth();
  const { addNotification } = useNotification();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    if (!password.trim()) {
      setError('Password is required');
      return;
    }
    setSubmitting(true);
    try {
      await login(email, password);
      addNotification('Logged in successfully', 'success');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemo = (account) => {
    setEmail(account.email);
    setPassword(account.password);
    setError('');
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <span className="login-logo-icon">{'\u2699'}</span>
          <h1>Factory MES</h1>
          <p className="login-subtitle">Production Order Management</p>
        </div>
        <form onSubmit={handleSubmit} className="login-form" noValidate>
          {error && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}
          <div className="form-group">
            <label htmlFor="login-email">Email</label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              autoComplete="email"
              aria-required="true"
            />
          </div>
          <div className="form-group">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              aria-required="true"
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={submitting}
            aria-label="Log in"
          >
            {submitting ? 'Logging in...' : 'Login'}
          </button>
        </form>
        <div className="login-demo">
          <p className="login-demo-label">Quick access with demo accounts:</p>
          <div className="login-demo-buttons">
            {demoAccounts.map((account) => (
              <button
                key={account.label}
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => fillDemo(account)}
                aria-label={`Fill ${account.label} demo credentials`}
              >
                {account.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
