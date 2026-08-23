export enum UserRole {
  CUSTOMER = 'CUSTOMER',
  AGENT = 'AGENT',
  ADMIN = 'ADMIN',
}

export enum OrderType {
  B2B = 'B2B',
  B2C = 'B2C',
}

export enum PaymentType {
  PREPAID = 'PREPAID',
  COD = 'COD',
}

export enum ZoneRelation {
  INTRA = 'INTRA',
  INTER = 'INTER',
}

export enum OrderStatus {
  BOOKED = 'BOOKED',
  PICKED_UP = 'PICKED_UP',
  IN_TRANSIT = 'IN_TRANSIT',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
}

export enum SurchargeType {
  FLAT = 'FLAT',
  PERCENTAGE = 'PERCENTAGE',
}

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: UserRole;
  agentProfile?: DeliveryAgent;
}

export interface DeliveryAgent {
  id: string;
  user_id: string;
  zone_id: string;
  latitude?: number;
  longitude?: number;
  is_available: boolean;
  is_active: boolean;
  user?: User;
  zone?: Zone;
  assigned_orders?: Order[];
}

export interface Zone {
  id: string;
  name: string;
  areas?: ZoneArea[];
  _count?: { agents: number };
}

export interface ZoneArea {
  id: string;
  zone_id: string;
  pincode: string;
  city?: string;
  zone?: Zone;
}

export interface RateCard {
  id: string;
  order_type: OrderType;
  zone_relation: ZoneRelation;
  min_weight: number;
  max_weight?: number | null;
  base_price: number;
  rate_per_kg: number;
}

export interface CODConfig {
  id: string;
  order_type: OrderType;
  surcharge_type: 'FLAT' | 'PERCENTAGE';
  value: number;
}

export interface Order {
  id: string;
  customer_id: string;
  created_by: string;
  pickup_line1: string;
  pickup_line2?: string;
  pickup_city: string;
  pickup_state: string;
  pickup_pincode: string;
  drop_line1: string;
  drop_line2?: string;
  drop_city: string;
  drop_state: string;
  drop_pincode: string;
  pickup_zone_id: string;
  drop_zone_id: string;
  length_cm: number;
  breadth_cm: number;
  height_cm: number;
  actual_weight_kg: number;
  volumetric_weight_kg: number;
  chargeable_weight_kg: number;
  order_type: OrderType;
  payment_type: PaymentType;
  base_charge: number;
  cod_surcharge: number;
  total_charge: number;
  current_status: OrderStatus;
  current_agent_id?: string;
  scheduled_delivery_date?: string;
  created_at: string;
  updated_at: string;

  customer?: { id: string; name: string; email: string; phone?: string };
  pickup_zone?: Zone;
  drop_zone?: Zone;
  current_agent?: { id: string; user?: { name: string; phone?: string } };
  status_history?: OrderStatusHistory[];
  reschedule_attempts?: RescheduleAttempt[];
  assignments?: AgentAssignment[];
}

export interface OrderStatusHistory {
  id: string;
  order_id: string;
  previous_status?: OrderStatus | null;
  new_status: OrderStatus;
  changed_by: string;
  actor_role: UserRole;
  reason?: string;
  created_at: string;
  actor?: { name: string; role: UserRole };
}

export interface RescheduleAttempt {
  id: string;
  order_id: string;
  requested_by: string;
  previous_scheduled_date?: string;
  new_scheduled_date: string;
  reason?: string;
  created_at: string;
  requester?: { name: string };
}

export interface AgentAssignment {
  id: string;
  order_id: string;
  agent_id: string;
  assigned_by: string;
  assignment_type: 'AUTO' | 'MANUAL';
  assigned_at: string;
  unassigned_at?: string;
  is_active: boolean;
  agent?: { id: string; user?: { name: string } };
  assigner?: { name: string };
}

export interface PricingPreviewResult {
  pickupZone: { id: string; name: string };
  dropZone: { id: string; name: string };
  zoneRelation: ZoneRelation;
  volumetricWeightKg: number;
  chargeableWeightKg: number;
  baseCharge: number;
  codSurcharge: number;
  totalCharge: number;
}
