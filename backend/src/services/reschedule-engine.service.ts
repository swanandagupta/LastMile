import { prisma } from '../config/db';
import { OrderStatus, UserRole } from '../types';
import { AssignmentEngineService } from './assignment-engine.service';
import { NotificationService } from './notification.service';

export class RescheduleEngineService {
  /**
   * Handles customer/admin rescheduling of a failed delivery
   */
  static async rescheduleOrder(
    orderId: string,
    newScheduledDate: string,
    requestedByUserId: string,
    userRole: UserRole,
    reason?: string
  ) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      const err = new Error(`Order not found: ${orderId}`);
      (err as any).statusCode = 404;
      throw err;
    }

    // Verify status is FAILED
    if (order.current_status !== OrderStatus.FAILED) {
      const err = new Error(
        `INVALID_RESCHEDULE: Order #${orderId} is currently in '${order.current_status}' status. Rescheduling is only allowed for FAILED deliveries.`
      );
      (err as any).statusCode = 400;
      throw err;
    }

    // Check date validity
    const targetDate = new Date(newScheduledDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (isNaN(targetDate.getTime()) || targetDate < today) {
      const err = new Error('INVALID_DATE: Rescheduled delivery date must be a valid present or future date');
      (err as any).statusCode = 400;
      throw err;
    }

    // Atomic Reschedule Execution
    const result = await prisma.$transaction(async (tx) => {
      // 1. Record Reschedule Attempt
      const attempt = await tx.rescheduleAttempt.create({
        data: {
          order_id: orderId,
          requested_by: requestedByUserId,
          previous_scheduled_date: order.scheduled_delivery_date,
          new_scheduled_date: newScheduledDate,
          reason: reason ? reason.trim() : 'Customer requested delivery reschedule',
        },
      });

      // 2. Reset order status to BOOKED & update scheduled date
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          current_status: OrderStatus.BOOKED,
          scheduled_delivery_date: newScheduledDate,
          current_agent_id: null, // Clear agent pointer for re-assignment
        },
      });

      // 3. Insert immutable status history row
      await tx.orderStatusHistory.create({
        data: {
          order_id: orderId,
          previous_status: OrderStatus.FAILED,
          new_status: OrderStatus.BOOKED,
          changed_by: requestedByUserId,
          actor_role: userRole,
          reason: `Delivery rescheduled to ${newScheduledDate}. ${reason || ''}`,
        },
      });

      return { updatedOrder, attempt };
    });

    // 4. Trigger Auto Re-assignment
    await AssignmentEngineService.autoAssignAgent(orderId, requestedByUserId);

    // 5. Send Notification
    await NotificationService.sendNotification(
      orderId,
      order.customer_id,
      'EMAIL',
      'RESCHEDULE',
      `Delivery successfully rescheduled to ${newScheduledDate}. Order status re-opened as BOOKED.`
    );

    return result;
  }
}
