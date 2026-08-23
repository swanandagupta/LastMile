import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { Order } from '../../types';
import { StatusBadge } from '../../components/ui/Badge';
import { SkeletonCard, SkeletonTable } from '../../components/ui/Skeleton';
import { PlusCircle, Package, Truck, Inbox } from 'lucide-react';

export const CustomerDashboardPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/orders')
      .then((res) => setOrders(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const totalOrders = orders.length;
  const activeCount = orders.filter((o) => !['DELIVERED', 'FAILED'].includes(o.current_status)).length;
  const deliveredCount = orders.filter((o) => o.current_status === 'DELIVERED').length;
  const failedCount = orders.filter((o) => o.current_status === 'FAILED').length;

  const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase();

  return (
    <div className="space-y-6 fade-in font-sans">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-white/8 pb-3">
        <div>
          <span className="text-[10px] font-mono font-semibold text-[#F5C518] uppercase tracking-wider block mb-0.5">CUSTOMER PORTAL</span>
          <h1 className="text-xl font-semibold text-white tracking-tight">Operations Control</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-slate-400 bg-[#0A0A0A] px-3 py-1.5 rounded border border-white/8">{todayStr}</span>
          <Link to="/customer/create-order" className="ops-btn-primary flex items-center gap-1.5">
            <PlusCircle className="w-3.5 h-3.5" /> Book Shipment
          </Link>
        </div>
      </div>

      {/* Top Metric Strip */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : (
        <div className="ops-panel p-0 overflow-hidden grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-white/8">
          <div className="p-4">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">TOTAL SHIPMENTS</p>
            <p className="text-2xl font-mono font-bold text-white mt-1">{totalOrders}</p>
          </div>
          <div className="p-4">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">ACTIVE IN TRANSIT</p>
            <p className="text-2xl font-mono font-bold text-[#F5C518] mt-1">{activeCount}</p>
          </div>
          <div className="p-4">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">DELIVERED</p>
            <p className="text-2xl font-mono font-bold text-[#34D399] mt-1">{deliveredCount}</p>
          </div>
          <div className="p-4">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">REQUIRES ACTION</p>
            <p className="text-2xl font-mono font-bold text-[#F87171] mt-1">{failedCount}</p>
          </div>
        </div>
      )}

      {/* Asymmetric Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 ops-panel p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-white/8 pb-2.5">
            <h2 className="font-semibold text-xs text-white uppercase tracking-wider flex items-center gap-2">
              <Package className="w-3.5 h-3.5 text-[#F5C518]" /> Live Orders Stream
            </h2>
            <Link to="/customer/orders" className="text-xs font-semibold text-[#C4B5FD] hover:underline flex items-center gap-1">
              View All ({orders.length}) &rarr;
            </Link>
          </div>

          {loading ? (
            <SkeletonTable rows={4} />
          ) : orders.length === 0 ? (
            <div className="p-10 text-center text-slate-500 text-xs space-y-2">
              <Inbox className="w-8 h-8 text-slate-600 mx-auto" />
              <p>NO SHIPMENTS BOOKED YET.</p>
              <Link to="/customer/create-order" className="text-[#F5C518] font-bold underline inline-block">
                + Book first delivery
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {orders.slice(0, 5).map((order) => (
                <div key={order.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[#F5C518]">#{order.id.slice(0, 8)}</span>
                      <StatusBadge status={order.current_status} size="sm" />
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/5 text-slate-300 border border-white/8">{order.order_type}</span>
                    </div>
                    <p className="text-slate-400 text-xs">
                      {order.pickup_city} ({order.pickup_pincode}) &rarr; {order.drop_city} ({order.drop_pincode})
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-white text-xs">₹{order.total_charge.toFixed(2)}</span>
                    <Link to={`/customer/orders/${order.id}`} className="ops-btn-secondary h-8 px-3">
                      Track
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Side Control Box */}
        <div className="lg:col-span-1 ops-panel p-4 space-y-4">
          <h2 className="font-semibold text-xs text-white uppercase tracking-wider flex items-center gap-2 border-b border-white/8 pb-2.5">
            <Truck className="w-3.5 h-3.5 text-[#C4B5FD]" /> Operational Directives
          </h2>

          <div className="space-y-3">
            <div className="p-3 bg-[#050505] rounded border border-white/8 text-xs space-y-1">
              <span className="text-[10px] font-semibold text-[#F5C518] uppercase block">Rate Calculation Engine</span>
              <p className="text-slate-300 text-xs">Dynamic volumetric rates based on L×B×H / 5000 formula.</p>
            </div>

            <div className="p-3 bg-[#050505] rounded border border-white/8 text-xs space-y-1">
              <span className="text-[10px] font-semibold text-[#C4B5FD] uppercase block">Haversine Auto-Assign</span>
              <p className="text-slate-300 text-xs">Automatic nearest agent geographic distance calculation.</p>
            </div>

            <Link to="/customer/create-order" className="ops-btn-primary w-full">
              Start New Shipment Booking &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
