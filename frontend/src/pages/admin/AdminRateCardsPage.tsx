import React, { useEffect, useState } from 'react';
import api from '../../api/axios';
import { RateCard, CODConfig, OrderType, ZoneRelation, SurchargeType } from '../../types';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { SkeletonTable } from '../../components/ui/Skeleton';
import { CreditCard, Plus, Trash2, DollarSign, Layers } from 'lucide-react';

export const AdminRateCardsPage: React.FC = () => {
  const [rateCards, setRateCards] = useState<RateCard[]>([]);
  const [codConfigs, setCodConfigs] = useState<CODConfig[]>([]);
  const [loading, setLoading] = useState(true);

  // Segmented Tab Filter
  const [activeTabOrderType, setActiveTabOrderType] = useState<OrderType>(OrderType.B2C);
  const [activeTabZoneRelation, setActiveTabZoneRelation] = useState<ZoneRelation>(ZoneRelation.INTRA);

  // Rate Card Form State
  const [orderType, setOrderType] = useState<OrderType>(OrderType.B2C);
  const [zoneRelation, setZoneRelation] = useState<ZoneRelation>(ZoneRelation.INTRA);
  const [minWeight, setMinWeight] = useState<string>('0');
  const [maxWeight, setMaxWeight] = useState<string>('');
  const [basePrice, setBasePrice] = useState<string>('');
  const [ratePerKg, setRatePerKg] = useState<string>('');

  // COD Config Form State
  const [codOrderType, setCodOrderType] = useState<OrderType>(OrderType.B2C);
  const [codSurchargeType, setCodSurchargeType] = useState<SurchargeType>(SurchargeType.PERCENTAGE);
  const [codValue, setCodValue] = useState<string>('');

  // Delete Confirm Modal
  const [deleteCardId, setDeleteCardId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [rcRes, codRes] = await Promise.all([
        api.get('/rate-cards'),
        api.get('/cod-config'),
      ]);
      setRateCards(rcRes.data);
      setCodConfigs(codRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateRateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!basePrice || !ratePerKg) return alert('Enter base price and rate per kg');
    try {
      await api.post('/rate-cards', {
        orderType,
        zoneRelation,
        minWeight: Number(minWeight),
        maxWeight: maxWeight.trim() === '' ? null : Number(maxWeight),
        basePrice: Number(basePrice),
        ratePerKg: Number(ratePerKg),
      });
      setBasePrice('');
      setRatePerKg('');
      setMaxWeight('');
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to create rate card slab');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteCardId) return;
    try {
      await api.delete(`/rate-cards/${deleteCardId}`);
      setDeleteCardId(null);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to delete rate card');
    }
  };

  const handleSaveCODConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codValue) return alert('Enter COD surcharge value');
    try {
      await api.put(`/cod-config/${codOrderType}`, {
        surchargeType: codSurchargeType,
        value: Number(codValue),
      });
      setCodValue('');
      fetchData();
      alert(`COD Config updated for ${codOrderType}`);
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to update COD config');
    }
  };

  const filteredRateCards = rateCards.filter(
    (rc) => rc.order_type === activeTabOrderType && rc.zone_relation === activeTabZoneRelation
  );

  return (
    <div className="space-y-5 fade-in font-sans">
      <div className="border-b border-white/8 pb-3">
        <h1 className="text-xl font-semibold text-white tracking-tight">Rate Cards & COD</h1>
        <p className="text-xs text-slate-400">Manage weight slabs, rates per kg, and flat or percentage COD surcharges</p>
      </div>

      {/* Delete Confirm Modal */}
      <Modal isOpen={Boolean(deleteCardId)} onClose={() => setDeleteCardId(null)} title="Confirm Delete Rate Slab">
        <div className="space-y-4 font-sans text-xs">
          <p className="text-slate-300">
            Are you sure you want to delete this rate card slab? Newly calculated orders will use remaining matrix slabs.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setDeleteCardId(null)} className="ops-btn-secondary">Cancel</button>
            <button onClick={handleConfirmDelete} className="ops-btn-danger">Delete Slab</button>
          </div>
        </div>
      </Modal>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left 2 Cols */}
        <div className="lg:col-span-2 space-y-5">
          {/* Rate Card Creator */}
          <form onSubmit={handleCreateRateCard} className="ops-panel p-4 space-y-3">
            <h2 className="font-semibold text-xs text-white uppercase tracking-wider border-b border-white/8 pb-2 flex items-center gap-2">
              <Plus className="w-3.5 h-3.5 text-[#34D399]" /> Add Weight Slab to Matrix
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Order Type</label>
                <select value={orderType} onChange={(e) => setOrderType(e.target.value as OrderType)} className="w-full ops-input">
                  <option value={OrderType.B2C}>B2C</option>
                  <option value={OrderType.B2B}>B2B</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Zone Relation</label>
                <select value={zoneRelation} onChange={(e) => setZoneRelation(e.target.value as ZoneRelation)} className="w-full ops-input">
                  <option value={ZoneRelation.INTRA}>INTRA (Same Zone)</option>
                  <option value={ZoneRelation.INTER}>INTER (Cross Zone)</option>
                </select>
              </div>

              <Input
                label="Min Weight (kg)"
                type="number"
                step="0.01"
                required
                value={minWeight}
                onChange={(e) => setMinWeight(e.target.value)}
                placeholder="0"
              />

              <Input
                label="Max Weight (blank=∞)"
                type="text"
                placeholder="e.g. 5.0 (Blank for ∞)"
                value={maxWeight}
                onChange={(e) => setMaxWeight(e.target.value)}
              />

              <Input
                label="Base Price (₹)"
                type="number"
                step="0.01"
                required
                placeholder="e.g. 60.00"
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
              />

              <Input
                label="Rate / kg (₹)"
                type="number"
                step="0.01"
                required
                placeholder="e.g. 8.00"
                value={ratePerKg}
                onChange={(e) => setRatePerKg(e.target.value)}
              />
            </div>

            <button type="submit" className="ops-btn-primary w-full">
              Add Weight Slab to Matrix
            </button>
          </form>

          {/* Filter Tabs & Table */}
          <div className="ops-panel p-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/8 pb-2">
              <h2 className="font-semibold text-xs text-white uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-[#34D399]" /> Active Rate Slabs
              </h2>

              <div className="flex items-center gap-1 bg-[#050505] p-1 rounded border border-white/8 text-[11px]">
                <button
                  type="button"
                  onClick={() => setActiveTabOrderType(OrderType.B2C)}
                  className={`px-2 py-0.5 rounded font-semibold transition ${
                    activeTabOrderType === OrderType.B2C ? 'bg-[#F5C518] text-black' : 'text-slate-400'
                  }`}
                >
                  B2C Slabs
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTabOrderType(OrderType.B2B)}
                  className={`px-2 py-0.5 rounded font-semibold transition ${
                    activeTabOrderType === OrderType.B2B ? 'bg-[#F5C518] text-black' : 'text-slate-400'
                  }`}
                >
                  B2B Slabs
                </button>
                <span className="w-px h-3 bg-white/10" />
                <button
                  type="button"
                  onClick={() => setActiveTabZoneRelation(ZoneRelation.INTRA)}
                  className={`px-2 py-0.5 rounded font-semibold transition ${
                    activeTabZoneRelation === ZoneRelation.INTRA ? 'bg-[#C4B5FD] text-black' : 'text-slate-400'
                  }`}
                >
                  INTRA-ZONE
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTabZoneRelation(ZoneRelation.INTER)}
                  className={`px-2 py-0.5 rounded font-semibold transition ${
                    activeTabZoneRelation === ZoneRelation.INTER ? 'bg-[#C4B5FD] text-black' : 'text-slate-400'
                  }`}
                >
                  INTER-ZONE
                </button>
              </div>
            </div>

            {loading ? (
              <SkeletonTable rows={4} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#050505] text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-white/8">
                    <tr>
                      <th className="p-2.5">TYPE</th>
                      <th className="p-2.5">RELATION</th>
                      <th className="p-2.5">SLAB RANGE (KG)</th>
                      <th className="p-2.5">BASE PRICE</th>
                      <th className="p-2.5">PER KG RATE</th>
                      <th className="p-2.5 text-right">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredRateCards.length === 0 ? (
                      <tr><td colSpan={6} className="p-6 text-center text-slate-500">No rate card slabs configured for this filter tab.</td></tr>
                    ) : (
                      filteredRateCards.map((rc) => (
                        <tr key={rc.id} className="hover:bg-white/4">
                          <td className="p-2.5 font-semibold text-white">{rc.order_type}</td>
                          <td className="p-2.5"><span className="px-1.5 py-0.5 rounded bg-white/5 text-slate-300 text-[11px] font-mono">{rc.zone_relation}</span></td>
                          <td className="p-2.5 font-mono">{rc.min_weight} kg &rarr; {rc.max_weight !== null ? `${rc.max_weight} kg` : '∞ (unbounded)'}</td>
                          <td className="p-2.5 font-semibold text-[#34D399] font-mono">₹{rc.base_price.toFixed(2)}</td>
                          <td className="p-2.5 font-semibold text-[#F5C518] font-mono">₹{rc.rate_per_kg.toFixed(2)} / kg</td>
                          <td className="p-2.5 text-right">
                            <button onClick={() => setDeleteCardId(rc.id)} className="text-slate-500 hover:text-rose-400 p-1">
                              <Trash2 className="w-3.5 h-3.5" />
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
        </div>

        {/* Right Col: COD Config Panel */}
        <div className="lg:col-span-1 space-y-5">
          <form onSubmit={handleSaveCODConfig} className="ops-panel p-4 space-y-3 text-xs">
            <h2 className="font-semibold text-xs text-white uppercase tracking-wider border-b border-white/8 pb-2 flex items-center gap-2">
              <DollarSign className="w-3.5 h-3.5 text-[#F5C518]" /> COD Surcharge Config
            </h2>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Order Type</label>
              <select value={codOrderType} onChange={(e) => setCodOrderType(e.target.value as OrderType)} className="w-full ops-input">
                <option value={OrderType.B2C}>B2C</option>
                <option value={OrderType.B2B}>B2B</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Surcharge Mode</label>
              <select value={codSurchargeType} onChange={(e) => setCodSurchargeType(e.target.value as SurchargeType)} className="w-full ops-input">
                <option value={SurchargeType.FLAT}>FLAT (Fixed ₹ Surcharge)</option>
                <option value={SurchargeType.PERCENTAGE}>PERCENTAGE (% of Base Charge)</option>
              </select>
            </div>

            <Input
              label={`Value (${codSurchargeType === 'FLAT' ? '₹ Amount' : '% Percentage'})`}
              type="number"
              step="0.01"
              required
              placeholder="e.g. 2.5"
              value={codValue}
              onChange={(e) => setCodValue(e.target.value)}
            />

            <button type="submit" className="ops-btn-primary w-full">
              Save COD Configuration
            </button>
          </form>

          {/* Summary */}
          <div className="ops-panel p-4 space-y-2 text-xs">
            <h3 className="font-semibold text-[11px] text-slate-400 uppercase">Active COD Rules</h3>
            {codConfigs.map((c) => (
              <div key={c.id} className="p-2 bg-[#050505] rounded border border-white/8 flex justify-between font-mono">
                <span className="font-semibold text-white">{c.order_type} COD</span>
                <span className="text-[#F5C518] font-semibold">
                  {c.surcharge_type === 'FLAT' ? `₹${c.value.toFixed(2)} (Flat)` : `${c.value}% of base`}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
