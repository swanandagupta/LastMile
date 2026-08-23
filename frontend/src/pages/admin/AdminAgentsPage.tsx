import React, { useEffect, useState } from 'react';
import api from '../../api/axios';
import { DeliveryAgent, Zone } from '../../types';
import { Input } from '../../components/ui/Input';
import { AgentStatusBadge } from '../../components/ui/Badge';
import { SkeletonTable } from '../../components/ui/Skeleton';
import { Plus } from 'lucide-react';

export const AdminAgentsPage: React.FC = () => {
  const [agents, setAgents] = useState<DeliveryAgent[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);

  // New Agent Form initialized to empty strings (no pre-filled fake data!)
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [zoneId, setZoneId] = useState('');
  const [lat, setLat] = useState('28.6139');
  const [lng, setLng] = useState('77.2090');

  const fetchData = async () => {
    try {
      const [agentsRes, zonesRes] = await Promise.all([
        api.get('/agents'),
        api.get('/zones'),
      ]);
      setAgents(agentsRes.data);
      setZones(zonesRes.data);
      if (zonesRes.data.length > 0 && !zoneId) {
        setZoneId(zonesRes.data[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!zoneId) return alert('Select an operational zone');
    try {
      await api.post('/agents', {
        name,
        email,
        password,
        phone,
        zoneId,
        latitude: lat ? parseFloat(lat) : undefined,
        longitude: lng ? parseFloat(lng) : undefined,
      });

      setName('');
      setEmail('');
      setPassword('');
      setPhone('');
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Agent provisioning failed');
    }
  };

  const handleToggleAgentActive = async (id: string, currentActive: boolean) => {
    try {
      await api.patch(`/agents/${id}`, { isActive: !currentActive });
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to update agent status');
    }
  };

  return (
    <div className="space-y-5 fade-in font-sans">
      <div className="border-b border-white/8 pb-3">
        <h1 className="text-xl font-semibold text-white tracking-tight">Delivery Roster</h1>
        <p className="text-xs text-slate-400">Provision delivery agent accounts and inspect duty statuses</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Form */}
        <form onSubmit={handleCreateAgent} className="ops-panel p-4 space-y-3 lg:col-span-1 text-xs">
          <h2 className="font-semibold text-xs text-white uppercase tracking-wider border-b border-white/8 pb-2 flex items-center gap-2">
            <Plus className="w-3.5 h-3.5 text-[#F5C518]" /> Provision Agent Account
          </h2>

          <Input
            label="Agent Full Name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Vikram Singh"
          />

          <Input
            label="Email Address"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="agent@delivery.com"
          />

          <Input
            label="Password"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Operational Zone</label>
            <select value={zoneId} onChange={(e) => setZoneId(e.target.value)} className="w-full ops-input">
              {zones.map((z) => (
                <option key={z.id} value={z.id}>{z.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Input
              label="Latitude"
              type="number"
              step="0.0001"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
            />
            <Input
              label="Longitude"
              type="number"
              step="0.0001"
              value={lng}
              onChange={(e) => setLng(e.target.value)}
            />
          </div>

          <button type="submit" className="ops-btn-primary w-full py-2.5 mt-1">
            Provision Agent Account
          </button>
        </form>

        {/* Right: Roster Table */}
        <div className="lg:col-span-2 ops-panel p-4 space-y-3">
          <h2 className="font-semibold text-xs text-white uppercase tracking-wider border-b border-white/8 pb-2">
            Active Delivery Roster ({agents.length})
          </h2>

          {loading ? (
            <SkeletonTable rows={5} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#050505] text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-white/8">
                  <tr>
                    <th className="p-2.5">AGENT</th>
                    <th className="p-2.5">ZONE</th>
                    <th className="p-2.5">COORDINATES</th>
                    <th className="p-2.5">ACTIVE JOBS</th>
                    <th className="p-2.5">DUTY STATUS</th>
                    <th className="p-2.5 text-right">ACCOUNT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {agents.map((a) => (
                    <tr key={a.id} className="hover:bg-white/4">
                      <td className="p-2.5">
                        <p className="font-semibold text-white text-xs">{a.user?.name}</p>
                        <p className="text-[11px] text-slate-500">{a.user?.email}</p>
                      </td>
                      <td className="p-2.5 font-semibold text-[#F5C518]">{a.zone?.name}</td>
                      <td className="p-2.5 text-slate-400 text-[11px] font-mono">
                        {a.latitude && a.longitude ? `${a.latitude.toFixed(4)}, ${a.longitude.toFixed(4)}` : 'Zone-based'}
                      </td>
                      <td className="p-2.5 font-mono">
                        <span className="px-1.5 py-0.5 rounded font-bold bg-white/5 text-[#F59E0B] border border-white/8 text-[10px]">
                          {a.assigned_orders?.length || 0} active
                        </span>
                      </td>
                      <td className="p-2.5">
                        <AgentStatusBadge isAvailable={a.is_available} isActive={a.is_active} />
                      </td>
                      <td className="p-2.5 text-right">
                        <button
                          onClick={() => handleToggleAgentActive(a.id, a.is_active)}
                          className={`ops-btn-secondary py-0.5 px-2 text-[11px] ${
                            a.is_active ? 'hover:text-rose-400' : 'hover:text-emerald-400'
                          }`}
                        >
                          {a.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
