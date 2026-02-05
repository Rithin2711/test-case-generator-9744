import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './LoginPage.css';
import { validateCredentials } from '../utils/loginJsonStorage';

/**
 * Login page UI.
 * Now supports localStorage-based validation against key `login.json` as { email: password }.
 */

// PUBLIC_INTERFACE
function LoginPage() {
  /** This is a public component. */
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [status, setStatus] = useState({ type: 'idle', message: '' });

  const isFormValid = useMemo(() => {
    return email.trim().length > 0 && password.length > 0;
  }, [email, password]);

  const onSubmit = (e) => {
    e.preventDefault();
    setStatus({ type: 'idle', message: '' });

    const result = validateCredentials(email, password);
    if (result.ok) {
      // Persist minimal identity for Home header display (not secure auth; UI scaffold only).
      window.localStorage.setItem('auth.email', String(email || '').trim().toLowerCase());
      navigate('/home', { replace: true });
    } else {
      setStatus({ type: 'error', message: result.reason });
    }
  };

  const onGoogle = () => {
    // UI scaffolding only.
    // eslint-disable-next-line no-console
    console.log('Google sign in clicked (stub)');
  };

  return (
    <div className="loginPage" role="main">
      <header className="loginHeader" aria-label="Application header">
        <div className="loginHeaderInner">
          <div className="brandGroup">
            <div className="appLogo" aria-label="Application logo">
              TC
            </div>
            <div className="brandText">
              <div className="brandTitle">Test Case Generator</div>
              <div className="brandSubtitle">Sign in to continue</div>
            </div>
          </div>

          <div className="companyGroup" aria-label="Company logo">
            <div className="companyLogo" title="Company">
              ACME
            </div>
          </div>
        </div>
      </header>

      <section className="loginContent" aria-label="Sign in form section">
        <div className="loginCard" role="region" aria-label="Sign in card">
          <h1 className="loginTitle">Sign in</h1>

          <form className="loginForm" onSubmit={onSubmit}>
            <label className="fieldLabel" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              className="textField"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <label className="fieldLabel" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              className="textField"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <button className="primaryButton" type="submit" disabled={!isFormValid}>
              Sign in
            </button>

            {status.type === 'success' ? (
              <div className="signupRow" style={{ color: '#065F46', textAlign: 'left' }} role="status">
                {status.message}
              </div>
            ) : null}

            {status.type === 'error' ? (
              <div className="signupRow" style={{ color: '#EF4444', textAlign: 'left' }} role="alert">
                {status.message}
              </div>
            ) : null}

            <div className="divider" role="separator" aria-label="Or continue with">
              <span>or</span>
            </div>

            <button className="googleButton" type="button" onClick={onGoogle}>
              <span className="googleMark" aria-hidden="true">
                G
              </span>
              Continue with Google
            </button>

            <div className="signupRow">
              <span className="signupText">Don&apos;t have an account?</span>{' '}
              <Link className="signupLink" to="/signup">
                Sign Up
              </Link>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}

export default LoginPage;
