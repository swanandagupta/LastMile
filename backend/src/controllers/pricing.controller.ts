import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { RateEngineService } from '../services/rate-engine.service';
import { OrderType, PaymentType } from '../types';
import { z } from 'zod';

const pricingPreviewSchema = z.object({
  pickupPincode: z.string().min(1),
  dropPincode: z.string().min(1),
  lengthCm: z.number().positive(),
  breadthCm: z.number().positive(),
  heightCm: z.number().positive(),
  actualWeightKg: z.number().positive(),
  orderType: z.nativeEnum(OrderType),
  paymentType: z.nativeEnum(PaymentType),
});

export class PricingController {
  static async preview(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parsed = pricingPreviewSchema.parse(req.body);
      const result = await RateEngineService.calculatePrice(parsed);
      res.status(200).json(result);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          error: { code: 'VALIDATION_ERROR', message: err.errors[0].message },
        });
      }
      next(err);
    }
  }
}
