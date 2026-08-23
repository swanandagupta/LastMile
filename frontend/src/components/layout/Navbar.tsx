import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Truck, LogOut } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { UserRole } from '../../types';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRoleBadgeStyle = (role?: UserRole) => {
    if (role === UserRole.ADMIN) return 'bg-purple-500/10 text-[#C4B5FD] border-purple-500/20';
    if (role === UserRole.AGENT) return 'bg-emerald-500/10 text-[#34D399] border-emerald-500/20';
    return 'bg-yellow-500/10 text-[#F5C518] border-yellow-500/20';
  };

  return (
    <header className="sticky top-0 z-40 bg-[#050505]/95 backdrop-blur-md border-b border-white/8 h-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
        <div className="flex items-center justify-between h-full">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-[#F5C518] flex items-center justify-center text-[#050505] font-bold">
              <Truck className="w-3.5 h-3.5 stroke-[2.5]" />
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <span className="text-white tracking-tight">LastMile</span>
              <span className="text-[#F5C518]">Ops</span>
            </div>
          </Link>

          {user && (
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-[#0A0A0A] border border-white/8">
                <div className="w-4 h-4 rounded bg-purple-500/20 text-[#C4B5FD] flex items-center justify-center text-[10px] font-bold">
                  {user.name ? user.name[0].toUpperCase() : 'U'}
                </div>
                <span className="font-medium text-slate-200 hidden sm:inline">{user.name}</span>
                <span className={`text-[10px] uppercase font-mono font-semibold px-1.5 py-0.2 rounded border ${getRoleBadgeStyle(user.role)}`}>
                  {user.role}
                </span>
              </div>

              <button
                onClick={handleLogout}
                className="flex items-center gap-1 px-2 py-1 rounded bg-[#0A0A0A] border border-white/8 text-slate-400 hover:text-rose-400 hover:border-rose-500/30 text-xs font-medium transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Exit</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
