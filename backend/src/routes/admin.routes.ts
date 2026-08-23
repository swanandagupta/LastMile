import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { UserRole } from '../types';

const router = Router();

router.use(authenticate);

// Agent self availability update
router.patch('/agents/me/availability', requireRole(UserRole.AGENT), AdminController.updateSelfAvailability);

// Admin-only endpoints
router.get('/rate-cards', requireRole(UserRole.ADMIN), AdminController.getRateCards);
router.post('/rate-cards', requireRole(UserRole.ADMIN), AdminController.createRateCard);
router.patch('/rate-cards/:id', requireRole(UserRole.ADMIN), AdminController.updateRateCard);
router.delete('/rate-cards/:id', requireRole(UserRole.ADMIN), AdminController.deleteRateCard);

router.get('/cod-config', requireRole(UserRole.ADMIN), AdminController.getCODConfigs);
router.put('/cod-config/:orderType', requireRole(UserRole.ADMIN), AdminController.upsertCODConfig);

router.get('/agents', requireRole(UserRole.ADMIN), AdminController.getAgents);
router.post('/agents', requireRole(UserRole.ADMIN), AdminController.createAgent);
router.patch('/agents/:id', requireRole(UserRole.ADMIN), AdminController.updateAgentStatus);

router.get('/customers', requireRole(UserRole.ADMIN), AdminController.getCustomers);

export default router;
