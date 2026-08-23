import { prisma } from '../config/db';
import { OrderStatus, UserRole } from '../types';
import { NotificationService } from './notification.service';

export class StatusEngineService {
  /**
   * Allowed sequential forward transitions for Delivery Agents
   */
  private static ALLOWED_AGENT_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
    [OrderStatus.BOOKED]: [OrderStatus.PICKED_UP],
    [OrderStatus.PICKED_UP]: [OrderStatus.IN_TRANSIT],
    [OrderStatus.IN_TRANSIT]: [OrderStatus.OUT_FOR_DELIVERY],
    [OrderStatus.OUT_FOR_DELIVERY]: [OrderStatus.DELIVERED, OrderStatus.FAILED],
    [OrderStatus.DELIVERED]: [],
    [OrderStatus.FAILED]: [],
  };

  /**
   * Validates if a transition is permitted for an Agent
   */
  static isValidAgentTransition(currentStatus: OrderStatus, targetStatus: OrderStatus): boolean {
    const allowed = this.ALLOWED_AGENT_TRANSITIONS[currentStatus] || [];
    return allowed.includes(targetStatus);
  }

  /**
   * Performs an Order Status Update with State Machine Enforcement & Audit Logging
   */
  static async updateOrderStatus(
    orderId: string,
    targetStatus: OrderStatus,
    userId: string,
    userRole: UserRole,
    reason?: string
  ) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { customer: true, current_agent: { include: { user: true } } },
    });

    if (!order) {
      const err = new Error(`Order not found: ${orderId}`);
      (err as any).statusCode = 404;
      throw err;
    }

    const currentStatus = order.current_status as OrderStatus;

    // 1. Role-based transition check
    if (userRole === UserRole.AGENT) {
      // Ensure agent is assigned to this order
      if (!order.current_agent || order.current_agent.user_id !== userId) {
        const err = new Error('FORBIDDEN: You are not the assigned delivery agent for this order');
        (err as any).statusCode = 403;
        throw err;
      }

      // Check state machine rule
      if (!this.isValidAgentTransition(currentStatus, targetStatus)) {
        const err = new Error(
          `INVALID_TRANSITION: Cannot transition order status from '${currentStatus}' to '${targetStatus}'. Agent status progression must follow sequence.`
        );
        (err as any).statusCode = 409;
        (err as any).code = 'INVALID_TRANSITION';
        throw err;
      }
    } else if (userRole === UserRole.ADMIN) {
      // Admin override requires reason
      if (!reason || reason.trim().length === 0) {
        const err = new Error('VALIDATION_ERROR: Admin status override requires a non-empty reason field');
        (err as any).statusCode = 400;
        throw err;
      }
    } else {
      const err = new Error('FORBIDDEN: Customers cannot update order status directly');
      (err as any).statusCode = 403;
      throw err;
    }

    // 2. Atomic Database Update (Pointer + Immutable History)
    const result = await prisma.$transaction(async (tx) => {
      // Update order status pointer
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: { current_status: targetStatus },
      });

      // Insert immutable history entry
      const historyEntry = await tx.orderStatusHistory.create({
        data: {
          order_id: orderId,
          previous_status: currentStatus,
          new_status: targetStatus,
          changed_by: userId,
          actor_role: userRole,
          reason: reason ? reason.trim() : null,
        },
      });

      // If status changed to FAILED, deactivate active assignment to allow reassignment
      if (targetStatus === OrderStatus.FAILED) {
        await tx.agentAssignment.updateMany({
          where: { order_id: orderId, is_active: true },
          data: { is_active: false, unassigned_at: new Date() },
        });
      }

      return { updatedOrder, historyEntry };
    });

    // 3. Trigger Notification
    await NotificationService.sendNotification(
      orderId,
      order.customer_id,
      'EMAIL',
      'STATUS_CHANGE',
      `Order status updated to ${targetStatus}${reason ? ` (Reason: ${reason})` : ''}`
    );

    return result;
  }

  /**
   * Retrieves full immutable tracking timeline for an order
   */
  static async getOrderTracking(orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: { select: { id: true, name: true, email: true } },
        current_agent: { select: { id: true, user: { select: { name: true, phone: true } } } },
        status_history: {
          include: { actor: { select: { name: true, role: true } } },
          orderBy: { created_at: 'asc' },
        },
        reschedule_attempts: {
          include: { requester: { select: { name: true } } },
          orderBy: { created_at: 'asc' },
        },
        assignments: {
          include: {
            agent: { select: { id: true, user: { select: { name: true } } } },
            assigner: { select: { name: true } },
          },
          orderBy: { assigned_at: 'asc' },
        },
      },
    });

    if (!order) {
      const err = new Error(`Order not found: ${orderId}`);
      (err as any).statusCode = 404;
      throw err;
    }

    return order;
  }
}
