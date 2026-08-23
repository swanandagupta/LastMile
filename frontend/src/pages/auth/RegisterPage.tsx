import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import { Input } from '../../components/ui/Input';
import { Truck, ArrowRight, Lock, Mail, User, Phone } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload: { email: string; password: string; name: string; phone?: string } = {
        email: email.trim(),
        password,
        name: name.trim(),
      };
      if (phone.trim()) payload.phone = phone.trim();

      const res = await api.post('/auth/register', payload);
      login(res.data.token, res.data.user);
      navigate('/customer/dashboard');
    } catch (err: any) {
      const serverMsg = err.response?.data?.error?.message;
      if (serverMsg && serverMsg.includes('EMAIL_EXISTS')) {
        setError('An account with this email address already exists. Please sign in or use a different email.');
      } else {
        setError(serverMsg || 'Registration failed. Please verify your details.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#050505] relative overflow-hidden font-sans">
      <div className="ambient-bg-container">
        <div className="ambient-orb orb-yellow" />
        <div className="ambient-orb orb-purple" />
      </div>

      <div className="w-full max-w-sm space-y-5 ops-panel p-6 relative z-10 scale-in border-white/10">
        <div className="space-y-1 text-center">
          <div className="w-9 h-9 rounded bg-[#F5C518] mx-auto flex items-center justify-center text-[#050505] font-bold">
            <Truck className="w-5 h-5 stroke-[2.5]" />
          </div>
          <h1 className="text-base font-semibold text-white pt-1">Create Customer Account</h1>
          <p className="text-xs text-slate-400">Register to book and track shipments</p>
        </div>

        {error && (
          <div className="p-2.5 rounded bg-rose-950/70 border border-rose-800/80 text-[#F87171] text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-3">
          <Input
            label="Full Name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="John Doe"
            leftIcon={User}
          />

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
            label="Phone Number (Optional)"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 9876543210"
            leftIcon={Phone}
          />

          <Input
            label="Password"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            leftIcon={Lock}
          />

          <button
            type="submit"
            disabled={loading}
            className="ops-btn-primary w-full gap-2 mt-1"
          >
            {loading ? 'Creating Account...' : 'Register Account'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <p className="text-center text-xs text-slate-400">
          Already have an account?{' '}
          <Link to="/login" className="text-[#F5C518] font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};
