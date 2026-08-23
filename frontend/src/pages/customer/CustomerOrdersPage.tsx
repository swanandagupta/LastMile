import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { Order, OrderStatus } from '../../types';
import { StatusBadge } from '../../components/ui/Badge';
import { SkeletonTable } from '../../components/ui/Skeleton';
import { Search, Filter } from 'lucide-react';

export const CustomerOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredStatus, setFilteredStatus] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/orders')
      .then((res) => setOrders(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const filteredOrders = orders.filter((o) => {
    const matchesStatus = filteredStatus === 'ALL' || o.current_status === filteredStatus;
    const matchesSearch =
      o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.pickup_city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.drop_city.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6 fade-in font-mono">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-3">
        <div>
          <span className="text-[10px] font-mono font-bold text-[#F5C518] uppercase tracking-widest block mb-0.5">SHIPMENT ROSTER</span>
          <h1 className="text-lg font-mono font-extrabold text-white tracking-wider uppercase">MY ORDERS</h1>
        </div>
        <Link to="/customer/create-order" className="ops-btn-primary">
          + Book Shipment
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="ops-panel p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search Order ID, city..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full ops-input pl-9"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto font-mono text-xs">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={filteredStatus}
            onChange={(e) => setFilteredStatus(e.target.value)}
            className="ops-input"
          >
            <option value="ALL">All Statuses</option>
            <option value={OrderStatus.BOOKED}>BOOKED</option>
            <option value={OrderStatus.PICKED_UP}>PICKED UP</option>
            <option value={OrderStatus.IN_TRANSIT}>IN TRANSIT</option>
            <option value={OrderStatus.OUT_FOR_DELIVERY}>OUT FOR DELIVERY</option>
            <option value={OrderStatus.DELIVERED}>DELIVERED</option>
            <option value={OrderStatus.FAILED}>FAILED</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="ops-panel overflow-hidden">
        {loading ? (
          <SkeletonTable rows={5} />
        ) : filteredOrders.length === 0 ? (
          <div className="p-8 text-center text-slate-500 font-mono text-xs">No matching orders found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#050505] text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-white/10">
                <tr>
                  <th className="p-3">ORDER ID</th>
                  <th className="p-3">ROUTE</th>
                  <th className="p-3">TYPE</th>
                  <th className="p-3">CHARGE</th>
                  <th className="p-3">STATUS</th>
                  <th className="p-3 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-white/5 transition">
                    <td className="p-3 font-bold text-[#F5C518]">#{order.id.slice(0, 8)}</td>
                    <td className="p-3 text-slate-200">
                      <div>{order.pickup_city} &rarr; {order.drop_city}</div>
                      <div className="text-[10px] text-slate-500">{order.pickup_pincode} to {order.drop_pincode}</div>
                    </td>
                    <td className="p-3">
                      <span className="px-1.5 py-0.5 rounded text-[9px] bg-white/5 text-slate-300 mr-1">{order.order_type}</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] bg-white/5 text-slate-300">{order.payment_type}</span>
                    </td>
                    <td className="p-3 font-bold text-[#34D399]">₹{order.total_charge.toFixed(2)}</td>
                    <td className="p-3"><StatusBadge status={order.current_status} size="sm" /></td>
                    <td className="p-3 text-right">
                      <Link to={`/customer/orders/${order.id}`} className="ops-btn-secondary py-1 px-2.5">
                        Track
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
