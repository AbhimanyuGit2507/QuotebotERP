import React, { useState } from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getApiBaseUrl } from '../services/api';
import logo from '../assets/logo.png';

const Login: React.FC = () => {
  const { isAuthenticated, login } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const redirectTo =
    (location.state as { from?: string } | null)?.from &&
    (location.state as { from?: string } | null)?.from !== '/login'
      ? (location.state as { from?: string }).from!
      : '/dashboard';

  if (isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      await login(email, password);
    } catch (loginError) {
      setError(
        loginError instanceof Error ? loginError.message : 'Login failed',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = () => {
    setIsGoogleLoading(true);
    const authUrl = new URL('auth/google', `${getApiBaseUrl().replace(/\/$/, '')}/`);
    authUrl.searchParams.set('source', 'login');
    authUrl.searchParams.set('redirectTo', redirectTo);
    window.location.href = authUrl.toString();
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.18),_transparent_34%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.12)]">
        <div className="px-8 py-7 bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-900 text-white">
          <div className="inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/10 px-3 py-1">
            <img src={logo} alt="Quotebot" className="h-6 w-auto" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-100">
              Quotebot ERP
            </span>
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight">Welcome back</h1>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Sign in with email and password, or continue with Google for a faster session.
          </p>
        </div>

        <form className="space-y-5 px-8 py-8" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
              required
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
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </button>

          <div className="relative py-1">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-[0.18em] text-slate-400">
              <span className="bg-white px-3">or continue with</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isGoogleLoading}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-cyan-300 hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="material-symbols-outlined !text-[18px] text-cyan-700">
              account_circle
            </span>
            {isGoogleLoading ? 'Redirecting to Google...' : 'Sign in with Google'}
          </button>
        </form>

        <div className="border-t border-slate-100 bg-slate-50 px-8 py-4 text-center text-sm">
          <p className="text-slate-600">
            Don't have an account?{' '}
            <Link to="/signup" className="text-[var(--erp-accent)] font-medium hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;