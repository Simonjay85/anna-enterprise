'use client';

import { useState } from 'react';
import { useBoardStore } from '@/store/boardStore';
import { createRuleAction, deleteRuleAction } from '@/actions/automationAction';

interface AutomationModalProps {
  onClose: () => void;
}

export default function AutomationModal({ onClose }: AutomationModalProps) {
  const { boardId, lists, rules, setRules } = useBoardStore();
  const [isCreating, setIsCreating] = useState(false);
  
  // Rule builder state
  const [targetListId, setTargetListId] = useState(lists[0]?.id || '');
  const [actionType, setActionType] = useState('SET_COLOR');
  const [actionData, setActionData] = useState('#ff0000'); // default red

  const handleCreateRule = async () => {
    if (!boardId || !targetListId || !actionType || !actionData) return;
    
    try {
      const newRule = await createRuleAction(
        boardId,
        'CARD_MOVED_TO_LIST',
        targetListId,
        actionType,
        actionData
      );
      setRules([newRule as any, ...rules]);
      setIsCreating(false);
    } catch (e) {
      alert("Failed to create rule.");
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    try {
      await deleteRuleAction(ruleId);
      setRules(rules.filter(r => r.id !== ruleId));
    } catch (e) {
      alert("Failed to delete rule.");
    }
  };

  const getListName = (id: string) => lists.find(l => l.id === id)?.title || 'Unknown List';

  return (
    <div className="modal-overlay" onClick={onClose} style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{
        backgroundColor: 'var(--surface)', padding: '2rem', borderRadius: '8px',
        width: '500px', maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            🤖 Board Automations
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--foreground)' }}>&times;</button>
        </div>

        {!isCreating && (
          <button onClick={() => setIsCreating(true)} className="btn btn-primary" style={{ width: '100%', marginBottom: '2rem' }}>
            + Create Custom Rule
          </button>
        )}

        {isCreating && (
          <div style={{ background: 'var(--background)', padding: '1rem', borderRadius: '6px', marginBottom: '2rem' }}>
            <h4 style={{ marginTop: 0 }}>Rule Builder</h4>
            
            <div style={{ marginBottom: '1rem' }}>
              <strong>WHEN</strong> a card is moved to:
              <select 
                value={targetListId} 
                onChange={e => setTargetListId(e.target.value)}
                style={{ marginLeft: '1rem', padding: '0.5rem', borderRadius: '4px' }}
              >
                {lists.map(list => (
                  <option key={list.id} value={list.id}>{list.title}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <strong>THEN</strong> dynamically:
              <select 
                value={actionType} 
                onChange={e => setActionType(e.target.value)}
                style={{ marginLeft: '1rem', padding: '0.5rem', borderRadius: '4px', marginBottom: '0.5rem', display: 'block', width: '100%' }}
              >
                <option value="SET_COLOR">Change Card Cover Color</option>
                <option value="ADD_COMMENT">Add an Auto-Comment</option>
                <option value="SEND_SYS_NOTIFICATION">Trigger macOS/Windows Notification</option>
                <option value="DELETE_CARD">Delete the Card 🔥</option>
              </select>

              {actionType === 'SET_COLOR' && (
                <input type="color" value={actionData} onChange={e => setActionData(e.target.value)} />
              )}
              {actionType === 'ADD_COMMENT' && (
                <input 
                   type="text" 
                   value={actionData} 
                   onChange={e => setActionData(e.target.value)} 
                   placeholder="e.g. Needs final review!" 
                   style={{ width: '100%', padding: '0.5rem' }} 
                />
              )}
              {actionType === 'SEND_SYS_NOTIFICATION' && (
                <input 
                   type="text" 
                   value={actionData} 
                   onChange={e => setActionData(e.target.value)} 
                   placeholder="e.g. Congratulations team!" 
                   style={{ width: '100%', padding: '0.5rem' }} 
                />
              )}
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setIsCreating(false)} className="btn">Cancel</button>
              <button onClick={handleCreateRule} className="btn btn-primary">Save Rule</button>
            </div>
          </div>
        )}

        <div>
          <h3>Active Rules ({rules.length})</h3>
          {rules.length === 0 && <p style={{ color: 'var(--muted)' }}>No rules configured yet.</p>}
          {rules.map(rule => (
            <div key={rule.id} style={{ 
              border: '1px solid var(--border)', 
              padding: '1rem', 
              borderRadius: '6px', 
              marginBottom: '1rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <strong>IF</strong> moved to [{getListName(rule.triggerData)}] <br/>
                <strong>THEN</strong> {rule.actionType} ({rule.actionData || 'N/A'})
              </div>
              <button 
                onClick={() => handleDeleteRule(rule.id)}
                style={{ background: 'var(--danger)', color: 'white', border: 'none', padding: '0.5rem', borderRadius: '4px', cursor: 'pointer' }}
              >
                Delete
              </button>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
