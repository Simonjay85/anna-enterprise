"use server";

import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export const getUnreadNotificationsAction = async () => {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return []; // not logged in, return empty silently

    const notifications = await prisma.appNotification.findMany({
      where: { userId: session.user.id, isRead: false },
      orderBy: { createdAt: 'asc' }
    });

    if (notifications.length > 0) {
      await prisma.appNotification.updateMany({
        where: { id: { in: notifications.map(n => n.id) } },
        data: { isRead: true }
      });
    }

    return notifications;
  } catch {
    return []; // silently fail
  }
};
