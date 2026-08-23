import { Router } from 'express';
import { PricingController } from '../controllers/pricing.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post('/preview', authenticate, PricingController.preview);

export default router;
