import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { UserRole } from '../../types';

interface ProtectedLayoutProps {
  allowedRoles?: UserRole[];
}

export const ProtectedLayout: React.FC<ProtectedLayoutProps> = ({ allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050505] text-slate-400 font-mono text-xs">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 border-2 border-[#F5C518] border-t-transparent rounded-full animate-spin" />
          <span>INITIALIZING OPERATIONS PORTAL...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    if (user.role === UserRole.CUSTOMER) return <Navigate to="/customer/dashboard" replace />;
    if (user.role === UserRole.AGENT) return <Navigate to="/agent/dashboard" replace />;
    if (user.role === UserRole.ADMIN) return <Navigate to="/admin/dashboard" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#050505] relative selection:bg-[#F5C518] selection:text-black">
      {/* Ambient Moving Gradient Orbs */}
      <div className="ambient-bg-container">
        <div className="ambient-orb orb-yellow" />
        <div className="ambient-orb orb-purple" />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        <Navbar />
        <div className="flex flex-1">
          <Sidebar />
          <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};
