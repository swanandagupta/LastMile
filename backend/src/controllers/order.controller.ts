import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { prisma } from '../config/db';
import { RateEngineService } from '../services/rate-engine.service';
import { StatusEngineService } from '../services/status-engine.service';
import { RescheduleEngineService } from '../services/reschedule-engine.service';
import { AssignmentEngineService } from '../services/assignment-engine.service';
import { OrderType, PaymentType, OrderStatus, UserRole } from '../types';
import { z } from 'zod';

const createOrderSchema = z.object({
  onBehalfOfCustomerId: z.string().optional(),
  pickupLine1: z.string().min(1),
  pickupLine2: z.string().optional(),
  pickupCity: z.string().min(1),
  pickupState: z.string().min(1),
  pickupPincode: z.string().min(1),
  dropLine1: z.string().min(1),
  dropLine2: z.string().optional(),
  dropCity: z.string().min(1),
  dropState: z.string().min(1),
  dropPincode: z.string().min(1),
  lengthCm: z.number().positive(),
  breadthCm: z.number().positive(),
  heightCm: z.number().positive(),
  actualWeightKg: z.number().positive(),
  orderType: z.nativeEnum(OrderType),
  paymentType: z.nativeEnum(PaymentType),
});

const updateStatusSchema = z.object({
  newStatus: z.nativeEnum(OrderStatus),
  reason: z.string().optional(),
});

const rescheduleSchema = z.object({
  newDate: z.string().min(1),
  reason: z.string().optional(),
});

const manualAssignSchema = z.object({
  agentId: z.string().min(1),
});

export class OrderController {
  static async createOrder(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) return res.status(401).json({ error: { code: 'UNAUTHENTICATED' } });

      const parsed = createOrderSchema.parse(req.body);

      // Determine customer ID
      let customerId = req.user.userId;
      if (req.user.role === UserRole.ADMIN && parsed.onBehalfOfCustomerId) {
        customerId = parsed.onBehalfOfCustomerId;
      }

      // Re-run rate calculation server-side for security
      const priceResult = await RateEngineService.calculatePrice({
        pickupPincode: parsed.pickupPincode,
        dropPincode: parsed.dropPincode,
        lengthCm: parsed.lengthCm,
        breadthCm: parsed.breadthCm,
        heightCm: parsed.heightCm,
        actualWeightKg: parsed.actualWeightKg,
        orderType: parsed.orderType,
        paymentType: parsed.paymentType,
      });

      // Atomic Order creation + Initial BOOKED History Row
      const newOrder = await prisma.$transaction(async (tx) => {
        const createdOrder = await tx.order.create({
          data: {
            customer_id: customerId,
            created_by: req.user!.userId,
            pickup_line1: parsed.pickupLine1,
            pickup_line2: parsed.pickupLine2 || null,
            pickup_city: parsed.pickupCity,
            pickup_state: parsed.pickupState,
            pickup_pincode: parsed.pickupPincode,
            drop_line1: parsed.dropLine1,
            drop_line2: parsed.dropLine2 || null,
            drop_city: parsed.dropCity,
            drop_state: parsed.dropState,
            drop_pincode: parsed.dropPincode,
            pickup_zone_id: priceResult.pickupZone.id,
            drop_zone_id: priceResult.dropZone.id,
            length_cm: parsed.lengthCm,
            breadth_cm: parsed.breadthCm,
            height_cm: parsed.heightCm,
            actual_weight_kg: parsed.actualWeightKg,
            volumetric_weight_kg: priceResult.volumetricWeightKg,
            chargeable_weight_kg: priceResult.chargeableWeightKg,
            order_type: parsed.orderType,
            payment_type: parsed.paymentType,
            base_charge: priceResult.baseCharge,
            cod_surcharge: priceResult.codSurcharge,
            total_charge: priceResult.totalCharge,
            current_status: OrderStatus.BOOKED,
          },
        });

        await tx.orderStatusHistory.create({
          data: {
            order_id: createdOrder.id,
            previous_status: null,
            new_status: OrderStatus.BOOKED,
            changed_by: req.user!.userId,
            actor_role: req.user!.role,
            reason: 'Order confirmed and created',
          },
        });

        return createdOrder;
      });

      // Auto-assign attempt immediately upon booking
      await AssignmentEngineService.autoAssignAgent(newOrder.id, req.user.userId);

      const refreshedOrder = await prisma.order.findUnique({
        where: { id: newOrder.id },
        include: { pickup_zone: true, drop_zone: true, current_agent: { include: { user: true } } },
      });

