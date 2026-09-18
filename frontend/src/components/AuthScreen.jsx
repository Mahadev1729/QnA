import React from 'react';
import { Mail, Lock, User, ArrowRight, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function AuthScreen({
  authMode,
  setAuthMode,
  authEmail,
  setAuthEmail,
  authUsername,
  setAuthUsername,
  authPassword,
  setAuthPassword,
  authError,
  setAuthError,
  authSuccess,
  setAuthSuccess,
  authSubmitting,
  handleAuthSubmit,
}) {
  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="brand-icon">Q</div>
          <div className="brand-title" style={{ fontSize: '18px' }}>
            QuickAnswer AI
          </div>
        </div>
        <p className="auth-subtitle">
          {authMode === 'login'
            ? 'Sign in to access your private chat history'
            : 'Create an account for personalized AI conversations'}
        </p>

        {authSuccess && (
          <div className="auth-success-banner">
            <CheckCircle2 size={15} />
            <span>{authSuccess}</span>
          </div>
        )}

        {authError && (
          <div className="auth-error-banner">
            <AlertCircle size={15} />
            <span>{authError}</span>
          </div>
        )}

        <form onSubmit={handleAuthSubmit} className="auth-form">
          {authMode === 'register' && (
            <div className="auth-input-group">
              <User size={16} className="auth-field-icon" />
              <input
                type="text"
                placeholder="Username"
                value={authUsername}
                onChange={(e) => setAuthUsername(e.target.value)}
                className="auth-input"
                required
              />
            </div>
          )}

          <div className="auth-input-group">
            <Mail size={16} className="auth-field-icon" />
            <input
              type="email"
              placeholder="Email address"
              value={authEmail}
              onChange={(e) => setAuthEmail(e.target.value)}
              className="auth-input"
              required
            />
          </div>

          <div className="auth-input-group">
            <Lock size={16} className="auth-field-icon" />
            <input
              type="password"
              placeholder="Password (min 6 characters)"
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
              className="auth-input"
              required
              minLength={6}
            />
          </div>

          <button type="submit" className="auth-submit-btn" disabled={authSubmitting}>
            {authSubmitting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <>
                <span>{authMode === 'login' ? 'Sign In' : 'Create Account'}</span>
                <ArrowRight size={15} />
              </>
            )}
          </button>
        </form>

        <div className="auth-toggle">
          {authMode === 'login' ? (
            <span>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setAuthMode('register');
                  setAuthError('');
                  setAuthSuccess('');
                }}
                className="auth-toggle-link"
              >
                Sign up
              </button>
            </span>
          ) : (
            <span>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setAuthError('');
                  setAuthSuccess('');
                }}
                className="auth-toggle-link"
              >
                Sign in
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
