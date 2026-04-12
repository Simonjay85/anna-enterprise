import { useState, useRef } from 'react';
import { X, Clock, Palette, Paperclip, MessageSquare, User as UserIcon, Trash2 } from 'lucide-react';
import { useBoardStore, Card, User } from '../store/boardStore';
import styles from './CardModal.module.css';

type CardModalProps = {
  card: Card;
  listId: string;
  onClose: () => void;
};

export default function CardModal({ card, listId, onClose }: CardModalProps) {
  const { updateCard, addComment, deleteComment, addAttachment, deleteAttachment, users } = useBoardStore();
  
  const [title, setTitle] = useState(card.title);
  const [desc, setDesc] = useState(card.description || '');
  const [commentText, setCommentText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Save changes automatically on blur or explicitly
  const handleSaveTitle = () => {
    if (title.trim() && title !== card.title) updateCard(listId, card.id, { title: title.trim() });
  };

  const handleSaveDesc = () => {
    if (desc !== (card.description || '')) updateCard(listId, card.id, { description: desc });
  };

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateCard(listId, card.id, { coverColor: e.target.value });
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    updateCard(listId, card.id, { dueDate: val ? new Date(val) : null });
  };

  const handleAssigneeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const aid = e.target.value;
    const user = users.find(u => u.id === aid) || null;
    updateCard(listId, card.id, { assigneeId: aid || null }, user);
  };

  const handlePostComment = async () => {
    if (!commentText.trim()) return;
    // We assume the first user is the logged in user for this MVP if no auth context is piped here,
    // wait, we have users array, but we don't know who "I" am. 
    // Let's just use the first user or a dummy user if none exist.
    const me = users[0] || { id: 'anon', name: 'Anonymous', email: '' }; 
    await addComment(listId, card.id, commentText, me);
    setCommentText('');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      await addAttachment(listId, card.id, formData);
    } catch (err) {
      alert("Failed to upload file");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Convert dueDate to YYYY-MM-DDTHH:mm for datetime-local input
  const dateStr = card.dueDate ? new Date(card.dueDate).toISOString().slice(0, 16) : '';

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        
        {card.coverColor && (
          <div className={styles.cover} style={{ backgroundColor: card.coverColor }} />
        )}

        <div className={styles.header}>
          <input 
            className={styles.titleInput}
            value={title}
            onChange={e => setTitle(e.target.value)}
            onBlur={handleSaveTitle}
          />
          <button className={styles.closeBtn} onClick={onClose}><X size={20} /></button>
        </div>

        <div className={styles.body}>
          <div className={styles.main}>
            
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Description</h3>
              <textarea 
                className={styles.textarea} 
                placeholder="Add a more detailed description..."
                value={desc}
                onChange={e => setDesc(e.target.value)}
                onBlur={handleSaveDesc}
              />
            </div>

            <div className={styles.section}>
              <h3 className={styles.sectionTitle}><Paperclip size={16}/> Attachments</h3>
              <div className={styles.attachmentList}>
                {card.attachments?.map(att => (
                  <div key={att.id} className={styles.attachmentItem}>
                    <a href={att.fileUrl} target="_blank" rel="noreferrer" className={styles.attLink}>{att.fileName}</a>
                    <button onClick={() => deleteAttachment(listId, card.id, att.id)} className={styles.delBtn}><Trash2 size={14}/></button>
                  </div>
                ))}
              </div>
              <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileUpload} />
              <button className="btn" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                {isUploading ? 'Uploading...' : 'Add Attachment'}
              </button>
            </div>

            <div className={styles.section}>
              <h3 className={styles.sectionTitle}><MessageSquare size={16}/> Comments</h3>
              <div className={styles.commentInputBox}>
                <textarea 
                  className={styles.textarea} 
                  style={{ minHeight: '60px' }}
                  placeholder="Write a comment..."
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                />
                <button className="btn btn-primary" onClick={handlePostComment} style={{ alignSelf: 'flex-start', marginTop: '0.5rem' }}>Save</button>
              </div>
              <div className={styles.commentsList}>
                {card.comments?.map(com => (
                  <div key={com.id} className={styles.comment}>
                    <div className={styles.commentHeader}>
                      <strong>{com.user.name}</strong>
                      <span className={styles.date}>{new Date(com.createdAt).toLocaleString()}</span>
                      <button onClick={() => deleteComment(listId, card.id, com.id)} className={styles.delBtn}><Trash2 size={12}/></button>
                    </div>
                    <div className={styles.commentContent}>{com.content}</div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          <div className={styles.sidebar}>
            <div className={styles.sidebarSection}>
              <h4><UserIcon size={14}/> Assignee</h4>
              <select className={styles.select} value={card.assigneeId || ''} onChange={handleAssigneeChange}>
                <option value="">Unassigned</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>

            <div className={styles.sidebarSection}>
              <h4><Clock size={14}/> Due Date</h4>
              <input type="datetime-local" className={styles.select} value={dateStr} onChange={handleDateChange} />
            </div>

            <div className={styles.sidebarSection}>
              <h4><Palette size={14}/> Cover Color</h4>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <input type="color" value={card.coverColor || '#ffffff'} onChange={handleColorChange} className={styles.colorPicker}/>
                <button className="btn" style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem'}} onClick={() => updateCard(listId, card.id, { coverColor: null })}>Remove</button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
