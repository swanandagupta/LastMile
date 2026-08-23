import { Router } from 'express';
import { ZoneController } from '../controllers/zone.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { UserRole } from '../types';

const router = Router();

router.use(authenticate);

// Publicly accessible to authenticated users (e.g. for customer address dropdowns)
router.get('/zones', ZoneController.getZones);
router.get('/zone-areas', ZoneController.getAreas);

// Admin-only management
router.post('/zones', requireRole(UserRole.ADMIN), ZoneController.createZone);
router.patch('/zones/:id', requireRole(UserRole.ADMIN), ZoneController.updateZone);
router.delete('/zones/:id', requireRole(UserRole.ADMIN), ZoneController.deleteZone);

router.post('/zone-areas', requireRole(UserRole.ADMIN), ZoneController.createArea);
router.patch('/zone-areas/:id', requireRole(UserRole.ADMIN), ZoneController.updateArea);
router.delete('/zone-areas/:id', requireRole(UserRole.ADMIN), ZoneController.deleteArea);

export default router;
