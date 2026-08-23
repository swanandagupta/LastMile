import { prisma } from '../config/db';

export class ZoneService {
  /**
   * Resolves pincode to its mapped operational Zone
   */
  static async resolveZoneByPincode(pincode: string) {
    const area = await prisma.zoneArea.findUnique({
      where: { pincode: pincode.trim() },
      include: { zone: true },
    });
    return area ? area.zone : null;
  }

  static async getAllZones() {
    return prisma.zone.findMany({
      include: {
        areas: true,
        _count: { select: { agents: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  static async createZone(name: string) {
    return prisma.zone.create({
      data: { name: name.trim() },
    });
  }

  static async updateZone(id: string, name: string) {
    return prisma.zone.update({
      where: { id },
      data: { name: name.trim() },
    });
  }

  static async deleteZone(id: string) {
    return prisma.zone.delete({
      where: { id },
    });
  }

  static async getAllAreas() {
    return prisma.zoneArea.findMany({
      include: { zone: true },
      orderBy: { pincode: 'asc' },
    });
  }

  static async createZoneArea(zoneId: string, pincode: string, city?: string) {
    return prisma.zoneArea.create({
      data: {
        zone_id: zoneId,
        pincode: pincode.trim(),
        city: city ? city.trim() : null,
      },
      include: { zone: true },
    });
  }

  static async updateZoneArea(id: string, zoneId: string, pincode: string, city?: string) {
    return prisma.zoneArea.update({
      where: { id },
      data: {
        zone_id: zoneId,
        pincode: pincode.trim(),
        city: city ? city.trim() : null,
      },
      include: { zone: true },
    });
  }

  static async deleteZoneArea(id: string) {
    return prisma.zoneArea.delete({
      where: { id },
    });
  }
}
