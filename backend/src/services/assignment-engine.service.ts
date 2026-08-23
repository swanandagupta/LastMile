import { prisma } from '../config/db';
import { AssignmentType, OrderStatus } from '../types';
import { NotificationService } from './notification.service';

export class AssignmentEngineService {
  /**
   * Haversine distance formula (in kilometers) between two lat/lng coordinates
   */
  static calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Auto-assigns nearest available agent to an order based on geographic Haversine distance,
   * falling back to zone workload round-robin if coordinates are missing.
   */
  static async autoAssignAgent(orderId: string, assignedByUserId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { pickup_zone: true, customer: true },
    });

    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }

    // 1. Fetch eligible agents in same operational zone first
    let candidates = await prisma.deliveryAgent.findMany({
      where: {
        is_active: true,
        is_available: true,
        zone_id: order.pickup_zone_id,
      },
      include: {
        user: true,
        zone: true,
        assigned_orders: {
          where: {
            current_status: {
              in: [OrderStatus.BOOKED, OrderStatus.PICKED_UP, OrderStatus.IN_TRANSIT, OrderStatus.OUT_FOR_DELIVERY],
            },
          },
        },
      },
    });

    // 2. Citywide fallback if no agents in same zone
    if (candidates.length === 0) {
      candidates = await prisma.deliveryAgent.findMany({
        where: {
          is_active: true,
          is_available: true,
        },
        include: {
          user: true,
          zone: true,
          assigned_orders: {
            where: {
              current_status: {
                in: [OrderStatus.BOOKED, OrderStatus.PICKED_UP, OrderStatus.IN_TRANSIT, OrderStatus.OUT_FOR_DELIVERY],
              },
            },
          },
        },
      });
    }

    if (candidates.length === 0) {
      return { success: false, reason: 'NO_AGENT_AVAILABLE', agent: null };
    }

    // 3. Compute Haversine distances when pickup coordinates & agent coordinates exist
    const pickupLat = order.pickup_latitude;
    const pickupLng = order.pickup_longitude;

    const candidatesWithDistance = candidates.map((candidate) => {
      let distanceKm: number | null = null;
      if (
        pickupLat !== null &&
        pickupLat !== undefined &&
        pickupLng !== null &&
        pickupLng !== undefined &&
        candidate.latitude !== null &&
        candidate.latitude !== undefined &&
        candidate.longitude !== null &&
        candidate.longitude !== undefined
      ) {
        distanceKm = this.calculateHaversineDistance(
          pickupLat,
          pickupLng,
          candidate.latitude,
          candidate.longitude
        );
      }

      return {
        ...candidate,
        distanceKm,
        activeWorkload: candidate.assigned_orders.length,
      };
    });

    // 4. Sort candidates: Nearest distance first (if distance is available),
    // then fewest active orders, then earliest onboarded timestamp.
    candidatesWithDistance.sort((a, b) => {
      if (a.distanceKm !== null && b.distanceKm !== null) {
        const distDiff = a.distanceKm - b.distanceKm;
        if (Math.abs(distDiff) > 0.001) return distDiff; // Sort by nearest distance
      } else if (a.distanceKm !== null) {
        return -1; // Prefer candidate with distance measurement
      } else if (b.distanceKm !== null) {
        return 1;
      }

      // Tie-break 1: Fewest active orders
      const workloadDiff = a.activeWorkload - b.activeWorkload;
      if (workloadDiff !== 0) return workloadDiff;

      // Tie-break 2: Earliest onboarded
      return new Date(a.user.created_at).getTime() - new Date(b.user.created_at).getTime();
    });

    const chosenAgent = candidatesWithDistance[0];

    console.log(
      `[AUTO_ASSIGNMENT] Order #${orderId.slice(0, 8)} assigned to Agent ${chosenAgent.user.name} ` +
        `(Distance: ${chosenAgent.distanceKm !== null ? chosenAgent.distanceKm.toFixed(2) + ' km' : 'Zone Fallback'}, ` +
        `Active Workload: ${chosenAgent.activeWorkload})`
    );

    // 5. Atomic Database Transaction
    await prisma.$transaction(async (tx) => {
      // Deactivate prior active assignments for this order
      await tx.agentAssignment.updateMany({
        where: { order_id: orderId, is_active: true },
        data: { is_active: false, unassigned_at: new Date() },
      });

      // Create active assignment record
      await tx.agentAssignment.create({
        data: {
          order_id: orderId,
          agent_id: chosenAgent.id,
          assigned_by: assignedByUserId,
          assignment_type: AssignmentType.AUTO,
          is_active: true,
        },
      });

      // Update Order current_agent pointer
      await tx.order.update({
        where: { id: orderId },
        data: { current_agent_id: chosenAgent.id },
      });
    });

    // 6. Trigger Non-blocking Notification
    NotificationService.sendNotification(
      orderId,
      chosenAgent.user_id,
      'EMAIL',
      'ASSIGNMENT',
      `New Delivery Assigned: Order #${orderId.slice(0, 8)}`
    ).catch((err) => console.error('[NOTIFICATION_BG_ERR]', err));

    return {
      success: true,
      agent: chosenAgent,
      distanceKm: chosenAgent.distanceKm,
      assignmentType: AssignmentType.AUTO,
    };
  }

  /**
   * Manually assigns a specific agent (Admin action)
   */
  static async manualAssignAgent(orderId: string, agentId: string, assignedByUserId: string) {
    const agent = await prisma.deliveryAgent.findUnique({
      where: { id: agentId },
      include: { user: true },
    });

    if (!agent || !agent.is_active) {
      throw new Error('AGENT_NOT_FOUND: Agent does not exist or is inactive');
    }

    await prisma.$transaction(async (tx) => {
      await tx.agentAssignment.updateMany({
        where: { order_id: orderId, is_active: true },
        data: { is_active: false, unassigned_at: new Date() },
      });

      await tx.agentAssignment.create({
        data: {
          order_id: orderId,
          agent_id: agentId,
          assigned_by: assignedByUserId,
          assignment_type: AssignmentType.MANUAL,
          is_active: true,
        },
      });

      await tx.order.update({
        where: { id: orderId },
        data: { current_agent_id: agentId },
      });
    });

    NotificationService.sendNotification(
      orderId,
      agent.user_id,
      'EMAIL',
      'ASSIGNMENT',
      `Manual Delivery Assignment: Order #${orderId.slice(0, 8)}`
    ).catch((err) => console.error('[NOTIFICATION_BG_ERR]', err));

    return { success: true, agent, assignmentType: AssignmentType.MANUAL };
  }
}
