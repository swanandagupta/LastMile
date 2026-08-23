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

export enum AssignmentType {
  AUTO = 'AUTO',
  MANUAL = 'MANUAL',
}

export enum SurchargeType {
  FLAT = 'FLAT',
  PERCENTAGE = 'PERCENTAGE',
}

export enum NotifChannel {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
}

export enum NotifStatus {
  SENT = 'SENT',
  FAILED = 'FAILED',
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export interface PricingInput {
  pickupPincode: string;
  dropPincode: string;
  lengthCm: number;
  breadthCm: number;
  heightCm: number;
  actualWeightKg: number;
  orderType: OrderType;
  paymentType: PaymentType;
}

export interface PricingResult {
  pickupZone: { id: string; name: string };
  dropZone: { id: string; name: string };
  zoneRelation: ZoneRelation;
  volumetricWeightKg: number;
  chargeableWeightKg: number;
  baseCharge: number;
  codSurcharge: number;
  totalCharge: number;
}
