import React, { useEffect, useState, useRef } from 'react';
import { Mail, Lock, User, ArrowRight, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { getAuthConfig } from '../services/api';

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
  handleGoogleLogin,
}) {
  const [googleClientId, setGoogleClientId] = useState('');
  const googleBtnRef = useRef(null);

  useEffect(() => {
    getAuthConfig().then((cfg) => {
      if (cfg && cfg.google_client_id) {
        setGoogleClientId(cfg.google_client_id);
      }
    });
  }, []);

  useEffect(() => {
    if (!googleClientId) return;

    const initGoogleBtn = () => {
      if (window.google?.accounts?.id && googleBtnRef.current) {
        try {
          window.google.accounts.id.initialize({
            client_id: googleClientId,
            callback: (response) => {
              if (response.credential && handleGoogleLogin) {
                handleGoogleLogin(response.credential);
              }
            },
          });

          googleBtnRef.current.innerHTML = '';
          window.google.accounts.id.renderButton(googleBtnRef.current, {
            theme: 'outline',
            size: 'large',
            type: 'standard',
            text: authMode === 'login' ? 'signin_with' : 'signup_with',
            shape: 'rectangular',
            logo_alignment: 'left',
            width: googleBtnRef.current.offsetWidth || 340,
          });
        } catch (e) {
          console.error('Google Sign-In initialization error:', e);
        }
      }
    };

    if (window.google?.accounts?.id) {
      initGoogleBtn();
    } else {
      const timer = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(timer);
          initGoogleBtn();
        }
      }, 300);
      return () => clearInterval(timer);
    }
  }, [googleClientId, authMode]);

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

        {/* Google Sign In Container (when GOOGLE_CLIENT_ID configured) */}
        {googleClientId && (
          <div className="google-auth-section">
            <div ref={googleBtnRef} className="google-btn-wrapper"></div>
            <div className="auth-divider">
              <span>OR</span>
            </div>
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
