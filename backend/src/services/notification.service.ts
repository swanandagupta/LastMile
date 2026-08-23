import nodemailer from 'nodemailer';
import { prisma } from '../config/db';
import { NotifChannel, NotifStatus } from '../types';

export class NotificationService {
  private static transporter: nodemailer.Transporter | null = null;

  /**
   * Initializes or returns singleton Nodemailer SMTP transporter
   */
  private static getTransporter(): nodemailer.Transporter | null {
    if (this.transporter) return this.transporter;

    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT) || 587;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
      return this.transporter;
    }

    return null;
  }

  /**
   * Safe asynchronous notification dispatch.
   * Sends actual email via Nodemailer if SMTP is configured, records DB notification status,
   * and ensures errors are caught without blocking core database transactions.
   */
  static async sendNotification(
    orderId: string,
    recipientUserId: string,
    channel: 'EMAIL' | 'SMS',
    notifType: string,
    message: string
  ) {
    let status = NotifStatus.SENT;

    try {
      const recipientUser = await prisma.user.findUnique({
        where: { id: recipientUserId },
        select: { email: true, name: true, phone: true },
      });

      const recipientEmail = recipientUser?.email || 'customer@delivery.com';

      if (channel === 'EMAIL') {
        const transporter = this.getTransporter();
        if (transporter) {
          await transporter.sendMail({
            from: process.env.SMTP_FROM || 'noreply@deliverytracker.com',
            to: recipientEmail,
            subject: `[LastMile Tracker] Notification: ${notifType}`,
            text: `Hello ${recipientUser?.name || 'Customer'},\n\n${message}\n\nOrder ID: ${orderId}\n\nThank you for using LastMile Tracker.`,
            html: `<div style="font-family: sans-serif; padding: 16px; background: #0f172a; color: #f8fafc; rounded: 12px;">
              <h2 style="color: #38bdf8;">LastMile Tracker Notification</h2>
              <p>Hello <strong>${recipientUser?.name || 'Customer'}</strong>,</p>
              <p style="font-size: 16px;">${message}</p>
              <p style="color: #94a3b8; font-size: 12px;">Order ID: <code>${orderId}</code></p>
            </div>`,
          });
          console.log(`[REAL_EMAIL_SENT] SMTP Email successfully dispatched to ${recipientEmail} for Order #${orderId.slice(0, 8)}`);
        } else {
          console.log(`[EMAIL_DEV_FALLBACK] (No SMTP credentials configured in .env). Email to ${recipientEmail} logged: ${message}`);
        }
      } else {
        console.log(`[SMS_LOGGED] SMS to ${recipientUser?.phone || recipientUserId}: ${message}`);
      }
    } catch (err) {
      console.error(`[NOTIFICATION_FAILED] Channel ${channel} error:`, err);
      status = NotifStatus.FAILED;
    }

    try {
      await prisma.notification.create({
        data: {
          order_id: orderId,
          recipient_user_id: recipientUserId,
          channel: channel === 'EMAIL' ? NotifChannel.EMAIL : NotifChannel.SMS,
          notif_type: notifType,
          status,
        },
      });
    } catch (dbErr) {
      console.error('[NOTIFICATION_DB_WRITE_ERROR]', dbErr);
    }
  }
}
