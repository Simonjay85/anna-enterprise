import { Droppable, Draggable } from '@hello-pangea/dnd';
import { Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { useBoardStore, Card as CardType } from '../store/boardStore';
import Card from './Card';
import styles from './List.module.css';

type ListProps = {
  listId: string;
  title: string;
  cards: CardType[];
  color?: string | null;
  index: number;
  onCardClick: (cardId: string) => void;
};

export default function List({ listId, title, cards, color, index, onCardClick }: ListProps) {
  const { addCard, deleteList, updateListColor } = useBoardStore();
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');

  const handleAddCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCardTitle.trim()) {
      addCard(listId, newCardTitle);
      setNewCardTitle('');
      setIsAddingCard(false);
    }
  };

  return (
    <Draggable draggableId={listId} index={index}>
      {(provided, snapshot) => (
        <div
          className={`${styles.listWrapper} ${snapshot.isDragging ? styles.dragging : ''}`}
          ref={provided.innerRef}
          {...provided.draggableProps}
        >
          <div className={styles.list}>
            <div className={styles.header} {...provided.dragHandleProps} style={{ backgroundColor: color || undefined, color: color ? '#fff' : undefined }}>
              <h3 className={styles.title}>{title}</h3>
              <div style={{ display: 'flex', gap: '4px' }}>
                <input 
                  type="color" 
                  title="List Color"
                  value={color || '#ffffff'}
                  className={styles.colorPicker}
                  onChange={(e) => updateListColor(listId, e.target.value)}
                />
                <button
                  className={styles.deleteBtn}
                  onClick={() => deleteList(listId)}
                  aria-label="Delete list"
                  style={{ color: color ? '#fff' : undefined }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <Droppable droppableId={listId} type="card">
              {(provided, snapshot) => (
                <div
                  className={`${styles.cardList} ${snapshot.isDraggingOver ? styles.draggingOver : ''}`}
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                >
                  {cards.map((card, index) => (
                    <Card
                      key={card.id}
                      cardId={card.id}
                      listId={listId}
                      title={card.title}
                      index={index}
                      onClick={() => onCardClick(card.id)}
                    />
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>

            <div className={styles.footer}>
              {isAddingCard ? (
                <form onSubmit={handleAddCard} className={styles.addCardForm}>
                  <textarea
                    autoFocus
                    className={styles.addCardInput}
                    placeholder="Enter a title for this card..."
                    value={newCardTitle}
                    onChange={(e) => setNewCardTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleAddCard(e);
                      }
                    }}
                  />
                  <div className={styles.addCardActions}>
                    <button type="submit" className="btn btn-primary">
                      Add Card
                    </button>
                    <button
                      type="button"
                      className={styles.cancelBtn}
                      onClick={() => setIsAddingCard(false)}
                    >
                      <X size={20} />
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  className={styles.addCardBtn}
                  onClick={() => setIsAddingCard(true)}
                >
                  <Plus size={16} /> Add a card
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}
