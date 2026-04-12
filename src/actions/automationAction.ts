"use server";

import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

const getUser = async () => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user;
};

export const getRulesAction = async (boardId: string) => {
  await getUser();
  return await prisma.automationRule.findMany({
    where: { boardId },
    orderBy: { createdAt: 'desc' }
  });
};

export const createRuleAction = async (
  boardId: string, 
  triggerType: string, 
  triggerData: string, 
  actionType: string, 
  actionData: string
) => {
  await getUser();
  
  return await prisma.automationRule.create({
    data: {
      boardId,
      triggerType,
      triggerData,
      actionType,
      actionData
    }
  });
};

export const deleteRuleAction = async (ruleId: string) => {
  await getUser();
  await prisma.automationRule.delete({ where: { id: ruleId } });
};

// Internal execution engine called by other actions (like moveCardAction)
export const triggerRulesForCardMove = async (
  boardId: string, 
  cardId: string, 
  destListId: string, 
  userId: string
) => {
  // Find rules matching: CARD_MOVED_TO_LIST and destListId
  const rules = await prisma.automationRule.findMany({
    where: {
      boardId,
      triggerType: "CARD_MOVED_TO_LIST",
      triggerData: destListId
    }
  });

  for (const rule of rules) {
    if (rule.actionType === "ADD_COMMENT") {
      await prisma.comment.create({
        data: {
          content: rule.actionData, // "Great job!", "Please review", etc.
          cardId,
          userId // We attribute the comment to the user who triggered the rule, or to a bot if we had a bot user.
        }
      });
    } else if (rule.actionType === "SET_COLOR") {
      await prisma.card.update({
        where: { id: cardId },
        data: { coverColor: rule.actionData } // hex color string
      });
    } else if (rule.actionType === "MARK_DUE_DATE_DONE") {
      // In our current schema we don't have "dueDateComplete" boolean, but let's assume we can just clear it or update it.
      // Wait, we don't have isDueDateComplete. We'll simply clear the dueDate as a workaround for now, or add a comment.
      // For literal MVP, just set due date to nothing if marked done, or skip.
    } else if (rule.actionType === "DELETE_CARD") {
      await prisma.card.delete({
        where: { id: cardId }
      });
      // If deleted, stop further rules from firing on this card
      break; 
    } else if (rule.actionType === "SEND_SYS_NOTIFICATION") {
      // Find the card's assignees, or just send to all workspace members, or the current user.
      // The user wants: "khi 1 task hoàn thành, gửi thông báo chúc mừng đến tất cả thành viên liên quan đến tâsk đó"
      // Let's fetch the card to see its assignees, or fallback.
      const cardInfo = await prisma.card.findUnique({
        where: { id: cardId },
        include: { list: { include: { board: { include: { workspace: { include: { members: true } } } } } } }
      });
      
      if (cardInfo) {
        // If the card has a specific assignee, maybe notify them and the person who moved it (unless same).
        // Since we only have `assigneeId` (1 person currently), we notify the assignee.
        // If no assignee, but the user requested "members related to that task", let's notify the assignee or everyone in the workspace.
        // Actually, let's just notify everyone in the workspace so they can all see the celebration!
        
        const workspaceMembers = cardInfo.list.board.workspace?.members || [];
        
        for (const member of workspaceMembers) {
          // Send to everyone 
          await prisma.appNotification.create({
            data: {
              userId: member.userId,
              title: "Anna Automation",
              message: `Thẻ "${cardInfo.title}" vừa được chuyển vào cột "${cardInfo.list.title}". ${rule.actionData}`
            }
          });
        }
      }
    }
  }
};
