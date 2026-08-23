import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import pricingRoutes from './routes/pricing.routes';
import orderRoutes from './routes/order.routes';
import zoneRoutes from './routes/zone.routes';
import adminRoutes from './routes/admin.routes';
import { errorHandler } from './middleware/error.middleware';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));

app.use(express.json());

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Last-Mile Delivery Tracker API is healthy', timestamp: new Date().toISOString() });
});

// API V1 Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/pricing', pricingRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1', zoneRoutes);
app.use('/api/v1', adminRoutes);

// Global Error Handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Last-Mile Delivery Tracker Backend running on port ${PORT}`);
});

export default app;
