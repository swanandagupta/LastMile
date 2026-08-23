import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { AuthService } from '../services/auth.service';
import { prisma } from '../config/db';
import { z } from 'zod';

const registerSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().optional().or(z.literal('')),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export class AuthController {
  static async register(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parsed = registerSchema.parse(req.body);
      const result = await AuthService.registerCustomer(parsed);
      res.status(201).json(result);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          error: { code: 'VALIDATION_ERROR', message: err.errors[0].message },
        });
      }
      next(err);
    }
  }

  static async login(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parsed = loginSchema.parse(req.body);
      const result = await AuthService.login(parsed);
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

  static async getMe(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) return res.status(401).json({ error: { code: 'UNAUTHENTICATED' } });
      const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
        include: { agent_profile: { include: { zone: true } } },
      });
      if (!user) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User profile not found' } });
      res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
        agentProfile: user.agent_profile,
      });
    } catch (err) {
      next(err);
    }
  }
}
