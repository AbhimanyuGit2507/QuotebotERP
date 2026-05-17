import React, { useState } from 'react';
import { Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getApiBaseUrl } from '../services/api';
import logo from '../assets/logo.png';

const Signup: React.FC = () => {
  const { isAuthenticated, signup } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const redirectTo =
    (location.state as { from?: string } | null)?.from &&
    (location.state as { from?: string } | null)?.from !== '/signup'
      ? (location.state as { from?: string }).from!
      : '/dashboard';

  if (isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    // Validation
    if (!email || !name || !password || !tenantId) {
      setError('All fields are required');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsSubmitting(true);

    try {
      await signup(email, name, password, tenantId);
      navigate('/dashboard', { replace: true });
    } catch (signupError) {
      setError(
        signupError instanceof Error ? signupError.message : 'Signup failed',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignup = async () => {
    setIsGoogleLoading(true);
    setError('');

    try {
      const authUrl = new URL('auth/google', `${getApiBaseUrl().replace(/\/$/, '')}/`);
      authUrl.searchParams.set('source', 'signup');
      authUrl.searchParams.set('redirectTo', redirectTo);
      window.location.href = authUrl.toString();
    } catch (err) {
      setError('Could not initiate Google signup');
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(6,182,212,0.18),_transparent_34%),linear-gradient(180deg,#f8fafc_0%,#ecfeff_100%)] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.12)]">
        <div className="px-8 py-7 bg-gradient-to-br from-slate-950 via-slate-900 to-teal-900 text-white">
          <div className="inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/10 px-3 py-1">
            <img src={logo} alt="Quotebot" className="h-6 w-auto" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-100">
              Quotebot ERP
            </span>
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight">Create your workspace</h1>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Start with email and password, or let Google create the account and tenant automatically.
          </p>
        </div>

        <form className="space-y-4 px-8 py-8" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
              required
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
              required
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              Tenant ID
              <span className="text-xs text-slate-500 font-normal ml-1">(or use demo tenant)</span>
            </label>
            <input
              type="text"
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              placeholder="Enter tenant ID or invitation code"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
              disabled={isSubmitting}
            />
            <p className="text-xs text-slate-500 mt-1">
              If you don't have a tenant ID, contact your administrator or sign up with Google below.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
              required
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
              required
              disabled={isSubmitting}
            />
          </div>

          {error ? (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn-primary btn-block btn-lg w-full"
          >
            {isSubmitting ? 'Creating account...' : 'Create Account'}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-slate-500">or</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignup}
            disabled={isGoogleLoading || isSubmitting}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-teal-300 hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="material-symbols-outlined !text-[18px] text-teal-700">account_circle</span>
            {isGoogleLoading ? 'Connecting to Google...' : 'Sign up with Google'}
          </button>
        </form>

        <div className="border-t border-slate-100 bg-slate-50 px-8 py-4 text-center text-sm">
          <p className="text-slate-600">
            Already have an account?{' '}
            <Link to="/login" className="text-[var(--erp-accent)] font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
