import React from 'react';
import { OrderStatusHistory } from '../../types';
import { User } from 'lucide-react';

interface TimelineProps {
  history: OrderStatusHistory[];
}

export const TrackingTimeline: React.FC<TimelineProps> = ({ history }) => {
  if (!history || history.length === 0) {
    return <div className="text-slate-500 font-mono text-xs py-3">No status history timeline recorded.</div>;
  }

  return (
    <div className="relative pl-5 space-y-3.5 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-px before:bg-white/10">
      {history.map((item, idx) => {
        const isLatest = idx === history.length - 1;
        const isFailed = item.new_status === 'FAILED';
        const isDelivered = item.new_status === 'DELIVERED';

        let nodeColor = 'text-purple-400 border-purple-500/40';
        if (isDelivered) nodeColor = 'text-[#34D399] border-emerald-500/40';
        if (isFailed) nodeColor = 'text-[#F87171] border-rose-500/40';
        if (item.new_status === 'OUT_FOR_DELIVERY') nodeColor = 'text-[#F59E0B] border-amber-500/40';

        return (
          <div key={item.id || idx} className="relative fade-in">
            {/* Node circle */}
            <div
              className={`absolute -left-5 top-1 w-3.5 h-3.5 rounded-full border bg-[#050505] flex items-center justify-center ${nodeColor} ${
                isLatest && !isDelivered && !isFailed ? 'animate-pulse ring-2 ring-yellow-500/20' : ''
              }`}
            >
              <div className="w-1 h-1 rounded-full bg-current" />
            </div>

            <div className="bg-[#0A0A0A] border border-white/8 rounded-[6px] p-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono font-semibold text-xs text-white">
                  {item.new_status.replace(/_/g, ' ')}
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  {new Date(item.created_at).toLocaleString()}
                </span>
              </div>

              {item.reason && (
                <p className="text-xs text-slate-300 mt-1 bg-[#050505] p-2 rounded border border-white/5 font-mono">
                  {item.reason}
                </p>
              )}

              <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1.5 mt-1 border-t border-white/5 font-mono">
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3 text-slate-500" />
                  {item.actor?.name || 'System'} ({item.actor_role})
                </span>
                {item.previous_status && (
                  <span className="text-slate-500">
                    FROM: <code className="text-slate-300">{item.previous_status}</code>
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
