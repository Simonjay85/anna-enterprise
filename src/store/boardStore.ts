import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { 
  createListAction, 
  deleteListAction, 
  updateListOrderAction, 
  createCardAction, 
  updateCardAction, 
  deleteCardAction, 
  moveCardAction,
  updateListColorAction,
  updateCardFeatureAction,
  addCommentAction,
  deleteCommentAction
} from '@/actions/board';
import { uploadAttachmentAction, deleteAttachmentAction } from '@/actions/uploadAction'; // Let's import it

export type User = {
  id: string;
  name: string | null;
  email: string | null;
}

export type WorkspaceMember = {
  id: string;
  userId: string;
  workspaceId: string;
  role: string;
  user: User;
}

export type Workspace = {
  id: string;
  name: string;
  members: WorkspaceMember[];
  boards: { id: string, title: string, visibility: string }[];
}

export type AutomationRule = {
  id: string;
  boardId: string;
  triggerType: string;
  triggerData: string;
  actionType: string;
  actionData: string;
}

export type Comment = {
  id: string;
  content: string;
  userId: string;
  user: User;
  createdAt: Date;
}

export type Attachment = {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  createdAt: Date;
}

export type Card = {
  id: string;
  title: string;
  description?: string | null;
  order: number;
  assigneeId?: string | null;
  assignee?: User | null;
  ownerName?: string | null;
  dueDate?: Date | null;
  coverColor?: string | null;
  comments?: Comment[];
  attachments?: Attachment[];
};

export type List = {
  id: string;
  title: string;
  order: number;
  color?: string | null;
  cards: Card[];
};

export type BoardState = {
  workspaces: Workspace[];
  boardId: string | null;
  lists: List[];
  users: User[];
  rules: AutomationRule[];
  
  setWorkspaces: (workspaces: Workspace[]) => void;
  setBoard: (boardId: string, lists: List[], rules?: AutomationRule[]) => void;
  setRules: (rules: AutomationRule[]) => void;
  setUsers: (users: User[]) => void;
  addList: (title: string) => Promise<void>;
  deleteList: (listId: string) => Promise<void>;
  addCard: (listId: string, title: string, description?: string) => Promise<void>;
  updateCard: (listId: string, cardId: string, updates: Partial<Card>, assignee?: User | null) => Promise<void>;
  deleteCard: (listId: string, cardId: string) => Promise<void>;
  moveCard: (sourceListId: string, destListId: string, sourceIndex: number, destIndex: number) => Promise<void>;
  moveList: (sourceIndex: number, destIndex: number) => Promise<void>;
  updateListColor: (listId: string, color: string | null) => Promise<void>;
  addComment: (listId: string, cardId: string, content: string, user: User) => Promise<void>;
  deleteComment: (listId: string, cardId: string, commentId: string) => Promise<void>;
  addAttachment: (listId: string, cardId: string, formData: FormData) => Promise<void>;
  deleteAttachment: (listId: string, cardId: string, attachmentId: string) => Promise<void>;
};

