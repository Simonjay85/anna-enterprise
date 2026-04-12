"use server";

import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

const getUser = async () => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user;
};

// Gets all workspaces the user is a member of
export async function getWorkspacesAction() {
  const user = await getUser();
  return await prisma.workspace.findMany({
    where: { members: { some: { userId: user.id } } },
    include: {
      members: { include: { user: true } },
      boards: true
    }
  });
}

// Create a new workspace
export async function createWorkspaceAction(name: string) {
  const user = await getUser();
  return await prisma.workspace.create({
    data: {
      name,
      members: {
        create: [
          { userId: user.id, role: "ADMIN" } // Creator is always ADMIN
        ]
      }
    },
    include: { boards: true, members: { include: { user: true } } }
  });
}

// Invite a user to workspace
export async function inviteWorkspaceMemberAction(workspaceId: string, email: string, role: string = "MEMBER") {
  const currentUser = await getUser();
  
  // Verify current user is an ADMIN of the workspace
  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: currentUser.id } }
  });

  if (!membership || membership.role !== "ADMIN") {
    throw new Error("Only workspace admins can invite members.");
  }

  // Find target user
  const targetUser = await prisma.user.findUnique({ where: { email } });
  if (!targetUser) {
    throw new Error("User with that email does not exist.");
  }

  // Check if they are already a member
  const existing = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: targetUser.id } }
  });

  if (existing) {
    throw new Error("User is already a member of this workspace.");
  }

  return await prisma.workspaceMember.create({
    data: {
      workspaceId,
      userId: targetUser.id,
      role
    },
    include: { user: true }
  });
}
