import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import './LoginPage.css';
import { saveCredentials } from '../utils/loginJsonStorage';

/**
 * Sign up page using the same visual scaffold as the login page.
 * Stores credentials into localStorage key `login.json` as { email: password }.
 */

// PUBLIC_INTERFACE
function SignUpPage() {
  /** This is a public component. */
  const [email, setEmail] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [status, setStatus] = useState({ type: 'idle', message: '' });

  const validation = useMemo(() => {
    const normalizedEmail = email.trim();
    if (!normalizedEmail) return { ok: false, message: 'Email is required.' };

    if (!password) return { ok: false, message: 'Password is required.' };
    if (!confirmPassword) return { ok: false, message: 'Confirm password is required.' };
    if (password !== confirmPassword) return { ok: false, message: 'Passwords do not match.' };

    if (!mobileNumber.trim()) return { ok: false, message: 'Mobile number is required.' };

    return { ok: true, message: '' };
  }, [email, password, confirmPassword, mobileNumber]);

  const onSubmit = (e) => {
    e.preventDefault();
    setStatus({ type: 'idle', message: '' });

    if (!validation.ok) {
      setStatus({ type: 'error', message: validation.message });
      return;
    }

    try {
      saveCredentials(email, password);
      setStatus({
        type: 'success',
        message: 'You have successfully signed up.',
      });
    } catch (err) {
      setStatus({ type: 'error', message: err?.message || 'Sign up failed.' });
    }
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
              <div className="brandSubtitle">Create your account</div>
            </div>
          </div>

          <div className="companyGroup" aria-label="Company logo">
            <div className="companyLogo" title="Company">
              ACME
            </div>
          </div>
        </div>
      </header>

      <section className="loginContent" aria-label="Sign up form section">
        <div className="loginCard" role="region" aria-label="Sign up card">
          <h1 className="loginTitle">Sign Up</h1>

          <form className="loginForm" onSubmit={onSubmit}>
            <label className="fieldLabel" htmlFor="signup-email">
              Email
            </label>
            <input
              id="signup-email"
              className="textField"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <label className="fieldLabel" htmlFor="signup-password">
              Password
            </label>
            <input
              id="signup-password"
              className="textField"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <label className="fieldLabel" htmlFor="signup-confirm">
              Confirm password
            </label>
            <input
              id="signup-confirm"
              className="textField"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            <label className="fieldLabel" htmlFor="signup-mobile">
              Mobile number
            </label>
            <input
              id="signup-mobile"
              className="textField"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="e.g. 9876543210"
              value={mobileNumber}
              onChange={(e) => setMobileNumber(e.target.value)}
              required
            />

            <button className="primaryButton" type="submit" disabled={!validation.ok}>
              Sign Up
            </button>

            {status.type === 'error' ? (
              <div className="signupRow" style={{ color: '#EF4444', textAlign: 'left' }} role="alert">
                {status.message}
              </div>
            ) : null}

            {status.type === 'success' ? (
              <div className="signupRow" style={{ color: '#065F46' }} role="status">
                <div style={{ marginBottom: 8 }}>{status.message}</div>
                <Link className="signupLink" to="/login">
                  Go to Login
                </Link>
              </div>
            ) : (
              <div className="signupRow">
                <span className="signupText">Already have an account?</span>{' '}
                <Link className="signupLink" to="/login">
                  Login
                </Link>
              </div>
            )}
          </form>
        </div>
      </section>
    </div>
  );
}

export default SignUpPage;