      res.status(201).json(refreshedOrder);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          error: { code: 'VALIDATION_ERROR', message: err.errors[0].message },
        });
      }
      next(err);
    }
  }

  static async getOrders(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) return res.status(401).json({ error: { code: 'UNAUTHENTICATED' } });

      const { status, zone, agent } = req.query;

      const whereClause: any = {};

      if (req.user.role === UserRole.CUSTOMER) {
        whereClause.customer_id = req.user.userId;
      } else if (req.user.role === UserRole.AGENT) {
        const agentProfile = await prisma.deliveryAgent.findUnique({
          where: { user_id: req.user.userId },
        });
        if (!agentProfile) {
          return res.status(404).json({ error: { code: 'AGENT_NOT_FOUND', message: 'Delivery agent profile missing' } });
        }
        whereClause.current_agent_id = agentProfile.id;
      }

      if (status && typeof status === 'string') {
        whereClause.current_status = status;
      }

      if (zone && typeof zone === 'string') {
        whereClause.OR = [{ pickup_zone_id: zone }, { drop_zone_id: zone }];
      }

      if (agent && typeof agent === 'string' && req.user.role === UserRole.ADMIN) {
        if (agent === 'unassigned') {
          whereClause.current_agent_id = null;
        } else {
          whereClause.current_agent_id = agent;
        }
      }

      const orders = await prisma.order.findMany({
        where: whereClause,
        include: {
          customer: { select: { id: true, name: true, email: true } },
          pickup_zone: true,
          drop_zone: true,
          current_agent: { select: { id: true, user: { select: { name: true, phone: true } } } },
        },
        orderBy: { created_at: 'desc' },
      });

      res.status(200).json(orders);
    } catch (err) {
      next(err);
    }
  }

  static async getOrderById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) return res.status(401).json({ error: { code: 'UNAUTHENTICATED' } });

      const { id } = req.params;
      const order = await prisma.order.findUnique({
        where: { id },
        include: {
          customer: { select: { id: true, name: true, email: true, phone: true } },
          pickup_zone: true,
          drop_zone: true,
          current_agent: { include: { user: { select: { id: true, name: true, phone: true } } } },
          assignments: {
            include: { agent: { include: { user: true } }, assigner: true },
            orderBy: { assigned_at: 'desc' },
          },
        },
      });

      if (!order) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Order not found' } });

      // Ownership enforcement
      if (req.user.role === UserRole.CUSTOMER && order.customer_id !== req.user.userId) {
        return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Access denied to this order' } });
      }

      if (req.user.role === UserRole.AGENT) {
        const agentProfile = await prisma.deliveryAgent.findUnique({
          where: { user_id: req.user.userId },
        });
        if (!agentProfile || order.current_agent_id !== agentProfile.id) {
          return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Access denied: You are not assigned to this order' } });
        }
      }

      res.status(200).json(order);
    } catch (err) {
      next(err);
    }
  }

  static async getOrderTracking(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) return res.status(401).json({ error: { code: 'UNAUTHENTICATED' } });
      const { id } = req.params;
      const tracking = await StatusEngineService.getOrderTracking(id);

      if (req.user.role === UserRole.CUSTOMER && tracking.customer_id !== req.user.userId) {
        return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Access denied' } });
      }

      res.status(200).json(tracking);
    } catch (err) {
      next(err);
    }
  }

  static async updateStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) return res.status(401).json({ error: { code: 'UNAUTHENTICATED' } });
      const { id } = req.params;
      const parsed = updateStatusSchema.parse(req.body);

      const result = await StatusEngineService.updateOrderStatus(
        id,
        parsed.newStatus,
        req.user.userId,
        req.user.role,
        parsed.reason
      );

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

  static async reschedule(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) return res.status(401).json({ error: { code: 'UNAUTHENTICATED' } });
      const { id } = req.params;
      const parsed = rescheduleSchema.parse(req.body);

      // Verify customer ownership if customer role
      const order = await prisma.order.findUnique({ where: { id } });
      if (!order) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Order not found' } });
      if (req.user.role === UserRole.CUSTOMER && order.customer_id !== req.user.userId) {
        return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Access denied' } });
      }

      const result = await RescheduleEngineService.rescheduleOrder(
        id,
        parsed.newDate,
        req.user.userId,
        req.user.role,
        parsed.reason
      );

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

  static async autoAssign(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) return res.status(401).json({ error: { code: 'UNAUTHENTICATED' } });
      const { id } = req.params;
      const result = await AssignmentEngineService.autoAssignAgent(id, req.user.userId);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async manualAssign(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) return res.status(401).json({ error: { code: 'UNAUTHENTICATED' } });
      const { id } = req.params;
      const parsed = manualAssignSchema.parse(req.body);
      const result = await AssignmentEngineService.manualAssignAgent(id, parsed.agentId, req.user.userId);
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
