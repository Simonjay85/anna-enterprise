'use server';

import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { triggerRulesForCardMove } from '@/actions/automationAction';
import { revalidatePath } from 'next/cache';

const getUser = async () => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user;
};

export const getBoardAction = async (boardId: string) => {
  const user = await getUser();
  
  // Need to ensure user is in the workspace
  const board = await prisma.board.findUnique({
    where: { id: boardId },
    include: {
      workspace: { include: { members: true } },
      rules: true,
      lists: {
        orderBy: { order: 'asc' },
        include: {
          cards: {
            orderBy: { order: 'asc' },
            include: { 
              assignee: true,
              comments: { include: { user: true }, orderBy: { createdAt: 'desc' } },
              attachments: { orderBy: { createdAt: 'desc' } }
            }
          }
        }
      }
    }
  });

  if (!board) throw new Error("Board not found");
  
  // Security check: If board is attached to a workspace, user must be a member
  if (board.workspaceId) {
    const isMember = board.workspace?.members.some(m => m.userId === user.id);
    if (!isMember) throw new Error("Unauthorized to access this board");
  }

  return board;
};

export const createBoardAction = async (workspaceId: string, title: string) => {
  const user = await getUser();
  const isMember = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: user.id } }
  });

  if (!isMember) throw new Error("Unauthorized");

  return await prisma.board.create({
    data: {
      title,
      workspaceId,
      lists: {
        create: [
          { title: "To Do", order: 0 },
          { title: "Doing", order: 1 },
          { title: "Done", order: 2 },
        ]
      }
    }
  });
};

export const createListAction = async (boardId: string, title: string) => {
  await getUser();
  const lists = await prisma.list.count({ where: { boardId } });
  
  const list = await prisma.list.create({
    data: { boardId, title, order: lists }
  });
  
  return list;
};

export const deleteListAction = async (listId: string) => {
  await getUser();
  await prisma.list.delete({ where: { id: listId } });
};

export const updateListOrderAction = async (orderedListIds: string[]) => {
  await getUser();
  const transactions = orderedListIds.map((id, index) => 
    prisma.list.update({ where: { id }, data: { order: index } })
  );
  await prisma.$transaction(transactions);
};

export const createCardAction = async (listId: string, title: string, description?: string) => {
  await getUser();
  const count = await prisma.card.count({ where: { listId } });
  const card = await prisma.card.create({
    data: { listId, title, description, order: count }
  });
  return card;
};

export const updateCardAction = async (cardId: string, data: { title?: string, description?: string, assigneeId?: string | null }) => {
  await getUser();
  const card = await prisma.card.update({
    where: { id: cardId },
    data
  });
  return card;
};

export const deleteCardAction = async (cardId: string) => {
  await getUser();
  await prisma.card.delete({ where: { id: cardId } });
};

export const moveCardAction = async (cardId: string, destListId: string, newOrder: number, sortedDestCards: string[]) => {
  const user = await getUser();
  
  // First, move the card to the new list and put it at a temporary large order
  const card = await prisma.card.update({
    where: { id: cardId },
    data: { listId: destListId, order: 99999 },
    include: { list: true }
  });

  // Then, restructure all card orders in the destination list exactly as they are in the client array
  const transactions = sortedDestCards.map((id, index) => 
    prisma.card.update({ where: { id }, data: { order: index } })
  );
  await prisma.$transaction(transactions);

  // TRIGGER AUTOMATION RULES
  await triggerRulesForCardMove(card.list.boardId, card.id, destListId, user.id);
};

export const getUsersAction = async () => {
  await getUser();
  return await prisma.user.findMany({ select: { id: true, name: true, email: true } });
};

export const updateListColorAction = async (listId: string, color: string | null) => {
  await getUser();
  return await prisma.list.update({
    where: { id: listId },
    data: { color }
  });
};

export const updateCardFeatureAction = async (cardId: string, data: { dueDate?: Date | null, coverColor?: string | null }) => {
  await getUser();
  return await prisma.card.update({
    where: { id: cardId },
    data
  });
};

export const addCommentAction = async (cardId: string, content: string) => {
  const user = await getUser();
  return await prisma.comment.create({
    data: { content, cardId, userId: user.id },
    include: { user: true }
  });
};

export const deleteCommentAction = async (commentId: string) => {
  await getUser();
  await prisma.comment.delete({ where: { id: commentId } });
};

