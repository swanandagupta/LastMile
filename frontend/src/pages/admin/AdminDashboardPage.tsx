import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { Order } from '../../types';
import { StatusBadge } from '../../components/ui/Badge';
import { SkeletonCard, SkeletonTable } from '../../components/ui/Skeleton';
import { ShieldCheck, Package, MapPin, CreditCard, Users, ArrowRight } from 'lucide-react';

export const AdminDashboardPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/orders')
      .then((res) => setOrders(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const totalOrders = orders.length;
  const unassignedOrders = orders.filter((o) => !o.current_agent_id && o.current_status !== 'DELIVERED').length;
  const failedOrders = orders.filter((o) => o.current_status === 'FAILED').length;
  const deliveredOrders = orders.filter((o) => o.current_status === 'DELIVERED').length;

  const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase();

  return (
    <div className="space-y-6 fade-in font-mono">
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div>
          <span className="text-[10px] font-bold text-[#F5C518] uppercase tracking-widest block mb-0.5">ADMINISTRATION CONSOLE</span>
          <h1 className="text-lg font-extrabold text-white tracking-wider uppercase flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#F5C518]" /> COMMAND CENTER
          </h1>
        </div>
        <span className="text-xs text-slate-400 bg-[#0A0A0A] px-3 py-1 rounded-[6px] border border-white/10">{todayStr}</span>
      </div>

      {/* Metric Strip */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : (
        <div className="ops-panel p-0 overflow-hidden grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-white/10">
          <div className="p-4">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">TOTAL PLATFORM ORDERS</p>
            <p className="text-2xl font-extrabold text-white mt-1">{totalOrders}</p>
          </div>
          <div className="p-4">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">UNASSIGNED</p>
            <p className="text-2xl font-extrabold text-[#F59E0B] mt-1">{unassignedOrders}</p>
          </div>
          <div className="p-4">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">FAILED ATTEMPTS</p>
            <p className="text-2xl font-extrabold text-[#F87171] mt-1">{failedOrders}</p>
          </div>
          <div className="p-4">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">DELIVERED</p>
            <p className="text-2xl font-extrabold text-[#34D399] mt-1">{deliveredOrders}</p>
          </div>
        </div>
      )}

      {/* Admin Modules Navigation */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link to="/admin/orders" className="ops-panel p-4 hover:border-yellow-500/40 transition group">
          <div className="flex items-center justify-between mb-2">
            <Package className="w-4 h-4 text-[#F5C518]" />
            <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-[#F5C518] transition" />
          </div>
          <h3 className="font-bold text-white text-xs uppercase">All Orders & Assignments</h3>
          <p className="text-[11px] text-slate-400 mt-1">Trigger Haversine auto-assignment or execute admin status overrides</p>
        </Link>

        <Link to="/admin/zones" className="ops-panel p-4 hover:border-purple-500/40 transition group">
          <div className="flex items-center justify-between mb-2">
            <MapPin className="w-4 h-4 text-[#C4B5FD]" />
            <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-[#C4B5FD] transition" />
          </div>
          <h3 className="font-bold text-white text-xs uppercase">Zones & Pincodes</h3>
          <p className="text-[11px] text-slate-400 mt-1">Configure operational zones and area pincode lookup mappings</p>
        </Link>

        <Link to="/admin/rate-cards" className="ops-panel p-4 hover:border-emerald-500/40 transition group">
          <div className="flex items-center justify-between mb-2">
            <CreditCard className="w-4 h-4 text-[#34D399]" />
            <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-[#34D399] transition" />
          </div>
          <h3 className="font-bold text-white text-xs uppercase">Rate Cards & COD</h3>
          <p className="text-[11px] text-slate-400 mt-1">Manage weight slabs, rates per kg, and flat/% COD surcharges</p>
        </Link>
      </div>

      {/* Stream */}
      <div className="ops-panel p-4 space-y-3">
        <h2 className="font-bold text-xs text-white uppercase tracking-wider border-b border-white/10 pb-2">
          SYSTEM ORDER STREAM
        </h2>
        {loading ? (
          <SkeletonTable rows={4} />
        ) : (
          <div className="divide-y divide-white/5">
            {orders.slice(0, 5).map((o) => (
              <div key={o.id} className="py-2.5 flex items-center justify-between gap-4 text-xs">
                <div>
                  <span className="font-bold text-[#F5C518]">#{o.id.slice(0, 8)}</span>
                  <span className="text-slate-400 ml-2">{o.pickup_city} &rarr; {o.drop_city}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-white font-bold">₹{o.total_charge.toFixed(2)}</span>
                  <StatusBadge status={o.current_status} size="sm" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
