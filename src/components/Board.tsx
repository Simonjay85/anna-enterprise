'use client';

import { Plus } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useBoardStore, List as ListType } from '../store/boardStore';
import CardModal from './CardModal';
import AutomationModal from './AutomationModal';
import styles from './Planner.module.css';

interface BoardProps {
  boardId: string;
  initialLists: ListType[];
  initialUsers: any[];
  initialRules: any[];
}

export default function Board({ boardId, initialLists, initialUsers, initialRules }: BoardProps) {
  const { lists, setBoard, setUsers, addCard } = useBoardStore();
  
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [isAutomationOpen, setIsAutomationOpen] = useState(false);
  
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setBoard(boardId, initialLists, initialRules);
    setUsers(initialUsers);
    setMounted(true);
  }, [boardId, initialLists, initialUsers, initialRules, setBoard, setUsers]);

  if (!mounted) return null;

  const handleAddNewTask = () => {
    // If no lists exist, we can't create a task yet
    if (lists.length === 0) {
      alert("Please create a Status (List) first!");
      return;
    }
    const defaultList = lists[0];
    const title = prompt("Enter new task title:");
    if (title) {
      addCard(defaultList.id, title);
    }
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>Global Planner View</h2>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            onClick={handleAddNewTask}
            className="btn btn-primary"
          >
            + Add New Task
          </button>
          <button 
            onClick={() => setIsAutomationOpen(true)}
            className="btn" 
            style={{ background: 'var(--primary)', color: 'white' }}
          >
            🤖 Automations
          </button>
        </div>
      </div>

      <div className={styles.plannerContainer}>
        {lists.length === 0 ? (
           <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)' }}>
             No tasks exist in this planner. Group by lists/columns first.
           </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Task</th>
                <th>Status</th>
                <th>Owner / Assignee</th>
                <th>Due Date</th>
              </tr>
            </thead>
            <tbody>
              {lists.flatMap(list => 
                list.cards.map(card => (
                  <tr key={card.id} onClick={() => { setActiveListId(list.id); setActiveCardId(card.id); }}>
                    <td>
                      <span className={styles.taskTitle}>{card.title}</span>
                    </td>
                    <td>
                      <span className={styles.statusBadge} style={list.color ? { backgroundColor: list.color } : {}}>
                        {list.title}
                      </span>
                    </td>
                    <td>
                      {(card.assignee || card.ownerName) ? (
                        <div className={styles.assigneeBadge}>
                          👤 {card.assignee?.name || card.ownerName}
                        </div>
                      ) : (
                        <span className={styles.unassigned}>Unassigned</span>
                      )}
                    </td>
                    <td>
                      {card.dueDate ? (
                        <span style={{ color: 'var(--primary)' }}>
                          {new Date(card.dueDate).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className={styles.unassigned}>--</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
      
      {activeCardId && activeListId && (() => {
         const card = lists.find(l => l.id === activeListId)?.cards.find(c => c.id === activeCardId);
         if (!card) return null;
         return <CardModal card={card} listId={activeListId} onClose={() => setActiveCardId(null)} />;
      })()}
      
      {isAutomationOpen && <AutomationModal onClose={() => setIsAutomationOpen(false)} />}
    </>
  );
}
