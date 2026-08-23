import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import { Input } from '../../components/ui/Input';
import { Truck, ArrowRight, Lock, Mail, ShieldCheck } from 'lucide-react';

export const LoginPage: React.FC = () => {
  // Empty form fields with muted grey placeholders
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const performLogin = async (loginEmail: string, loginPass: string) => {
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/auth/login', {
        email: loginEmail.toLowerCase().trim(),
        password: loginPass,
      });
      login(res.data.token, res.data.user);

      const role = res.data.user.role;
      if (role === 'ADMIN') navigate('/admin/dashboard');
      else if (role === 'AGENT') navigate('/agent/dashboard');
      else navigate('/customer/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performLogin(email, password);
  };

  const handleQuickDemoLogin = (demoEmail: string) => {
    performLogin(demoEmail, 'password123');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#050505] relative overflow-hidden font-sans">
      {/* Ambient Moving Orbs */}
      <div className="ambient-bg-container">
        <div className="ambient-orb orb-yellow" />
        <div className="ambient-orb orb-purple" />
      </div>

      <div className="w-full max-w-sm space-y-5 ops-panel p-6 relative z-10 scale-in border-white/10">
        <div className="space-y-1 text-center">
          <div className="w-9 h-9 rounded bg-[#F5C518] mx-auto flex items-center justify-center text-[#050505] font-bold">
            <Truck className="w-5 h-5 stroke-[2.5]" />
          </div>
          <h1 className="text-base font-semibold text-white pt-1">Sign in to LastMile</h1>
          <p className="text-xs text-slate-400">Logistics operations management system</p>
        </div>

        {error && (
          <div className="p-2.5 rounded bg-rose-950/70 border border-rose-800/80 text-[#F87171] text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleFormSubmit} className="space-y-3.5">
          <Input
            label="Email Address"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@company.com"
            leftIcon={Mail}
          />

          <Input
            label="Password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            leftIcon={Lock}
          />

          <button
            type="submit"
            disabled={loading}
            className="ops-btn-primary w-full gap-2"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* 1-Click Evaluation Demo Credentials */}
        <div className="pt-3 border-t border-white/8 space-y-2">
          <p className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#F5C518]" />
            Instant Evaluation Demo Accounts:
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleQuickDemoLogin('admin@delivery.com')}
              className="py-1.5 rounded bg-[#0A0A0A] border border-yellow-500/30 text-xs font-semibold text-[#F5C518] hover:bg-yellow-500/10 transition text-center"
            >
              Admin Demo
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemoLogin('customer1@delivery.com')}
              className="py-1.5 rounded bg-[#0A0A0A] border border-purple-500/30 text-xs font-semibold text-[#C4B5FD] hover:bg-purple-500/10 transition text-center"
            >
              Customer Demo
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemoLogin('agent1@delivery.com')}
              className="py-1.5 rounded bg-[#0A0A0A] border border-emerald-500/30 text-xs font-semibold text-[#34D399] hover:bg-emerald-500/10 transition text-center"
            >
              Agent Demo
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400">
          Don't have a customer account?{' '}
          <Link to="/register" className="text-[#F5C518] font-medium hover:underline">
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
};
