import React, { useEffect, useState } from 'react';
import api from '../../api/axios';
import { Order, OrderStatus } from '../../types';
import { StatusBadge, AgentStatusBadge } from '../../components/ui/Badge';
import { TrackingTimeline } from '../../components/ui/Timeline';
import { Modal } from '../../components/ui/Modal';
import { SkeletonTable } from '../../components/ui/Skeleton';
import { Truck, CheckCircle2, ShieldAlert, Navigation, ToggleLeft, ToggleRight, Package } from 'lucide-react';

export const AgentDashboardPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isAvailable, setIsAvailable] = useState<boolean>(true);
  const [isActive, setIsActive] = useState<boolean>(true);

  // Status update state
  const [failureReason, setFailureReason] = useState('');
  const [showFailureModal, setShowFailureModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchAssignedOrders = async () => {
    try {
      const res = await api.get('/orders');
      setOrders(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async () => {
    try {
      const res = await api.get('/auth/me');
      if (res.data.agentProfile) {
        setIsAvailable(res.data.agentProfile.is_available);
        setIsActive(res.data.agentProfile.is_active);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchAssignedOrders();
    fetchProfile();
  }, []);

  const handleToggleAvailability = async () => {
    try {
      const res = await api.patch('/agents/me/availability', {
        isAvailable: !isAvailable,
      });
      setIsAvailable(res.data.is_available);
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to update availability');
    }
  };

  const handleAdvanceStatus = async (targetStatus: OrderStatus, reason?: string) => {
    if (!selectedOrder) return;
    setError('');
    setActionLoading(true);

    try {
      await api.patch(`/orders/${selectedOrder.id}/status`, {
        newStatus: targetStatus,
        reason: reason || undefined,
      });

      setShowFailureModal(false);
      setFailureReason('');
      fetchAssignedOrders();

      const refreshed = await api.get(`/orders/${selectedOrder.id}/tracking`);
      setSelectedOrder(refreshed.data);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Status transition failed.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-5 fade-in font-sans">
      {/* Header Bar */}
      <div className="ops-panel p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <span className="text-[10px] font-mono font-semibold text-[#F5C518] uppercase tracking-wider block mb-0.5">AGENT CONSOLE</span>
          <h1 className="text-xl font-semibold text-white tracking-tight flex items-center gap-2">
            <Truck className="w-4 h-4 text-[#F5C518]" /> Delivery Dispatch
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <AgentStatusBadge isAvailable={isAvailable} isActive={isActive} />
          <button onClick={handleToggleAvailability} className="ops-btn-secondary gap-1.5">
            {isAvailable ? <ToggleRight className="w-4 h-4 text-[#34D399]" /> : <ToggleLeft className="w-4 h-4" />}
            Toggle Duty Status
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded bg-rose-950/80 border border-rose-800 text-[#F87171] text-xs">
          {error}
        </div>
      )}

      {/* Main Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Roster */}
        <div className="lg:col-span-1 ops-panel overflow-hidden">
          <div className="p-3 border-b border-white/8 text-xs font-semibold text-white uppercase flex items-center justify-between">
            <span>Assigned Jobs ({orders.length})</span>
          </div>

          {loading ? (
            <div className="p-3"><SkeletonTable rows={4} /></div>
          ) : orders.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">NO ASSIGNED DELIVERIES RIGHT NOW.</div>
          ) : (
            <div className="divide-y divide-white/5 max-h-[550px] overflow-y-auto">
              {orders.map((order) => {
                const isSelected = selectedOrder?.id === order.id;
                return (
                  <div
                    key={order.id}
                    onClick={() => {
                      setSelectedOrder(order);
                      api.get(`/orders/${order.id}/tracking`).then((res) => setSelectedOrder(res.data));
                    }}
                    className={`p-3 cursor-pointer transition ${
                      isSelected ? 'bg-yellow-500/15 border-l-2 border-[#F5C518]' : 'hover:bg-white/4'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono font-bold text-xs text-[#F5C518]">#{order.id.slice(0, 8)}</span>
                      <StatusBadge status={order.current_status} size="sm" />
                    </div>
                    <p className="text-xs text-slate-300">
                      {order.pickup_city} &rarr; {order.drop_city}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Customer: {order.customer?.name || 'N/A'}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Selected Delivery Execution Console */}
        <div className="lg:col-span-2 ops-panel p-5 space-y-4">
          {!selectedOrder ? (
            <div className="p-12 text-center text-slate-500 text-xs space-y-2">
              <Navigation className="w-6 h-6 text-slate-600 mx-auto" />
              <p>SELECT A DELIVERY JOB FROM THE ROSTER TO EXECUTE STATUS TRANSITIONS.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/8 pb-3">
                <div>
                  <h2 className="text-base font-semibold text-white font-mono">Job #{selectedOrder.id.slice(0, 8)}</h2>
                  <p className="text-[11px] text-slate-400">Scheduled: {selectedOrder.scheduled_delivery_date || 'Today'}</p>
                </div>
                <StatusBadge status={selectedOrder.current_status} />
              </div>

              {/* Action Buttons */}
              <div className="p-3 bg-[#050505] rounded border border-white/8 space-y-2">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Execute Status Transition</p>

                {selectedOrder.current_status === OrderStatus.BOOKED && (
                  <button onClick={() => handleAdvanceStatus(OrderStatus.PICKED_UP)} disabled={actionLoading} className="ops-btn-primary w-full gap-2">
                    <Package className="w-4 h-4" /> MARK PICKED UP (BOOKED &rarr; PICKED_UP)
                  </button>
                )}

                {selectedOrder.current_status === OrderStatus.PICKED_UP && (
                  <button onClick={() => handleAdvanceStatus(OrderStatus.IN_TRANSIT)} disabled={actionLoading} className="ops-btn-primary w-full gap-2">
                    <Truck className="w-4 h-4" /> MARK IN TRANSIT (PICKED_UP &rarr; IN_TRANSIT)
                  </button>
                )}

                {selectedOrder.current_status === OrderStatus.IN_TRANSIT && (
                  <button onClick={() => handleAdvanceStatus(OrderStatus.OUT_FOR_DELIVERY)} disabled={actionLoading} className="ops-btn-primary w-full gap-2">
                    <Navigation className="w-4 h-4" /> MARK OUT FOR DELIVERY (IN_TRANSIT &rarr; OUT_FOR_DELIVERY)
                  </button>
                )}

                {selectedOrder.current_status === OrderStatus.OUT_FOR_DELIVERY && (
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => handleAdvanceStatus(OrderStatus.DELIVERED, 'Delivered successfully to recipient')} disabled={actionLoading} className="ops-btn-primary bg-[#34D399] text-black hover:bg-emerald-400 gap-1.5">
                      <CheckCircle2 className="w-4 h-4" /> MARK DELIVERED
                    </button>
                    <button onClick={() => setShowFailureModal(true)} disabled={actionLoading} className="ops-btn-danger gap-1.5">
                      <ShieldAlert className="w-4 h-4" /> MARK FAILED ATTEMPT
                    </button>
                  </div>
                )}

                {['DELIVERED', 'FAILED'].includes(selectedOrder.current_status) && (
                  <p className="text-xs text-slate-500 italic">Order is in terminal state ({selectedOrder.current_status}). No further transitions allowed.</p>
                )}
              </div>

              {/* Failed Reason Modal */}
              <Modal isOpen={showFailureModal} onClose={() => setShowFailureModal(false)} title="Record Failed Delivery Attempt">
                <div className="space-y-3 text-xs">
                  <label className="block text-xs font-medium text-slate-400">Reason for Failed Attempt:</label>
                  <input type="text" required value={failureReason} onChange={(e) => setFailureReason(e.target.value)} placeholder="e.g. Customer door locked / unreachable" className="w-full ops-input" />
                  <div className="flex gap-2 justify-end pt-2">
                    <button onClick={() => setShowFailureModal(false)} className="ops-btn-secondary">Cancel</button>
                    <button onClick={() => handleAdvanceStatus(OrderStatus.FAILED, failureReason || 'Delivery attempt failed')} className="ops-btn-danger">
                      Submit Status
                    </button>
                  </div>
                </div>
              </Modal>

              {/* Location details */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 bg-[#050505] rounded border border-white/8">
                  <span className="text-[10px] text-slate-500 uppercase block">PICKUP</span>
                  <p className="text-white font-semibold mt-0.5">{selectedOrder.pickup_line1}</p>
                  <p className="text-slate-400 text-[11px]">{selectedOrder.pickup_city} - {selectedOrder.pickup_pincode}</p>
                </div>
                <div className="p-2.5 bg-[#050505] rounded border border-white/8">
                  <span className="text-[10px] text-slate-500 uppercase block">DROP</span>
                  <p className="text-white font-semibold mt-0.5">{selectedOrder.drop_line1}</p>
                  <p className="text-slate-400 text-[11px]">{selectedOrder.drop_city} - {selectedOrder.drop_pincode}</p>
                </div>
              </div>

              {/* Timeline */}
              <div className="pt-2 border-t border-white/8">
                <h3 className="font-semibold text-xs text-white mb-2">Audit History Timeline</h3>
                <TrackingTimeline history={selectedOrder.status_history || []} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
