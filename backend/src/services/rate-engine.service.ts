import { prisma } from '../config/db';
import { ZoneService } from './zone.service';
import { OrderType, PaymentType, ZoneRelation, SurchargeType, PricingInput, PricingResult } from '../types';

export class RateEngineService {
  /**
   * Pure calculation helper - rounds a number to 2 decimal places using round-half-up
   */
  static round2(val: number): number {
    return Math.round((val + Number.EPSILON) * 100) / 100;
  }

  /**
   * Computes Volumetric Weight (L x B x H / 5000)
   */
  static calculateVolumetricWeight(lengthCm: number, breadthCm: number, heightCm: number): number {
    if (lengthCm <= 0 || breadthCm <= 0 || heightCm <= 0) {
      throw new Error('INVALID_DIMENSIONS: Length, breadth, and height must be strictly greater than zero');
    }
    return this.round2((lengthCm * breadthCm * heightCm) / 5000);
  }

  /**
   * Full Rate Calculation Pipeline
   */
  static async calculatePrice(input: PricingInput): Promise<PricingResult> {
    const {
      pickupPincode,
      dropPincode,
      lengthCm,
      breadthCm,
      heightCm,
      actualWeightKg,
      orderType,
      paymentType,
    } = input;

    if (actualWeightKg <= 0) {
      throw new Error('INVALID_WEIGHT: Actual weight must be strictly greater than zero');
    }

    // 1. Resolve Zones
    const pickupZone = await ZoneService.resolveZoneByPincode(pickupPincode);
    if (!pickupZone) {
      const err = new Error(`ZONE_NOT_MAPPED: Pickup pincode '${pickupPincode}' is not mapped to any operational zone`);
      (err as any).statusCode = 422;
      (err as any).code = 'ZONE_NOT_MAPPED';
      (err as any).pincode = pickupPincode;
      throw err;
    }

    const dropZone = await ZoneService.resolveZoneByPincode(dropPincode);
    if (!dropZone) {
      const err = new Error(`ZONE_NOT_MAPPED: Drop pincode '${dropPincode}' is not mapped to any operational zone`);
      (err as any).statusCode = 422;
      (err as any).code = 'ZONE_NOT_MAPPED';
      (err as any).pincode = dropPincode;
      throw err;
    }

    // 2. Zone Relation
    const zoneRelation = pickupZone.id === dropZone.id ? ZoneRelation.INTRA : ZoneRelation.INTER;

    // 3. Volumetric & Chargeable Weight
    const volumetricWeightKg = this.calculateVolumetricWeight(lengthCm, breadthCm, heightCm);
    const chargeableWeightKg = this.round2(Math.max(actualWeightKg, volumetricWeightKg));

    // 4. Rate Card Lookup
    const rateCards = await prisma.rateCard.findMany({
      where: {
        order_type: orderType,
        zone_relation: zoneRelation,
        min_weight: { lte: chargeableWeightKg },
      },
    });

    const rateCard = rateCards.find(
      (rc) => rc.max_weight === null || rc.max_weight >= chargeableWeightKg
    );

    if (!rateCard) {
      const err = new Error(
        `RATE_CARD_NOT_FOUND: No rate card slab configured for Order Type: ${orderType}, Zone Relation: ${zoneRelation}, Weight: ${chargeableWeightKg}kg`
      );
      (err as any).statusCode = 422;
      (err as any).code = 'RATE_CARD_NOT_FOUND';
      throw err;
    }

    // 5. Base Charge
    const baseCharge = this.round2(rateCard.base_price + rateCard.rate_per_kg * chargeableWeightKg);

    // 6. COD Surcharge
    let codSurcharge = 0;
    if (paymentType === PaymentType.COD) {
      const codConfig = await prisma.cODConfig.findUnique({
        where: { order_type: orderType },
      });

      if (!codConfig) {
        const err = new Error(`COD_CONFIG_NOT_FOUND: No COD surcharge configuration found for ${orderType}`);
        (err as any).statusCode = 422;
        (err as any).code = 'COD_CONFIG_NOT_FOUND';
        throw err;
      }

      if (codConfig.surcharge_type === SurchargeType.FLAT) {
        codSurcharge = codConfig.value;
      } else {
        codSurcharge = (baseCharge * codConfig.value) / 100;
      }
      codSurcharge = this.round2(codSurcharge);
    }

    // 7. Total Charge
    const totalCharge = this.round2(baseCharge + codSurcharge);

    return {
      pickupZone: { id: pickupZone.id, name: pickupZone.name },
      dropZone: { id: dropZone.id, name: dropZone.name },
      zoneRelation,
      volumetricWeightKg,
      chargeableWeightKg,
      baseCharge,
      codSurcharge,
      totalCharge,
    };
  }
}
