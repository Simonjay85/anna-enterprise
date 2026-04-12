"use server";

import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

const getUser = async () => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user;
};

export const getUnreadNotificationsAction = async () => {
  const user = await getUser();
  const notifications = await prisma.appNotification.findMany({
    where: { userId: user.id, isRead: false },
    orderBy: { createdAt: 'asc' }
  });

  if (notifications.length > 0) {
    // Mark them as read instantly so we don't fetch them again next poll
    await prisma.appNotification.updateMany({
      where: { id: { in: notifications.map(n => n.id) } },
      data: { isRead: true }
    });
  }

  return notifications;
};
