import { Router } from 'express';
import { OrderController } from '../controllers/order.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { UserRole } from '../types';

const router = Router();

router.use(authenticate);

router.post('/', requireRole(UserRole.CUSTOMER, UserRole.ADMIN), OrderController.createOrder);
router.get('/', OrderController.getOrders);
router.get('/:id', OrderController.getOrderById);
router.get('/:id/tracking', OrderController.getOrderTracking);
router.patch('/:id/status', requireRole(UserRole.AGENT, UserRole.ADMIN), OrderController.updateStatus);
router.post('/:id/reschedule', requireRole(UserRole.CUSTOMER, UserRole.ADMIN), OrderController.reschedule);

// Assignment endpoints (Admin only)
router.post('/:id/assign/auto', requireRole(UserRole.ADMIN), OrderController.autoAssign);
router.post('/:id/assign/manual', requireRole(UserRole.ADMIN), OrderController.manualAssign);

export default router;
