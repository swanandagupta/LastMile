import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { ZoneService } from '../services/zone.service';
import { z } from 'zod';

const createZoneSchema = z.object({ name: z.string().min(1) });
const createAreaSchema = z.object({
  zoneId: z.string().min(1),
  pincode: z.string().min(1),
  city: z.string().optional(),
});

export class ZoneController {
  static async getZones(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const zones = await ZoneService.getAllZones();
      res.status(200).json(zones);
    } catch (err) {
      next(err);
    }
  }

  static async createZone(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parsed = createZoneSchema.parse(req.body);
      const zone = await ZoneService.createZone(parsed.name);
      res.status(201).json(zone);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: err.errors[0].message } });
      }
      next(err);
    }
  }

  static async updateZone(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const parsed = createZoneSchema.parse(req.body);
      const zone = await ZoneService.updateZone(id, parsed.name);
      res.status(200).json(zone);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: err.errors[0].message } });
      }
      next(err);
    }
  }

  static async deleteZone(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await ZoneService.deleteZone(id);
      res.status(200).json({ success: true, message: 'Zone deleted' });
    } catch (err) {
      next(err);
    }
  }

  static async getAreas(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const areas = await ZoneService.getAllAreas();
      res.status(200).json(areas);
    } catch (err) {
      next(err);
    }
  }

  static async createArea(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parsed = createAreaSchema.parse(req.body);
      const area = await ZoneService.createZoneArea(parsed.zoneId, parsed.pincode, parsed.city);
      res.status(201).json(area);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: err.errors[0].message } });
      }
      next(err);
    }
  }

  static async updateArea(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const parsed = createAreaSchema.parse(req.body);
      const area = await ZoneService.updateZoneArea(id, parsed.zoneId, parsed.pincode, parsed.city);
      res.status(200).json(area);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: err.errors[0].message } });
      }
      next(err);
    }
  }

  static async deleteArea(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await ZoneService.deleteZoneArea(id);
      res.status(200).json({ success: true, message: 'Area mapping deleted' });
    } catch (err) {
      next(err);
    }
  }
}
