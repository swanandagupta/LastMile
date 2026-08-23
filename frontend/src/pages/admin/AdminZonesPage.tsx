import React, { useEffect, useState } from 'react';
import api from '../../api/axios';
import { Zone, ZoneArea } from '../../types';
import { Input } from '../../components/ui/Input';
import { SkeletonTable } from '../../components/ui/Skeleton';
import { Modal } from '../../components/ui/Modal';
import { Plus, Trash2, Globe, Building } from 'lucide-react';

export const AdminZonesPage: React.FC = () => {
  const [zones, setZones] = useState<Zone[]>([]);
  const [areas, setAreas] = useState<ZoneArea[]>([]);
  const [loading, setLoading] = useState(true);

  // Forms State initialized to empty strings (no pre-filled fake data!)
  const [newZoneName, setNewZoneName] = useState('');
  const [selectedZoneId, setSelectedZoneId] = useState('');
  const [newPincode, setNewPincode] = useState('');
  const [newCity, setNewCity] = useState('');

  // Delete Confirm Modal
  const [deleteModal, setDeleteModal] = useState<{ type: 'zone' | 'area'; id: string; name: string } | null>(null);

  const fetchZoneData = async () => {
    try {
      const [zonesRes, areasRes] = await Promise.all([
        api.get('/zones'),
        api.get('/zone-areas'),
      ]);
      setZones(zonesRes.data);
      setAreas(areasRes.data);
      if (zonesRes.data.length > 0 && !selectedZoneId) {
        setSelectedZoneId(zonesRes.data[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchZoneData();
  }, []);

  const handleCreateZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newZoneName.trim()) return;
    try {
      await api.post('/zones', { name: newZoneName });
      setNewZoneName('');
      fetchZoneData();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to create zone');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal) return;
    try {
      if (deleteModal.type === 'zone') {
        await api.delete(`/zones/${deleteModal.id}`);
      } else {
        await api.delete(`/zone-areas/${deleteModal.id}`);
      }
      setDeleteModal(null);
      fetchZoneData();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to delete item');
    }
  };

  const handleCreateArea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedZoneId || !newPincode.trim()) return;
    try {
      await api.post('/zone-areas', {
        zoneId: selectedZoneId,
        pincode: newPincode,
        city: newCity,
      });
      setNewPincode('');
      setNewCity('');
      fetchZoneData();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to map pincode area');
    }
  };

  return (
    <div className="space-y-5 fade-in font-sans">
      <div className="border-b border-white/8 pb-3">
        <h1 className="text-xl font-semibold text-white tracking-tight">Zones & Pincodes</h1>
        <p className="text-xs text-slate-400">Configure operational zones and area pincode lookup mappings</p>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(deleteModal)}
        onClose={() => setDeleteModal(null)}
        title={`Confirm Delete ${deleteModal?.type === 'zone' ? 'Zone' : 'Pincode Area'}`}
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-300">
            Are you sure you want to delete <strong className="text-white">{deleteModal?.name}</strong>?
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setDeleteModal(null)} className="ops-btn-secondary">Cancel</button>
            <button onClick={handleConfirmDelete} className="ops-btn-danger">Delete</button>
          </div>
        </div>
      </Modal>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left: Zones List & Creator */}
        <div className="ops-panel p-4 space-y-4">
          <h2 className="font-semibold text-xs text-white uppercase tracking-wider border-b border-white/8 pb-2 flex items-center gap-2">
            <Globe className="w-3.5 h-3.5 text-[#F5C518]" /> Operational Zones
          </h2>

          <form onSubmit={handleCreateZone} className="flex gap-2">
            <input
              type="text"
              required
              placeholder="e.g. West Zone (Pune)"
              value={newZoneName}
              onChange={(e) => setNewZoneName(e.target.value)}
              className="flex-1 ops-input"
            />
            <button type="submit" className="ops-btn-primary shrink-0 gap-1">
              <Plus className="w-3.5 h-3.5" /> Add Zone
            </button>
          </form>

          {loading ? (
            <SkeletonTable rows={3} />
          ) : (
            <div className="space-y-2">
              {zones.map((z) => (
                <div
                  key={z.id}
                  className={`p-3 rounded border flex items-center justify-between transition cursor-pointer ${
                    selectedZoneId === z.id ? 'bg-yellow-500/10 border-yellow-500/40' : 'bg-[#050505] border-white/8 hover:border-white/20'
                  }`}
                  onClick={() => setSelectedZoneId(z.id)}
                >
                  <div>
                    <p className="font-semibold text-white text-xs">{z.name}</p>
                    <p className="text-[11px] text-slate-400">
                      {z.areas?.length || 0} mapped pincodes | {z._count?.agents || 0} agents
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteModal({ type: 'zone', id: z.id, name: z.name });
                    }}
                    className="p-1 text-slate-500 hover:text-rose-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Area Pincodes Mapping */}
        <div className="ops-panel p-4 space-y-4">
          <h2 className="font-semibold text-xs text-white uppercase tracking-wider border-b border-white/8 pb-2 flex items-center gap-2">
            <Building className="w-3.5 h-3.5 text-[#C4B5FD]" /> Area Pincode Mapping
          </h2>

          <form onSubmit={handleCreateArea} className="space-y-3 text-xs">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Target Zone</label>
              <select
                value={selectedZoneId}
                onChange={(e) => setSelectedZoneId(e.target.value)}
                className="w-full ops-input"
              >
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>{z.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Pincode"
                required
                placeholder="e.g. 400001"
                value={newPincode}
                onChange={(e) => setNewPincode(e.target.value)}
              />
              <Input
                label="City / Region"
                placeholder="e.g. Fort Mumbai"
                value={newCity}
                onChange={(e) => setNewCity(e.target.value)}
              />
            </div>

            <button type="submit" className="ops-btn-primary w-full gap-1">
              <Plus className="w-3.5 h-3.5" /> Map Pincode Area
            </button>
          </form>

          {/* Table */}
          <div className="overflow-x-auto pt-1">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#050505] text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-white/8">
                <tr>
                  <th className="p-2.5">PINCODE</th>
                  <th className="p-2.5">CITY</th>
                  <th className="p-2.5">ZONE</th>
                  <th className="p-2.5 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {areas.map((a) => (
                  <tr key={a.id} className="hover:bg-white/4">
                    <td className="p-2.5 font-bold text-[#F5C518] font-mono">{a.pincode}</td>
                    <td className="p-2.5">{a.city || '-'}</td>
                    <td className="p-2.5 text-slate-400">{a.zone?.name}</td>
                    <td className="p-2.5 text-right">
                      <button
                        onClick={() => setDeleteModal({ type: 'area', id: a.id, name: `Pincode ${a.pincode}` })}
                        className="text-slate-500 hover:text-rose-400 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
