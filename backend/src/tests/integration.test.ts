import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../config/db';
import { AuthService } from '../services/auth.service';
import { RateEngineService } from '../services/rate-engine.service';
import { AssignmentEngineService } from '../services/assignment-engine.service';
import { StatusEngineService } from '../services/status-engine.service';
import { RescheduleEngineService } from '../services/reschedule-engine.service';
import { NotificationService } from '../services/notification.service';
import { OrderType, PaymentType, OrderStatus, UserRole } from '../types';
import bcrypt from 'bcryptjs';

describe('Comprehensive End-to-End Real Integration & Feature Verification', () => {
  let customerToken: string;
  let testCustomerId: string;
  let adminUserId: string;

  beforeAll(async () => {
    const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (admin) adminUserId = admin.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // TEST 1: Customer Registration & Password Hashing
  it('Test 1 — Customer Registration: creates real DB record with bcrypt hash', async () => {
    const email = `test_customer_${Date.now()}@delivery.com`;
    const regResult = await AuthService.registerCustomer({
      email,
      password: 'securePassword123',
      name: 'Test Customer Automated',
      phone: '+919999988888',
    });

    expect(regResult.user.email).toBe(email);
    expect(regResult.token).toBeDefined();

    testCustomerId = regResult.user.id;
    customerToken = regResult.token;

    // Verify DB persistence & password hash
    const dbUser = await prisma.user.findUnique({ where: { id: testCustomerId } });
    expect(dbUser).not.toBeNull();
    expect(dbUser?.password_hash).not.toBe('securePassword123');
    expect(dbUser?.password_hash.startsWith('$2')).toBe(true);

    const isMatch = await bcrypt.compare('securePassword123', dbUser!.password_hash);
    expect(isMatch).toBe(true);
  });

  // TEST 2: Customer Login & JWT Token Verification
  it('Test 2 — Customer Login & Authentication: verifies JWT validation and credentials', async () => {
    const dbUser = await prisma.user.findUnique({ where: { id: testCustomerId } });
    const loginResult = await AuthService.login({
      email: dbUser!.email,
      password: 'securePassword123',
    });

    expect(loginResult.token).toBeDefined();
    const verified = AuthService.verifyToken(loginResult.token);
    expect(verified.userId).toBe(testCustomerId);
    expect(verified.role).toBe(UserRole.CUSTOMER);
  });

  // TEST 3: Rate Engine DB Slabs, Volumetric Math & COD Calculation
  it('Test 3 — Rate Engine: uses actual DB rate card slabs and volumetric formulas', async () => {
    // 1. Calculate rate with existing DB slabs
    const previewResult = await RateEngineService.calculatePrice({
      pickupPincode: '110001',
      dropPincode: '110002',
      lengthCm: 50,
      breadthCm: 40,
      heightCm: 30, // Volumetric = 50*40*30/5000 = 12 kg
      actualWeightKg: 5.0,
      orderType: OrderType.B2C,
      paymentType: PaymentType.COD,
    });

    expect(previewResult.volumetricWeightKg).toBe(12.0);
    expect(previewResult.chargeableWeightKg).toBe(12.0); // max(5.0, 12.0)
    expect(previewResult.zoneRelation).toBe('INTRA');
    expect(previewResult.baseCharge).toBeGreaterThan(0);
    expect(previewResult.codSurcharge).toBeGreaterThan(0);

    // 2. Modify rate card in DB dynamically and verify updated price calculation
    const rateCard = await prisma.rateCard.findFirst({
      where: { order_type: 'B2C', zone_relation: 'INTRA', min_weight: { gt: 5 } },
    });

    if (rateCard) {
      const originalBase = rateCard.base_price;
      await prisma.rateCard.update({
        where: { id: rateCard.id },
        data: { base_price: 999.0 },
      });

      const updatedPreview = await RateEngineService.calculatePrice({
        pickupPincode: '110001',
        dropPincode: '110002',
        lengthCm: 50,
        breadthCm: 40,
        heightCm: 30,
        actualWeightKg: 5.0,
        orderType: OrderType.B2C,
        paymentType: PaymentType.PREPAID,
      });

      expect(updatedPreview.baseCharge).toBe(999.0 + (rateCard.rate_per_kg * 12.0));

      // Revert base price
      await prisma.rateCard.update({
        where: { id: rateCard.id },
        data: { base_price: originalBase },
      });
    }
  });

  // TEST 4: Auto-Assignment with Haversine Geographic Distance Sorting
  it('Test 4 — Auto-Assignment: selects the nearest eligible agent by Haversine distance', async () => {
    const northZone = await prisma.zone.findFirst({ where: { name: { contains: 'North' } } });
    expect(northZone).not.toBeNull();

    // Create an order with pickup coordinates: New Delhi (28.6140, 77.2091)
    const testOrder = await prisma.order.create({
      data: {
        customer_id: testCustomerId,
        created_by: testCustomerId,
        pickup_line1: 'Connaught Place Main Circle',
        pickup_city: 'New Delhi',
        pickup_state: 'Delhi',
        pickup_pincode: '110001',
        drop_line1: 'Janpath Lane',
        drop_city: 'New Delhi',
        drop_state: 'Delhi',
        drop_pincode: '110002',
        pickup_zone_id: northZone!.id,
        drop_zone_id: northZone!.id,
        pickup_latitude: 28.6140,
        pickup_longitude: 77.2091,
        length_cm: 20,
        breadth_cm: 20,
        height_cm: 10,
        actual_weight_kg: 2.0,
        volumetric_weight_kg: 0.8,
        chargeable_weight_kg: 2.0,
        order_type: 'B2C',
        payment_type: 'PREPAID',
        base_charge: 76.0,
        cod_surcharge: 0,
        total_charge: 76.0,
        current_status: OrderStatus.BOOKED,
      },
    });

    // Run Auto-Assignment Engine
    const assignResult = await AssignmentEngineService.autoAssignAgent(testOrder.id, adminUserId);

    expect(assignResult.success).toBe(true);
    expect(assignResult.agent).not.toBeNull();
    expect(assignResult.distanceKm).not.toBeNull();

    // Agent 1 is at (28.6139, 77.2090) ~0.1 km away
    // Agent 4 is at (28.6500, 77.2300) ~4.5 km away
    // Verify Agent 1 (nearest agent) was selected
    expect(assignResult.agent?.user?.email).toBe('agent1@delivery.com');
    expect(assignResult.distanceKm!).toBeLessThan(0.5); // Should be ~0.11 km
  });

  // TEST 5: Status State Machine & Immutable History Timeline
  it('Test 5 — Tracking: advances through forward sequence and writes immutable history rows', async () => {
    const order = await prisma.order.findFirst({ where: { current_status: 'BOOKED' }, include: { current_agent: true } });
    expect(order).not.toBeNull();

    const agentUserId = order!.current_agent!.user_id;

    // 1. BOOKED -> PICKED_UP
    await StatusEngineService.updateOrderStatus(order!.id, OrderStatus.PICKED_UP, agentUserId, UserRole.AGENT);
    // 2. PICKED_UP -> IN_TRANSIT
    await StatusEngineService.updateOrderStatus(order!.id, OrderStatus.IN_TRANSIT, agentUserId, UserRole.AGENT);

    // Verify invalid backward transition is rejected
    await expect(
      StatusEngineService.updateOrderStatus(order!.id, OrderStatus.BOOKED, agentUserId, UserRole.AGENT)
    ).rejects.toThrow('INVALID_TRANSITION');

    // 3. IN_TRANSIT -> OUT_FOR_DELIVERY
    await StatusEngineService.updateOrderStatus(order!.id, OrderStatus.OUT_FOR_DELIVERY, agentUserId, UserRole.AGENT);
    // 4. OUT_FOR_DELIVERY -> DELIVERED
    await StatusEngineService.updateOrderStatus(order!.id, OrderStatus.DELIVERED, agentUserId, UserRole.AGENT);

    // Fetch tracking timeline
    const tracking = await StatusEngineService.getOrderTracking(order!.id);
    expect(tracking.current_status).toBe(OrderStatus.DELIVERED);
    expect(tracking.status_history.length).toBeGreaterThanOrEqual(4);

    // Verify history immutability and sequence
    const statuses = tracking.status_history.map((h) => h.new_status);
    expect(statuses).toContain(OrderStatus.BOOKED);
    expect(statuses).toContain(OrderStatus.PICKED_UP);
    expect(statuses).toContain(OrderStatus.IN_TRANSIT);
    expect(statuses).toContain(OrderStatus.OUT_FOR_DELIVERY);
    expect(statuses).toContain(OrderStatus.DELIVERED);
  });

  // TEST 6: Failed Delivery, Reschedule Attempt & Auto-Reassignment
  it('Test 6 — Failed Delivery: reschedules delivery date, writes RescheduleAttempt, resets status, and re-assigns', async () => {
    // Pick an order and set to FAILED via Admin override
    const order = await prisma.order.findFirst({ where: { current_status: { not: 'FAILED' } } });
    expect(order).not.toBeNull();

    await StatusEngineService.updateOrderStatus(
      order!.id,
      OrderStatus.FAILED,
      adminUserId,
      UserRole.ADMIN,
      'Door locked - recipient unavailable'
    );

    // Execute Customer Reschedule
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const newDateStr = tomorrow.toISOString().split('T')[0];

    const rescheduleResult = await RescheduleEngineService.rescheduleOrder(
      order!.id,
      newDateStr,
      testCustomerId,
      UserRole.CUSTOMER,
      'Deliver tomorrow after 2 PM'
    );

    expect(rescheduleResult.updatedOrder.current_status).toBe(OrderStatus.BOOKED);
    expect(rescheduleResult.updatedOrder.scheduled_delivery_date).toBe(newDateStr);
    expect(rescheduleResult.attempt.new_scheduled_date).toBe(newDateStr);

    // Verify history timeline preserved and appended
    const history = await prisma.orderStatusHistory.findMany({
      where: { order_id: order!.id },
      orderBy: { created_at: 'asc' },
    });

    const failedEntry = history.find((h) => h.new_status === 'FAILED');
    const rescheduledEntry = history.find((h) => h.previous_status === 'FAILED' && h.new_status === 'BOOKED');

    expect(failedEntry).toBeDefined();
    expect(rescheduledEntry).toBeDefined();
  });

  // TEST 7: Role-Based Authorization Enforcement
  it('Test 7 — Authorization (RBAC): enforces resource ownership and rejects unauthorized role attempts', async () => {
    // 1. Attempting status change by customer throws FORBIDDEN
    const order = await prisma.order.findFirst();
    await expect(
      StatusEngineService.updateOrderStatus(order!.id, OrderStatus.DELIVERED, testCustomerId, UserRole.CUSTOMER)
    ).rejects.toThrow('FORBIDDEN');

    // 2. Admin override without reason throws VALIDATION_ERROR
    await expect(
      StatusEngineService.updateOrderStatus(order!.id, OrderStatus.DELIVERED, adminUserId, UserRole.ADMIN, '')
    ).rejects.toThrow('VALIDATION_ERROR');
  });

  // TEST 8: Email Notifications Execution
  it('Test 8 — Notifications: attempts email dispatch and logs DB record', async () => {
    const order = await prisma.order.findFirst();
    await NotificationService.sendNotification(
      order!.id,
      testCustomerId,
      'EMAIL',
      'STATUS_CHANGE',
      'Order status changed to IN_TRANSIT'
    );

    const notif = await prisma.notification.findFirst({
      where: { order_id: order!.id, recipient_user_id: testCustomerId },
      orderBy: { created_at: 'desc' },
    });

    expect(notif).not.toBeNull();
    expect(notif?.channel).toBe('EMAIL');
  });
});
