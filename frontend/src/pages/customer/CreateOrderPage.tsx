import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { OrderType, PaymentType, PricingPreviewResult } from '../../types';
import { Input } from '../../components/ui/Input';
import { Calculator, Package, MapPin, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';

export const CreateOrderPage: React.FC = () => {
  const navigate = useNavigate();

  // Form State initialized to EMPTY strings (no pre-filled fake data!)
  const [pickupLine1, setPickupLine1] = useState('');
  const [pickupLine2, setPickupLine2] = useState('');
  const [pickupCity, setPickupCity] = useState('');
  const [pickupState, setPickupState] = useState('');
  const [pickupPincode, setPickupPincode] = useState('');

  const [dropLine1, setDropLine1] = useState('');
  const [dropLine2, setDropLine2] = useState('');
  const [dropCity, setDropCity] = useState('');
  const [dropState, setDropState] = useState('');
  const [dropPincode, setDropPincode] = useState('');

  const [lengthCm, setLengthCm] = useState<string>('');
  const [breadthCm, setBreadthCm] = useState<string>('');
  const [heightCm, setHeightCm] = useState<string>('');
  const [actualWeightKg, setActualWeightKg] = useState<string>('');

  const [orderType, setOrderType] = useState<OrderType>(OrderType.B2C);
  const [paymentType, setPaymentType] = useState<PaymentType>(PaymentType.PREPAID);

  // Calculation & Booking State
  const [pricing, setPricing] = useState<PricingPreviewResult | null>(null);
  const [calcLoading, setCalcLoading] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setPricing(null);

    if (!lengthCm || !breadthCm || !heightCm || !actualWeightKg) {
      return setError('Please enter package dimensions and scale weight');
    }

    setCalcLoading(true);

    try {
      const res = await api.post('/pricing/preview', {
        pickupPincode,
        dropPincode,
        lengthCm: Number(lengthCm),
        breadthCm: Number(breadthCm),
        heightCm: Number(heightCm),
        actualWeightKg: Number(actualWeightKg),
        orderType,
        paymentType,
      });
      setPricing(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Price preview calculation failed. Verify pickup and drop pincodes.');
    } finally {
      setCalcLoading(false);
    }
  };

  const handleConfirmOrder = async () => {
    if (!pricing) return;
    setError('');
    setBookingLoading(true);

    try {
      const res = await api.post('/orders', {
        pickupLine1,
        pickupLine2,
        pickupCity,
        pickupState,
        pickupPincode,
        dropLine1,
        dropLine2,
        dropCity,
        dropState,
        dropPincode,
        lengthCm: Number(lengthCm),
        breadthCm: Number(breadthCm),
        heightCm: Number(heightCm),
        actualWeightKg: Number(actualWeightKg),
        orderType,
        paymentType,
      });

      navigate(`/customer/orders/${res.data.id}`);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Order booking failed.');
    } finally {
      setBookingLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5 fade-in font-sans">
      <div className="border-b border-white/8 pb-3">
        <h1 className="text-xl font-semibold text-white tracking-tight">Book Shipment</h1>
        <p className="text-xs text-slate-400">Calculate rate slabs and book a new last-mile delivery</p>
      </div>

      {error && (
        <div className="p-3 rounded bg-rose-950/70 border border-rose-800 text-[#F87171] text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleCalculate} className="space-y-4">
        {/* Addresses Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Pickup Address */}
          <div className="ops-panel p-4 space-y-3">
            <h2 className="font-semibold text-xs text-[#F5C518] uppercase tracking-wider flex items-center gap-2 border-b border-white/8 pb-2">
              <MapPin className="w-3.5 h-3.5" /> Pickup Location
            </h2>
            <Input
              label="Address Line 1"
              required
              value={pickupLine1}
              onChange={(e) => setPickupLine1(e.target.value)}
              placeholder="e.g. 110 Connaught Place"
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="City"
                required
                value={pickupCity}
                onChange={(e) => setPickupCity(e.target.value)}
                placeholder="e.g. New Delhi"
              />
              <Input
                label="Pincode"
                required
                value={pickupPincode}
                onChange={(e) => setPickupPincode(e.target.value)}
                placeholder="e.g. 110001"
              />
            </div>
          </div>

          {/* Drop Address */}
          <div className="ops-panel p-4 space-y-3">
            <h2 className="font-semibold text-xs text-[#C4B5FD] uppercase tracking-wider flex items-center gap-2 border-b border-white/8 pb-2">
              <MapPin className="w-3.5 h-3.5" /> Destination Drop
            </h2>
            <Input
              label="Address Line 1"
              required
              value={dropLine1}
              onChange={(e) => setDropLine1(e.target.value)}
              placeholder="e.g. 45 Koramangala 4th Block"
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="City"
                required
                value={dropCity}
                onChange={(e) => setDropCity(e.target.value)}
                placeholder="e.g. Bengaluru"
              />
              <Input
                label="Pincode"
                required
                value={dropPincode}
                onChange={(e) => setDropPincode(e.target.value)}
                placeholder="e.g. 560002"
              />
            </div>
          </div>
        </div>

        {/* Package Dimensions & Scale Weight */}
        <div className="ops-panel p-4 space-y-3">
          <h2 className="font-semibold text-xs text-white uppercase tracking-wider flex items-center gap-2 border-b border-white/8 pb-2">
            <Package className="w-3.5 h-3.5 text-[#F5C518]" /> Package Specifications
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Input
              label="Length (cm)"
              type="number"
              step="0.1"
              required
              min="0.1"
              value={lengthCm}
              onChange={(e) => setLengthCm(e.target.value)}
              placeholder="e.g. 40"
            />
            <Input
              label="Breadth (cm)"
              type="number"
              step="0.1"
              required
              min="0.1"
              value={breadthCm}
              onChange={(e) => setBreadthCm(e.target.value)}
              placeholder="e.g. 30"
            />
            <Input
              label="Height (cm)"
              type="number"
              step="0.1"
              required
              min="0.1"
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value)}
              placeholder="e.g. 20"
            />
            <Input
              label="Actual Weight (kg)"
              type="number"
              step="0.1"
              required
              min="0.1"
              value={actualWeightKg}
              onChange={(e) => setActualWeightKg(e.target.value)}
              placeholder="e.g. 3.5"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Order Type</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setOrderType(OrderType.B2C)}
                  className={`w-full h-9 rounded text-xs font-semibold border transition ${
                    orderType === OrderType.B2C ? 'bg-yellow-500/15 text-[#F5C518] border-yellow-500/40' : 'bg-[#050505] text-slate-400 border-white/10'
                  }`}
                >
                  B2C
                </button>
                <button
                  type="button"
                  onClick={() => setOrderType(OrderType.B2B)}
                  className={`w-full h-9 rounded text-xs font-semibold border transition ${
                    orderType === OrderType.B2B ? 'bg-yellow-500/15 text-[#F5C518] border-yellow-500/40' : 'bg-[#050505] text-slate-400 border-white/10'
                  }`}
                >
                  B2B
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Payment Mode</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentType(PaymentType.PREPAID)}
                  className={`w-full h-9 rounded text-xs font-semibold border transition ${
                    paymentType === PaymentType.PREPAID ? 'bg-purple-500/15 text-[#C4B5FD] border-purple-500/40' : 'bg-[#050505] text-slate-400 border-white/10'
                  }`}
                >
                  PREPAID
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentType(PaymentType.COD)}
                  className={`w-full h-9 rounded text-xs font-semibold border transition ${
                    paymentType === PaymentType.COD ? 'bg-purple-500/15 text-[#C4B5FD] border-purple-500/40' : 'bg-[#050505] text-slate-400 border-white/10'
                  }`}
                >
                  COD SURCHARGE
                </button>
              </div>
            </div>
          </div>
        </div>

        <button type="submit" disabled={calcLoading} className="ops-btn-secondary w-full gap-2">
          <Calculator className="w-4 h-4 text-[#F5C518]" />
          {calcLoading ? 'Calculating Rate Slabs...' : 'Preview Freight Charge'}
        </button>
      </form>

      {/* Pricing Calculation Result */}
      {pricing && (
        <div className="ops-panel p-5 border-yellow-500/40 bg-yellow-950/10 space-y-4 scale-in">
          <div className="flex items-center justify-between border-b border-white/8 pb-2">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#34D399]" /> Rate Calculation Result
            </h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-yellow-950/80 text-[#F5C518] border border-yellow-700">
              {pricing.zoneRelation} ZONE
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="bg-[#050505] p-2.5 rounded border border-white/8 font-mono">
              <span className="text-[10px] text-slate-500 block">VOLUMETRIC WEIGHT</span>
              <span className="font-bold text-[#F5C518]">{pricing.volumetricWeightKg} kg</span>
            </div>
            <div className="bg-[#050505] p-2.5 rounded border border-white/8 font-mono">
              <span className="text-[10px] text-slate-500 block">CHARGEABLE WEIGHT</span>
              <span className="font-bold text-[#C4B5FD]">{pricing.chargeableWeightKg} kg</span>
            </div>
            <div className="bg-[#050505] p-2.5 rounded border border-white/8 font-mono">
              <span className="text-[10px] text-slate-500 block">BASE FREIGHT</span>
              <span className="font-bold text-white">₹{pricing.baseCharge.toFixed(2)}</span>
            </div>
            <div className="bg-[#050505] p-2.5 rounded border border-white/8 font-mono">
              <span className="text-[10px] text-slate-500 block">COD SURCHARGE</span>
              <span className="font-bold text-amber-400">₹{pricing.codSurcharge.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-white/8">
            <span className="text-xs font-medium text-slate-300">TOTAL PAYABLE CHARGE:</span>
            <span className="text-base font-mono font-bold text-[#34D399]">₹{pricing.totalCharge.toFixed(2)}</span>
          </div>

          <button onClick={handleConfirmOrder} disabled={bookingLoading} className="ops-btn-primary w-full gap-2">
            {bookingLoading ? 'Confirming & Auto-Assigning Agent...' : 'Confirm & Book Shipment Now'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
