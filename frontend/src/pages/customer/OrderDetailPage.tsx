import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api/axios';
import { Order } from '../../types';
import { StatusBadge } from '../../components/ui/Badge';
import { TrackingTimeline } from '../../components/ui/Timeline';
import { Modal } from '../../components/ui/Modal';
import { Package, MapPin, User, ShieldAlert, RefreshCw, ArrowLeft } from 'lucide-react';

export const OrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Reschedule Modal State
  const [showReschedule, setShowReschedule] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  const [rescheduleError, setRescheduleError] = useState('');

  const fetchOrderDetails = () => {
    if (!id) return;
    setLoading(true);
    api.get(`/orders/${id}/tracking`)
      .then((res) => setOrder(res.data))
      .catch((err) => setError(err.response?.data?.error?.message || 'Failed to load order tracking details'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrderDetails();
  }, [id]);

  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !rescheduleDate) return;
    setRescheduleError('');
    setRescheduleLoading(true);

    try {
      await api.post(`/orders/${id}/reschedule`, {
        newDate: rescheduleDate,
        reason: rescheduleReason,
      });
      setShowReschedule(false);
      fetchOrderDetails();
    } catch (err: any) {
      setRescheduleError(err.response?.data?.error?.message || 'Reschedule failed.');
    } finally {
      setRescheduleLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500 font-mono text-xs">LOADING CONTROL SHEET...</div>;
  }

  if (error || !order) {
    return (
      <div className="p-8 ops-panel text-center space-y-3 text-xs font-mono">
        <p className="text-[#F87171]">{error || 'Order not found'}</p>
        <Link to="/customer/orders" className="text-[#F5C518] underline">
          &larr; Back to My Shipments
        </Link>
      </div>
    );
  }

  const isFailed = order.current_status === 'FAILED';

  return (
    <div className="max-w-5xl mx-auto space-y-5 fade-in font-mono">
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <Link to="/customer/orders" className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-[#F5C518] transition">
          <ArrowLeft className="w-3.5 h-3.5" /> ALL SHIPMENTS
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500">STATUS:</span>
          <StatusBadge status={order.current_status} />
        </div>
      </div>

      {/* Reschedule Alert Banner if Status is FAILED */}
      {isFailed && (
        <div className="p-4 rounded-[10px] bg-rose-950/70 border border-rose-800 text-rose-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 font-bold text-[#F87171]">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              DELIVERY ATTEMPT FAILED
            </div>
            <p className="text-slate-300 text-[11px]">Select a new delivery date to re-enter auto-assignment pipeline.</p>
          </div>
          <button onClick={() => setShowReschedule(true)} className="ops-btn-danger flex items-center gap-1.5 shrink-0">
            <RefreshCw className="w-3.5 h-3.5" />
            Reschedule Delivery Date
          </button>
        </div>
      )}

      {/* Reschedule Modal */}
      <Modal isOpen={showReschedule} onClose={() => setShowReschedule(false)} title="Reschedule Delivery Attempt">
        {rescheduleError && (
          <div className="p-3 rounded-[6px] bg-rose-950/80 border border-rose-800 text-[#F87171] text-xs">
            {rescheduleError}
          </div>
        )}

        <form onSubmit={handleRescheduleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">NEW DELIVERY DATE</label>
            <input type="date" required min={new Date().toISOString().split('T')[0]} value={rescheduleDate} onChange={(e) => setRescheduleDate(e.target.value)} className="w-full ops-input" />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">REASON / NOTES (OPTIONAL)</label>
            <textarea rows={2} value={rescheduleReason} onChange={(e) => setRescheduleReason(e.target.value)} placeholder="e.g. Deliver after 2 PM" className="w-full ops-input" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowReschedule(false)} className="ops-btn-secondary">Cancel</button>
            <button type="submit" disabled={rescheduleLoading} className="ops-btn-primary">
              {rescheduleLoading ? 'Submitting...' : 'Confirm Reschedule'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Two-Column Operational Control Sheet */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column: Order Header & Visual Tracking Timeline */}
        <div className="ops-panel p-5 space-y-5">
          <div>
            <span className="text-[10px] font-bold text-[#F5C518] uppercase tracking-widest block mb-0.5">ORDER CONTROL</span>
            <h1 className="text-xl font-extrabold text-white tracking-wider">#{order.id.slice(0, 8)}</h1>
            <p className="text-[11px] text-slate-400 mt-1">Booked: {new Date(order.created_at).toLocaleString()}</p>
          </div>

          <div className="border-t border-white/10 pt-4 space-y-3">
            <h2 className="font-bold text-xs text-white uppercase tracking-wider flex items-center gap-2">
              <Package className="w-3.5 h-3.5 text-[#F5C518]" /> TRACKING TIMELINE
            </h2>
            <TrackingTimeline history={order.status_history || []} />
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          <div className="ops-panel p-4 space-y-3 text-xs">
            <h2 className="font-bold text-xs text-white uppercase tracking-wider border-b border-white/10 pb-2 flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-[#F5C518]" /> SHIPMENT SPECIFICATION
            </h2>
            <div className="space-y-2">
              <div className="bg-[#050505] p-2.5 rounded-[6px] border border-white/10">
                <span className="text-[9px] text-slate-500 block uppercase">PICKUP</span>
                <span className="font-bold text-white text-xs block">{order.pickup_line1}</span>
                <span className="text-slate-400 text-[11px]">{order.pickup_city} - {order.pickup_pincode}</span>
              </div>
              <div className="bg-[#050505] p-2.5 rounded-[6px] border border-white/10">
                <span className="text-[9px] text-slate-500 block uppercase">DROP</span>
                <span className="font-bold text-white text-xs block">{order.drop_line1}</span>
                <span className="text-slate-400 text-[11px]">{order.drop_city} - {order.drop_pincode}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center text-[11px]">
                <div className="bg-[#050505] p-2 rounded border border-white/10">
                  <span className="text-slate-500 block text-[9px]">ACTUAL WEIGHT</span>
                  <span className="font-bold text-white">{order.actual_weight_kg} kg</span>
                </div>
                <div className="bg-[#050505] p-2 rounded border border-white/10">
                  <span className="text-slate-500 block text-[9px]">VOLUMETRIC</span>
                  <span className="font-bold text-[#F5C518]">{order.volumetric_weight_kg} kg</span>
                </div>
              </div>
            </div>
          </div>

          <div className="ops-panel p-4 space-y-2 text-xs">
            <h2 className="font-bold text-xs text-white uppercase tracking-wider border-b border-white/10 pb-2">
              PRICING SUMMARY
            </h2>
            <div className="flex justify-between text-slate-300">
              <span>BASE FREIGHT:</span>
              <span>₹{order.base_charge.toFixed(2)}</span>
            </div>
            {order.cod_surcharge > 0 && (
              <div className="flex justify-between text-[#F59E0B]">
                <span>COD SURCHARGE:</span>
                <span>+ ₹{order.cod_surcharge.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-extrabold text-white pt-2 border-t border-white/10">
              <span>FINAL CHARGE:</span>
              <span className="text-[#34D399]">₹{order.total_charge.toFixed(2)}</span>
            </div>
          </div>

          <div className="ops-panel p-4 space-y-2 text-xs">
            <h2 className="font-bold text-xs text-white uppercase tracking-wider border-b border-white/10 pb-2 flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-[#C4B5FD]" /> ASSIGNED AGENT
            </h2>
            {order.current_agent ? (
              <div className="space-y-1">
                <span className="font-bold text-white text-xs block">{order.current_agent.user?.name}</span>
                <span className="text-slate-400 text-[11px] block">Contact: {order.current_agent.user?.phone || 'N/A'}</span>
              </div>
            ) : (
              <span className="text-[#F59E0B] font-bold block">UNASSIGNED (Awaiting agent in zone)</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