export const useBoardStore = create<BoardState>()((set, get) => ({
  workspaces: [],
  boardId: null,
  lists: [],
  users: [],
  rules: [],

  setWorkspaces: (workspaces) => set({ workspaces }),
  setBoard: (boardId, lists, rules = []) => set({ boardId, lists: lists.sort((a, b) => a.order - b.order).map(l => ({ ...l, cards: l.cards.sort((c1, c2) => c1.order - c2.order)})), rules }),
  setRules: (rules) => set({ rules }),
  
  setUsers: (users) => set({ users }),

  addList: async (title) => {
    const { boardId } = get();
    if (!boardId) return;
    
    // Optimistic update
    const tempId = `temp-${uuidv4()}`;
    const order = get().lists.length;
    set((state) => ({
      lists: [...state.lists, { id: tempId, title, order, cards: [] }],
    }));

    // Server request
    try {
      const realList = await createListAction(boardId, title);
      set((state) => ({
        lists: state.lists.map((l) => l.id === tempId ? { ...l, id: realList.id } : l),
      }));
    } catch (e) {
      // Revert on fail
      set((state) => ({ lists: state.lists.filter(l => l.id !== tempId) }));
    }
  },

  deleteList: async (listId) => {
    const originalLists = get().lists;
    set((state) => ({ lists: state.lists.filter((l) => l.id !== listId) }));
    try {
      await deleteListAction(listId);
    } catch {
      set({ lists: originalLists });
    }
  },

  addCard: async (listId, title, description) => {
    const tempId = `temp-card-${uuidv4()}`;
    const list = get().lists.find(l => l.id === listId);
    if (!list) return;

    set((state) => ({
      lists: state.lists.map((l) => 
        l.id === listId 
          ? { ...l, cards: [...l.cards, { id: tempId, title, description, order: l.cards.length }] } 
          : l
      ),
    }));

    try {
      const realCard = await createCardAction(listId, title, description);
      set((state) => ({
        lists: state.lists.map((l) => 
          l.id === listId 
            ? { ...l, cards: l.cards.map(c => c.id === tempId ? { ...c, id: realCard.id } : c) } 
            : l
        ),
      }));
    } catch {
      set((state) => ({
        lists: state.lists.map((l) => 
          l.id === listId ? { ...l, cards: l.cards.filter(c => c.id !== tempId) } : l
        ),
      }));
    }
  },

  updateCard: async (listId, cardId, updates, assignee) => {
    const originalLists = get().lists;
    
    set((state) => ({
      lists: state.lists.map((l) => 
        l.id === listId 
          ? { 
              ...l, 
              cards: l.cards.map(c => c.id === cardId ? { ...c, ...updates, assignee: assignee !== undefined ? assignee : c.assignee } : c) 
            } 
          : l
      ),
    }));

    try {
      // Only picking scalar fields for standard update or using the new updateCardFeatureAction
      // For simplicity, we can route all updates through the existing updateCardAction if we update its signature, 
      // but let's use the explicit backend update based on keys.
      if (updates.dueDate !== undefined || updates.coverColor !== undefined) {
          await updateCardFeatureAction(cardId, { dueDate: updates.dueDate, coverColor: updates.coverColor });
      }
      if (updates.title !== undefined || updates.description !== undefined || updates.assigneeId !== undefined) {
          await updateCardAction(cardId, { title: updates.title, description: updates.description || undefined, assigneeId: updates.assigneeId });
      }
    } catch {
      set({ lists: originalLists });
    }
  },

  deleteCard: async (listId, cardId) => {
    const originalLists = get().lists;
    set((state) => ({
      lists: state.lists.map((l) => 
        l.id === listId ? { ...l, cards: l.cards.filter((c) => c.id !== cardId) } : l
      ),
    }));

    try {
      await deleteCardAction(cardId);
    } catch {
      set({ lists: originalLists });
    }
  },

  moveCard: async (sourceListId, destListId, sourceIndex, destIndex) => {
    const originalLists = get().lists;
    
    // Copy the nested array state safely
    let newLists = originalLists.map(l => ({ ...l, cards: [...l.cards] }));
    const sourceList = newLists.find((l) => l.id === sourceListId);
    const destList = newLists.find((l) => l.id === destListId);

    if (!sourceList || !destList) return;

    const [movedCard] = sourceList.cards.splice(sourceIndex, 1);

    if (sourceListId === destListId) {
      sourceList.cards.splice(destIndex, 0, movedCard);
      // Update orders
      sourceList.cards.forEach((c, idx) => c.order = idx);
    } else {
      destList.cards.splice(destIndex, 0, movedCard);
      // Update orders
      destList.cards.forEach((c, idx) => c.order = idx);
      sourceList.cards.forEach((c, idx) => c.order = idx);
    }

    set({ lists: newLists });

    try {
      const sortedDestCards = newLists.find(l => l.id === destListId)!.cards.map(c => c.id);
      await moveCardAction(movedCard.id, destListId, destIndex, sortedDestCards);
    } catch {
      set({ lists: originalLists });
    }
  },

  moveList: async (sourceIndex, destIndex) => {
    const originalLists = get().lists;
    const newLists = [...originalLists];
    const [movedList] = newLists.splice(sourceIndex, 1);
    newLists.splice(destIndex, 0, movedList);
    
    // update orders
    newLists.forEach((l, idx) => l.order = idx);

    set({ lists: newLists });

    try {
      await updateListOrderAction(newLists.map(l => l.id));
    } catch {
      set({ lists: originalLists });
    }
  },

  updateListColor: async (listId, color) => {
    const originalLists = get().lists;
    set((state) => ({
      lists: state.lists.map(l => l.id === listId ? { ...l, color } : l)
    }));
    try {
      await updateListColorAction(listId, color);
    } catch {
      set({ lists: originalLists });
    }
  },

  addComment: async (listId, cardId, content, user) => {
    const tempId = `temp-comment-${uuidv4()}`;
    const comment: Comment = { id: tempId, content, userId: user.id, user, createdAt: new Date() };

    set(state => ({
      lists: state.lists.map(l => l.id === listId ? {
        ...l, 
        cards: l.cards.map(c => c.id === cardId ? { ...c, comments: [comment, ...(c.comments || [])] } : c)
      } : l)
    }));

    try {
      const realComment = await addCommentAction(cardId, content);
      set(state => ({
        lists: state.lists.map(l => l.id === listId ? {
          ...l, 
          cards: l.cards.map(c => c.id === cardId ? { 
            ...c, 
            comments: c.comments?.map(com => com.id === tempId ? { ...com, id: realComment.id, createdAt: realComment.createdAt } : com) 
          } : c)
        } : l)
      }));
    } catch {
      // Revert optimistic update
      set(state => ({
        lists: state.lists.map(l => l.id === listId ? {
          ...l, 
          cards: l.cards.map(c => c.id === cardId ? { ...c, comments: c.comments?.filter(com => com.id !== tempId) } : c)
        } : l)
      }));
    }
  },

  deleteComment: async (listId, cardId, commentId) => {
    const originalLists = get().lists;
    set(state => ({
      lists: state.lists.map(l => l.id === listId ? {
        ...l, 
        cards: l.cards.map(c => c.id === cardId ? { ...c, comments: c.comments?.filter(com => com.id !== commentId) } : c)
      } : l)
    }));
    try {
      await deleteCommentAction(commentId);
    } catch {
      set({ lists: originalLists });
    }
  },

  addAttachment: async (listId, cardId, formData) => {
    // Cannot optimistic easily due to missing URL, so we just wait for server
    try {
      const realAttachment = await uploadAttachmentAction(cardId, formData);
      set(state => ({
        lists: state.lists.map(l => l.id === listId ? {
          ...l, 
          cards: l.cards.map(c => c.id === cardId ? { 
            ...c, 
            attachments: [realAttachment, ...(c.attachments || [])] 
          } : c)
        } : l)
      }));
    } catch (e) {
      console.error("Failed to upload attachment", e);
      throw e;
    }
  },

  deleteAttachment: async (listId, cardId, attachmentId) => {
    const originalLists = get().lists;
    set(state => ({
      lists: state.lists.map(l => l.id === listId ? {
        ...l, 
        cards: l.cards.map(c => c.id === cardId ? { ...c, attachments: c.attachments?.filter(att => att.id !== attachmentId) } : c)
      } : l)
    }));
    try {
      await deleteAttachmentAction(attachmentId);
    } catch {
      set({ lists: originalLists });
    }
  },
}));
