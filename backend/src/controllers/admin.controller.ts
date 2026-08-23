import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { prisma } from '../config/db';
import { OrderType, ZoneRelation, SurchargeType, UserRole } from '../types';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const rateCardSchema = z.object({
  orderType: z.nativeEnum(OrderType),
  zoneRelation: z.nativeEnum(ZoneRelation),
  minWeight: z.number().nonnegative(),
  maxWeight: z.number().nullable().optional(),
  basePrice: z.number().nonnegative(),
  ratePerKg: z.number().nonnegative(),
});

const codConfigSchema = z.object({
  surchargeType: z.nativeEnum(SurchargeType),
  value: z.number().nonnegative(),
});

const createAgentSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  phone: z.string().optional(),
  zoneId: z.string().min(1),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

const updateAvailabilitySchema = z.object({
  isAvailable: z.boolean(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

export class AdminController {
  // --- RATE CARDS ---
  static async getRateCards(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const rateCards = await prisma.rateCard.findMany({
        orderBy: [{ order_type: 'asc' }, { zone_relation: 'asc' }, { min_weight: 'asc' }],
      });
      res.status(200).json(rateCards);
    } catch (err) {
      next(err);
    }
  }

  static async createRateCard(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parsed = rateCardSchema.parse(req.body);
      const rateCard = await prisma.rateCard.create({
        data: {
          order_type: parsed.orderType,
          zone_relation: parsed.zoneRelation,
          min_weight: parsed.minWeight,
          max_weight: parsed.maxWeight !== undefined ? parsed.maxWeight : null,
          base_price: parsed.basePrice,
          rate_per_kg: parsed.ratePerKg,
        },
      });
      res.status(201).json(rateCard);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: err.errors[0].message } });
      }
      next(err);
    }
  }

  static async updateRateCard(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const parsed = rateCardSchema.parse(req.body);
      const rateCard = await prisma.rateCard.update({
        where: { id },
        data: {
          order_type: parsed.orderType,
          zone_relation: parsed.zoneRelation,
          min_weight: parsed.minWeight,
          max_weight: parsed.maxWeight !== undefined ? parsed.maxWeight : null,
          base_price: parsed.basePrice,
          rate_per_kg: parsed.ratePerKg,
        },
      });
      res.status(200).json(rateCard);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: err.errors[0].message } });
      }
      next(err);
    }
  }

  static async deleteRateCard(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await prisma.rateCard.delete({ where: { id } });
      res.status(200).json({ success: true, message: 'Rate card deleted' });
    } catch (err) {
      next(err);
    }
  }

  // --- COD CONFIG ---
  static async getCODConfigs(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const configs = await prisma.cODConfig.findMany();
      res.status(200).json(configs);
    } catch (err) {
      next(err);
    }
  }

  static async upsertCODConfig(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { orderType } = req.params;
      const parsed = codConfigSchema.parse(req.body);

      const config = await prisma.cODConfig.upsert({
        where: { order_type: orderType },
        update: { surcharge_type: parsed.surchargeType, value: parsed.value },
        create: { order_type: orderType, surcharge_type: parsed.surchargeType, value: parsed.value },
      });

      res.status(200).json(config);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: err.errors[0].message } });
      }
      next(err);
    }
  }

  // --- AGENTS ---
  static async getAgents(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const agents = await prisma.deliveryAgent.findMany({
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
          zone: true,
          assigned_orders: {
            where: { current_status: { in: ['BOOKED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'] } },
            select: { id: true, current_status: true },
          },
        },
      });
      res.status(200).json(agents);
    } catch (err) {
      next(err);
    }
  }

  static async createAgent(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parsed = createAgentSchema.parse(req.body);
      const hashedPassword = await bcrypt.hash(parsed.password, 10);

      const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email: parsed.email.toLowerCase().trim(),
            password_hash: hashedPassword,
            name: parsed.name.trim(),
            phone: parsed.phone ? parsed.phone.trim() : null,
            role: UserRole.AGENT,
          },
        });

        const agent = await tx.deliveryAgent.create({
          data: {
            user_id: user.id,
            zone_id: parsed.zoneId,
            latitude: parsed.latitude !== undefined ? parsed.latitude : null,
            longitude: parsed.longitude !== undefined ? parsed.longitude : null,
            is_available: true,
            is_active: true,
          },
          include: { user: true, zone: true },
        });

        return agent;
      });

      res.status(201).json(result);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: err.errors[0].message } });
      }
      next(err);
    }
  }

  static async updateAgentStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { zoneId, isActive } = req.body;

      const agent = await prisma.deliveryAgent.update({
        where: { id },
        data: {
          ...(zoneId ? { zone_id: zoneId } : {}),
          ...(isActive !== undefined ? { is_active: Boolean(isActive) } : {}),
        },
        include: { user: true, zone: true },
      });

      res.status(200).json(agent);
    } catch (err) {
      next(err);
    }
  }

  static async updateSelfAvailability(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) return res.status(401).json({ error: { code: 'UNAUTHENTICATED' } });
      const parsed = updateAvailabilitySchema.parse(req.body);

      const agent = await prisma.deliveryAgent.findUnique({
        where: { user_id: req.user.userId },
      });

      if (!agent) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Delivery agent profile not found' } });
      }

      const updated = await prisma.deliveryAgent.update({
        where: { id: agent.id },
        data: {
          is_available: parsed.isAvailable,
          ...(parsed.latitude !== undefined ? { latitude: parsed.latitude } : {}),
          ...(parsed.longitude !== undefined ? { longitude: parsed.longitude } : {}),
        },
        include: { user: true, zone: true },
      });

      res.status(200).json(updated);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: err.errors[0].message } });
      }
      next(err);
    }
  }

  static async getCustomers(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const customers = await prisma.user.findMany({
        where: { role: UserRole.CUSTOMER },
        select: { id: true, name: true, email: true, phone: true, created_at: true },
        orderBy: { name: 'asc' },
      });
      res.status(200).json(customers);
    } catch (err) {
      next(err);
    }
  }
}
