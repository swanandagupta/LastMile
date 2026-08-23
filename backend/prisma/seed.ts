import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Last-Mile Delivery Tracker database...');

  // Clean existing data
  await prisma.notification.deleteMany();
  await prisma.rescheduleAttempt.deleteMany();
  await prisma.agentAssignment.deleteMany();
  await prisma.orderStatusHistory.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cODConfig.deleteMany();
  await prisma.rateCard.deleteMany();
  await prisma.zoneArea.deleteMany();
  await prisma.deliveryAgent.deleteMany();
  await prisma.zone.deleteMany();
  await prisma.user.deleteMany();

  const commonPassword = await bcrypt.hash('password123', 10);

  // 1. Users
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@delivery.com',
      password_hash: commonPassword,
      name: 'System Admin',
      phone: '+919876543210',
      role: 'ADMIN',
    },
  });

  const customer1 = await prisma.user.create({
    data: {
      email: 'customer1@delivery.com',
      password_hash: commonPassword,
      name: 'Rahul Sharma (Apex Retail)',
      phone: '+919811122233',
      role: 'CUSTOMER',
    },
  });

  const customer2 = await prisma.user.create({
    data: {
      email: 'customer2@delivery.com',
      password_hash: commonPassword,
      name: 'Priya Patel (TechCorp B2B)',
      phone: '+919822233344',
      role: 'CUSTOMER',
    },
  });

  // 2. Zones & Areas
  const northZone = await prisma.zone.create({
    data: {
      name: 'North Zone (Delhi NCR)',
      areas: {
        create: [
          { pincode: '110001', city: 'New Delhi' },
          { pincode: '110002', city: 'Central Delhi' },
          { pincode: '110003', city: 'South Delhi' },
        ],
      },
    },
  });

  const southZone = await prisma.zone.create({
    data: {
      name: 'South Zone (Bengaluru)',
      areas: {
        create: [
          { pincode: '560001', city: 'MG Road' },
          { pincode: '560002', city: 'Koramangala' },
          { pincode: '560003', city: 'Indiranagar' },
        ],
      },
    },
  });

  const centralZone = await prisma.zone.create({
    data: {
      name: 'Central Zone (Mumbai)',
      areas: {
        create: [
          { pincode: '400001', city: 'Fort Mumbai' },
          { pincode: '400002', city: 'Kalbadevi' },
        ],
      },
    },
  });

  // 3. Delivery Agents with geographic coordinates
  const agentUser1 = await prisma.user.create({
    data: {
      email: 'agent1@delivery.com',
      password_hash: commonPassword,
      name: 'Vikram Singh (North Express - Close)',
      phone: '+919911100001',
      role: 'AGENT',
    },
  });

  const agentUser2 = await prisma.user.create({
    data: {
      email: 'agent2@delivery.com',
      password_hash: commonPassword,
      name: 'Suresh Kumar (South Express)',
      phone: '+919922200002',
      role: 'AGENT',
    },
  });

  const agentUser3 = await prisma.user.create({
    data: {
      email: 'agent3@delivery.com',
      password_hash: commonPassword,
      name: 'Ramesh Sawant (Central Express)',
      phone: '+919933300003',
      role: 'AGENT',
    },
  });

  const agentUser4 = await prisma.user.create({
    data: {
      email: 'agent4@delivery.com',
      password_hash: commonPassword,
      name: 'Amit Kumar (North Express - Further)',
      phone: '+919944400004',
      role: 'AGENT',
    },
  });

  const agent1 = await prisma.deliveryAgent.create({
    data: {
      user_id: agentUser1.id,
      zone_id: northZone.id,
      latitude: 28.6139,  // ~100 meters from pickup (28.6140, 77.2091)
      longitude: 77.2090,
      is_available: true,
      is_active: true,
    },
  });

  const agent2 = await prisma.deliveryAgent.create({
    data: {
      user_id: agentUser2.id,
      zone_id: southZone.id,
      latitude: 12.9716,
      longitude: 77.5946,
      is_available: true,
      is_active: true,
    },
  });

  const agent3 = await prisma.deliveryAgent.create({
    data: {
      user_id: agentUser3.id,
      zone_id: centralZone.id,
      latitude: 19.0760,
      longitude: 72.8777,
      is_available: true,
      is_active: true,
    },
  });

  const agent4 = await prisma.deliveryAgent.create({
    data: {
      user_id: agentUser4.id,
      zone_id: northZone.id,
      latitude: 28.6500,  // ~4.5 km from pickup (28.6140, 77.2091)
      longitude: 77.2300,
      is_available: true,
      is_active: true,
    },
  });

  // 4. Rate Cards
  await prisma.rateCard.createMany({
    data: [
      { order_type: 'B2B', zone_relation: 'INTRA', min_weight: 0, max_weight: 5.0, base_price: 100, rate_per_kg: 10 },
      { order_type: 'B2B', zone_relation: 'INTRA', min_weight: 5.001, max_weight: null, base_price: 150, rate_per_kg: 8 },
      { order_type: 'B2B', zone_relation: 'INTER', min_weight: 0, max_weight: 5.0, base_price: 200, rate_per_kg: 20 },
      { order_type: 'B2B', zone_relation: 'INTER', min_weight: 5.001, max_weight: null, base_price: 300, rate_per_kg: 15 },
      { order_type: 'B2C', zone_relation: 'INTRA', min_weight: 0, max_weight: 5.0, base_price: 60, rate_per_kg: 8 },
      { order_type: 'B2C', zone_relation: 'INTRA', min_weight: 5.001, max_weight: null, base_price: 90, rate_per_kg: 6 },
      { order_type: 'B2C', zone_relation: 'INTER', min_weight: 0, max_weight: 5.0, base_price: 120, rate_per_kg: 15 },
      { order_type: 'B2C', zone_relation: 'INTER', min_weight: 5.001, max_weight: null, base_price: 180, rate_per_kg: 12 },
    ],
  });

  // 5. COD Config
  await prisma.cODConfig.createMany({
    data: [
      { order_type: 'B2B', surcharge_type: 'FLAT', value: 50.0 },
      { order_type: 'B2C', surcharge_type: 'PERCENTAGE', value: 2.5 },
    ],
  });

  // 6. Orders
  const order1 = await prisma.order.create({
    data: {
      customer_id: customer1.id,
      created_by: customer1.id,
      pickup_line1: 'Connaught Place Block A',
      pickup_city: 'New Delhi',
      pickup_state: 'Delhi',
      pickup_pincode: '110001',
      drop_line1: 'Rajendra Place Tower 2',
      drop_city: 'New Delhi',
      drop_state: 'Delhi',
      drop_pincode: '110002',
      pickup_zone_id: northZone.id,
      drop_zone_id: northZone.id,
      pickup_latitude: 28.6140,
      pickup_longitude: 77.2091,
      length_cm: 30,
      breadth_cm: 20,
      height_cm: 15,
      actual_weight_kg: 2.5,
      volumetric_weight_kg: 1.8,
      chargeable_weight_kg: 2.5,
      order_type: 'B2C',
      payment_type: 'PREPAID',
      base_charge: 80.0,
      cod_surcharge: 0,
      total_charge: 80.0,
      current_status: 'DELIVERED',
      current_agent_id: agent1.id,
    },
  });

  await prisma.orderStatusHistory.createMany({
    data: [
      { order_id: order1.id, previous_status: null, new_status: 'BOOKED', changed_by: customer1.id, actor_role: 'CUSTOMER', reason: 'Order confirmed' },
      { order_id: order1.id, previous_status: 'BOOKED', new_status: 'PICKED_UP', changed_by: agentUser1.id, actor_role: 'AGENT', reason: 'Picked up from warehouse' },
      { order_id: order1.id, previous_status: 'PICKED_UP', new_status: 'IN_TRANSIT', changed_by: agentUser1.id, actor_role: 'AGENT', reason: 'Dispatched on transit hub route' },
      { order_id: order1.id, previous_status: 'IN_TRANSIT', new_status: 'OUT_FOR_DELIVERY', changed_by: agentUser1.id, actor_role: 'AGENT', reason: 'Out for final delivery' },
      { order_id: order1.id, previous_status: 'OUT_FOR_DELIVERY', new_status: 'DELIVERED', changed_by: agentUser1.id, actor_role: 'AGENT', reason: 'Delivered to recipient with OTP signature' },
    ],
  });

  const order2 = await prisma.order.create({
    data: {
      customer_id: customer1.id,
      created_by: customer1.id,
      pickup_line1: 'MG Road Plaza',
      pickup_city: 'Bengaluru',
      pickup_state: 'Karnataka',
      pickup_pincode: '560001',
      drop_line1: 'Koramangala 4th Block',
      drop_city: 'Bengaluru',
      drop_state: 'Karnataka',
      drop_pincode: '560002',
      pickup_zone_id: southZone.id,
      drop_zone_id: southZone.id,
      pickup_latitude: 12.9715,
      pickup_longitude: 77.5945,
      length_cm: 50,
      breadth_cm: 40,
      height_cm: 30,
      actual_weight_kg: 8.0,
      volumetric_weight_kg: 12.0,
      chargeable_weight_kg: 12.0,
      order_type: 'B2B',
      payment_type: 'COD',
      base_charge: 246.0,
      cod_surcharge: 50.0,
      total_charge: 296.0,
      current_status: 'FAILED',
      current_agent_id: agent2.id,
    },
  });

  await prisma.orderStatusHistory.createMany({
    data: [
      { order_id: order2.id, previous_status: null, new_status: 'BOOKED', changed_by: customer1.id, actor_role: 'CUSTOMER', reason: 'Order confirmed' },
      { order_id: order2.id, previous_status: 'BOOKED', new_status: 'PICKED_UP', changed_by: agentUser2.id, actor_role: 'AGENT', reason: 'Picked up' },
      { order_id: order2.id, previous_status: 'PICKED_UP', new_status: 'IN_TRANSIT', changed_by: agentUser2.id, actor_role: 'AGENT', reason: 'In transit' },
      { order_id: order2.id, previous_status: 'IN_TRANSIT', new_status: 'OUT_FOR_DELIVERY', changed_by: agentUser2.id, actor_role: 'AGENT', reason: 'Out for delivery' },
      { order_id: order2.id, previous_status: 'OUT_FOR_DELIVERY', new_status: 'FAILED', changed_by: agentUser2.id, actor_role: 'AGENT', reason: 'Customer door locked / unreachable' },
    ],
  });

  console.log('✅ Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
