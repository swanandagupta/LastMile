import React from 'react';
import { OrderStatus } from '../../types';

interface BadgeProps {
  status: OrderStatus | string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<BadgeProps> = ({ status, size = 'md' }) => {
  const styles: Record<string, string> = {
    BOOKED: 'text-[#C4B5FD] bg-purple-500/10 border-purple-500/20',
    PICKED_UP: 'text-[#FFD43B] bg-yellow-500/10 border-yellow-500/20',
    IN_TRANSIT: 'text-[#A78BFA] bg-violet-500/10 border-violet-500/20',
    OUT_FOR_DELIVERY: 'text-[#F59E0B] bg-amber-500/10 border-amber-500/20',
    DELIVERED: 'text-[#34D399] bg-emerald-500/10 border-emerald-500/20',
    FAILED: 'text-[#F87171] bg-rose-500/10 border-rose-500/20',
  };

  const defaultStyle = 'text-slate-300 bg-slate-800 border-slate-700';
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-[4px] border font-mono font-medium ${styles[status] || defaultStyle} ${sizeClasses}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {status.replace(/_/g, ' ')}
    </span>
  );
};

export const AgentStatusBadge: React.FC<{ isAvailable: boolean; isActive: boolean }> = ({ isAvailable, isActive }) => {
  if (!isActive) {
    return (
      <span className="inline-flex items-center gap-1.5 text-slate-400 text-xs font-medium">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
        Offline
      </span>
    );
  }

  if (isAvailable) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[#34D399] text-xs font-medium">
        <span className="w-1.5 h-1.5 rounded-full bg-[#34D399] animate-pulse" />
        Available
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-[#F59E0B] text-xs font-medium">
      <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
      On Duty
    </span>
  );
};
