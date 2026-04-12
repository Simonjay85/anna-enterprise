import { Draggable } from '@hello-pangea/dnd';
import { Pencil, Trash2, Clock, MessageSquare, Paperclip } from 'lucide-react';
import { useState } from 'react';
import { useBoardStore } from '../store/boardStore';
import styles from './Card.module.css';

type CardProps = {
  cardId: string;
  listId: string;
  title: string;
  index: number;
  onClick: () => void;
};

export default function Card({ cardId, listId, title, index, onClick }: CardProps) {
  const { deleteCard, users } = useBoardStore();
  const card = useBoardStore(state => state.lists.find(l => l.id === listId)?.cards.find(c => c.id === cardId));
  
  const commentCount = card?.comments?.length || 0;
  const attachmentCount = card?.attachments?.length || 0;
  const hasDueDate = !!card?.dueDate;
  
  const stopPropagation = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <Draggable draggableId={cardId} index={index}>
      {(provided, snapshot) => (
        <div
          className={`${styles.card} ${snapshot.isDragging ? styles.dragging : ''}`}
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          style={provided.draggableProps.style}
        >
          {card?.coverColor && (
            <div className={styles.cover} style={{ backgroundColor: card.coverColor }} />
          )}
          <div className={styles.viewMode} onClick={onClick} style={{ cursor: 'pointer' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flexGrow: 1 }}>
              <span className={styles.title}>{title}</span>
              
              <div className={styles.badges}>
                {hasDueDate && (
                  <span className={styles.badge} title="Due Date"><Clock size={12} /> {new Date(card.dueDate!).toLocaleDateString()}</span>
                )}
                {commentCount > 0 && (
                  <span className={styles.badge} title="Comments"><MessageSquare size={12} /> {commentCount}</span>
                )}
                {attachmentCount > 0 && (
                  <span className={styles.badge} title="Attachments"><Paperclip size={12} /> {attachmentCount}</span>
                )}
              </div>

              {(card?.assignee || card?.ownerName) && (
                <div style={{ fontSize: '0.75rem', color: 'var(--primary)', background: 'var(--surface-hover)', padding: '0.1rem 0.4rem', borderRadius: '4px', width: 'fit-content' }}>
                  👤 {card.assignee?.name || card.ownerName}
                </div>
              )}
            </div>
            <div className={styles.actions} onClick={stopPropagation}>
              <button
                className={`${styles.actionBtn} ${styles.deleteBtn}`}
                onClick={(e) => { e.stopPropagation(); deleteCard(listId, cardId); }}
                aria-label="Delete card"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}
