import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db';
import { UserRole, JwtPayload } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-last-mile-delivery-2026';

export class AuthService {
  static generateToken(payload: JwtPayload): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
  }

  static verifyToken(token: string): JwtPayload {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  }

  static async registerCustomer(data: { email: string; password: string; name: string; phone?: string }) {
    const existing = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase().trim() },
    });

    if (existing) {
      const err = new Error('EMAIL_EXISTS: An account with this email address already exists');
      (err as any).statusCode = 400;
      throw err;
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        email: data.email.toLowerCase().trim(),
        password_hash: hashedPassword,
        name: data.name.trim(),
        phone: data.phone ? data.phone.trim() : null,
        role: UserRole.CUSTOMER,
      },
    });

    const token = this.generateToken({ userId: user.id, email: user.email, role: UserRole.CUSTOMER });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
      },
      token,
    };
  }

  static async login(data: { email: string; password: string }) {
    const user = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase().trim() },
      include: { agent_profile: true },
    });

    if (!user) {
      const err = new Error('INVALID_CREDENTIALS: Invalid email or password');
      (err as any).statusCode = 401;
      throw err;
    }

    const isMatch = await bcrypt.compare(data.password, user.password_hash);
    if (!isMatch) {
      const err = new Error('INVALID_CREDENTIALS: Invalid email or password');
      (err as any).statusCode = 401;
      throw err;
    }

    const token = this.generateToken({
      userId: user.id,
      email: user.email,
      role: user.role as UserRole,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
        agentProfile: user.agent_profile,
      },
      token,
    };
  }
}
