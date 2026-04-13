'use client';

import { useState } from 'react';

type ExcelMappingModalProps = {
  sheetNames: string[];
  selectedSheet: string;
  onSheetChange: (sheetName: string) => void;
  headers: string[];
  onConfirm: (sheetName: string, cardTitleColumn: string, listColumn: string, assigneeColumn: string) => void;
  onCancel: () => void;
};

export default function ExcelMappingModal({ sheetNames, selectedSheet, onSheetChange, headers, onConfirm, onCancel }: ExcelMappingModalProps) {
  const [cardTitleColumn, setCardTitleColumn] = useState<string>('');
  const [listColumn, setListColumn] = useState<string>('');
  const [assigneeColumn, setAssigneeColumn] = useState<string>('');

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: 'var(--surface)',
        padding: '2rem',
        borderRadius: '8px',
        width: '500px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
        color: 'var(--foreground)'
      }}>
        <h2 style={{ marginTop: 0 }}>Map Excel Columns</h2>
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
          By default, Trello needs to know which column represents the Card Title and which column represents the Board List (Status).
        </p>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Select Sheet to Import:</label>
          <select 
            value={selectedSheet}
            onChange={(e) => onSheetChange(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)' }}
          >
            <option value="ALL">-- Import All Sheets --</option>
            {sheetNames.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Card Title Column:</label>
          <select 
            value={cardTitleColumn || (headers[0] || '')}
            onChange={(e) => setCardTitleColumn(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)' }}
          >
            <option value="">-- Select Column --</option>
            {headers.map(h => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>List/Status Column:</label>
          <select 
            value={listColumn || (headers.length > 1 ? headers[1] : (headers[0] || ''))}
            onChange={(e) => setListColumn(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)' }}
          >
            <option value="">-- Select Column --</option>
            {headers.map(h => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Assignee/Owner Column (Optional):</label>
          <select 
            value={assigneeColumn}
            onChange={(e) => setAssigneeColumn(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)' }}
          >
            <option value="">-- No Assignee Column --</option>
            {headers.map(h => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
          <button className="btn" onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onConfirm(selectedSheet, cardTitleColumn || headers[0], listColumn || (headers.length > 1 ? headers[1] : headers[0]), assigneeColumn)}>Import Now</button>
        </div>
      </div>
    </div>
  );
}
