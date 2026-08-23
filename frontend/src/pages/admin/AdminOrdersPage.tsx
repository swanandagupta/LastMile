import React, { useEffect, useState } from 'react';
import api from '../../api/axios';
import { Order, OrderStatus, DeliveryAgent, Zone } from '../../types';
import { StatusBadge } from '../../components/ui/Badge';
import { TrackingTimeline } from '../../components/ui/Timeline';
import { SkeletonTable } from '../../components/ui/Skeleton';
import { Search, ShieldAlert, Zap, X } from 'lucide-react';

export const AdminOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [agents, setAgents] = useState<DeliveryAgent[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigningId, setAssigningId] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [zoneFilter, setZoneFilter] = useState<string>('ALL');
  const [agentFilter, setAgentFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Selected Order for Admin Action Drawer
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Admin Override State
  const [overrideStatus, setOverrideStatus] = useState<OrderStatus>(OrderStatus.DELIVERED);
  const [overrideReason, setOverrideReason] = useState<string>('');
  const [overrideLoading, setOverrideLoading] = useState<boolean>(false);

  // Manual Assign State
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');

  const fetchOrders = async () => {
    try {
      const queryParams = new URLSearchParams();
      if (statusFilter !== 'ALL') queryParams.append('status', statusFilter);
      if (zoneFilter !== 'ALL') queryParams.append('zone', zoneFilter);
      if (agentFilter !== 'ALL') queryParams.append('agent', agentFilter);

      const res = await api.get(`/orders?${queryParams.toString()}`);
      setOrders(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAuxData = async () => {
    try {
      const [agentsRes, zonesRes] = await Promise.all([
        api.get('/agents'),
        api.get('/zones'),
      ]);
      setAgents(agentsRes.data);
      setZones(zonesRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchAuxData();
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [statusFilter, zoneFilter, agentFilter]);

  const handleAutoAssign = async (orderId: string) => {
    setAssigningId(orderId);
    try {
      const res = await api.post(`/orders/${orderId}/assign/auto`);
      if (!res.data.success) {
        alert(`Auto-assignment notice: ${res.data.reason || 'No available agent in zone'}`);
      } else {
        alert(`Assigned nearest agent: ${res.data.agent.user.name} (${res.data.distanceKm !== null ? res.data.distanceKm.toFixed(2) + ' km away' : 'Zone Fallback'})`);
      }
      fetchOrders();
      if (selectedOrder?.id === orderId) {
        const refreshed = await api.get(`/orders/${orderId}/tracking`);
        setSelectedOrder(refreshed.data);
      }
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Auto-assignment failed');
    } finally {
      setAssigningId(null);
    }
  };

  const handleManualAssign = async (orderId: string) => {
    if (!selectedAgentId) return alert('Please select a delivery agent first');
    try {
      await api.post(`/orders/${orderId}/assign/manual`, { agentId: selectedAgentId });
      fetchOrders();
      if (selectedOrder?.id === orderId) {
        const refreshed = await api.get(`/orders/${orderId}/tracking`);
        setSelectedOrder(refreshed.data);
      }
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Manual assignment failed');
    }
  };

  const handleAdminOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    if (!overrideReason.trim()) return alert('Admin status override requires a non-empty reason field');

    setOverrideLoading(true);
    try {
      await api.patch(`/orders/${selectedOrder.id}/status`, {
        newStatus: overrideStatus,
        reason: overrideReason,
      });

      setOverrideReason('');
      fetchOrders();
      const refreshed = await api.get(`/orders/${selectedOrder.id}/tracking`);
      setSelectedOrder(refreshed.data);
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Admin override failed');
    } finally {
      setOverrideLoading(false);
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      o.id.toLowerCase().includes(term) ||
      o.customer?.name.toLowerCase().includes(term) ||
      o.pickup_city.toLowerCase().includes(term) ||
      o.drop_city.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6 fade-in font-mono">
      <div className="border-b border-white/10 pb-3">
        <span className="text-[10px] font-bold text-[#F5C518] uppercase tracking-widest block mb-0.5">ADMINISTRATION</span>
        <h1 className="text-lg font-extrabold text-white tracking-wider uppercase">ALL ORDERS & ASSIGNMENTS</h1>
      </div>

      {/* Filter Bar */}
      <div className="ops-panel p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search Order ID, customer, city..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full ops-input pl-9"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="ops-input">
            <option value="ALL">All Statuses</option>
            <option value={OrderStatus.BOOKED}>BOOKED</option>
            <option value={OrderStatus.PICKED_UP}>PICKED UP</option>
            <option value={OrderStatus.IN_TRANSIT}>IN TRANSIT</option>
            <option value={OrderStatus.OUT_FOR_DELIVERY}>OUT FOR DELIVERY</option>
            <option value={OrderStatus.DELIVERED}>DELIVERED</option>
            <option value={OrderStatus.FAILED}>FAILED</option>
          </select>

          <select value={zoneFilter} onChange={(e) => setZoneFilter(e.target.value)} className="ops-input">
            <option value="ALL">All Zones</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>{z.name}</option>
            ))}
          </select>

          <select value={agentFilter} onChange={(e) => setAgentFilter(e.target.value)} className="ops-input">
            <option value="ALL">All Agents</option>
            <option value="unassigned">⚠️ Unassigned Only</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>{a.user?.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Content Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Table */}
        <div className={`ops-panel overflow-hidden ${selectedOrder ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
          {loading ? (
            <SkeletonTable rows={6} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#050505] text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-white/10">
                  <tr>
                    <th className="p-3">ORDER ID</th>
                    <th className="p-3">CUSTOMER</th>
                    <th className="p-3">ROUTE</th>
                    <th className="p-3">TYPE</th>
                    <th className="p-3">AGENT</th>
                    <th className="p-3">STATUS</th>
                    <th className="p-3 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredOrders.length === 0 ? (
                    <tr><td colSpan={7} className="p-8 text-center text-slate-500">No matching orders found.</td></tr>
                  ) : (
                    filteredOrders.map((o) => (
                      <tr
                        key={o.id}
                        onClick={() => {
                          setSelectedOrder(o);
                          api.get(`/orders/${o.id}/tracking`).then((res) => setSelectedOrder(res.data));
                        }}
                        className={`cursor-pointer transition ${selectedOrder?.id === o.id ? 'bg-yellow-500/15' : 'hover:bg-white/5'}`}
                      >
                        <td className="p-3 font-bold text-[#F5C518]">#{o.id.slice(0, 8)}</td>
                        <td className="p-3 font-medium text-white">{o.customer?.name || 'N/A'}</td>
                        <td className="p-3 text-slate-400">{o.pickup_city} &rarr; {o.drop_city}</td>
                        <td className="p-3"><span className="px-1.5 py-0.5 rounded bg-white/5 font-bold">{o.order_type}</span></td>
                        <td className="p-3">
                          {o.current_agent ? (
                            <span className="text-slate-200">{o.current_agent.user?.name}</span>
                          ) : (
                            <span className="text-[#F59E0B] font-bold">UNASSIGNED</span>
                          )}
                        </td>
                        <td className="p-3"><StatusBadge status={o.current_status} size="sm" /></td>
                        <td className="p-3 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAutoAssign(o.id);
                            }}
                            disabled={assigningId === o.id}
                            className="ops-btn-secondary py-0.5 px-2 text-[10px]"
                          >
                            {assigningId === o.id ? 'Finding...' : 'Auto Assign'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right: Drawer */}
        {selectedOrder && (
          <div className="lg:col-span-1 ops-panel p-4 space-y-4 scale-in">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <h2 className="font-bold text-xs text-white">CONTROL PANEL: #{selectedOrder.id.slice(0, 8)}</h2>
              <button onClick={() => setSelectedOrder(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Manual Assignment */}
            <div className="p-3 bg-[#050505] rounded-[6px] border border-white/10 space-y-2">
              <p className="text-[9px] font-bold text-slate-500 uppercase">MANUAL AGENT ASSIGNMENT</p>
              <select value={selectedAgentId} onChange={(e) => setSelectedAgentId(e.target.value)} className="w-full ops-input">
                <option value="">Select Agent from Roster...</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.user?.name} ({a.zone?.name}) {a.is_available ? '🟢' : '🔴'}
                  </option>
                ))}
              </select>
              <div className="flex gap-2 pt-1">
                <button onClick={() => handleManualAssign(selectedOrder.id)} className="ops-btn-secondary w-full">
                  Assign
                </button>
                <button onClick={() => handleAutoAssign(selectedOrder.id)} disabled={assigningId === selectedOrder.id} className="ops-btn-primary w-full flex items-center justify-center gap-1">
                  <Zap className="w-3 h-3" /> Auto Assign
                </button>
              </div>
            </div>

            {/* Admin Override */}
            <form onSubmit={handleAdminOverride} className="p-3 bg-rose-950/30 border border-rose-800/60 rounded-[6px] space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-xs text-[#F87171]">
                <ShieldAlert className="w-3.5 h-3.5" /> ADMIN STATUS OVERRIDE
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">TARGET STATUS</label>
                <select value={overrideStatus} onChange={(e) => setOverrideStatus(e.target.value as OrderStatus)} className="w-full ops-input">
                  <option value={OrderStatus.BOOKED}>BOOKED</option>
                  <option value={OrderStatus.PICKED_UP}>PICKED UP</option>
                  <option value={OrderStatus.IN_TRANSIT}>IN TRANSIT</option>
                  <option value={OrderStatus.OUT_FOR_DELIVERY}>OUT FOR DELIVERY</option>
                  <option value={OrderStatus.DELIVERED}>DELIVERED</option>
                  <option value={OrderStatus.FAILED}>FAILED</option>
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">MANDATORY REASON</label>
                <textarea rows={2} required value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} placeholder="e.g. Admin manual correction" className="w-full ops-input" />
              </div>

              <button type="submit" disabled={overrideLoading} className="ops-btn-danger w-full">
                {overrideLoading ? 'Executing...' : 'Execute Admin Override'}
              </button>
            </form>

            <div className="pt-2">
              <h3 className="font-bold text-xs text-white mb-2">AUDIT TIMELINE</h3>
              <TrackingTimeline history={selectedOrder.status_history || []} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
