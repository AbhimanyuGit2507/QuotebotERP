import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/api';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  tenant_id: string;
  role: string;
  company_name?: string;
}

const AuthCallback: React.FC = () => {
  const { setSession } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    const finalize = async () => {
      const params = new URLSearchParams(location.search);
      const redirectTo = params.get('redirectTo') || '/dashboard';
      const errorMessage = params.get('error');

      if (errorMessage) {
        setError(errorMessage);
        setIsProcessing(false);
        return;
      }

      try {
        const response = await apiRequest<{ user: AuthUser }>('/auth/me', {
          method: 'GET',
        });
        setSession({ user: response.user });
        navigate(redirectTo, { replace: true });
      } catch {
        setError('Could not complete Google sign-in');
      } finally {
        setIsProcessing(false);
      }
    };

    void finalize();
  }, [location.search, navigate, setSession]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.18),_transparent_34%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] px-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-200/80 bg-white p-8 text-center shadow-[0_24px_80px_rgba(15,23,42,0.12)]">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700">
          <span className="material-symbols-outlined !text-[28px]">sync</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Finishing sign-in</h1>
        <p className="mt-2 text-sm text-slate-600">
          {error ? error : isProcessing ? 'Completing your Google session...' : 'Redirecting...'}
        </p>
      </div>
    </div>
  );
};

export default AuthCallback;
