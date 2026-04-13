'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { Workspace } from '@/store/boardStore';
import { createWorkspaceAction } from '@/actions/workspace';
import { createBoardAction } from '@/actions/board';
import { importExcelToWorkspaceAction } from '@/actions/excelAction';
import * as xlsx from 'xlsx';
import ExcelMappingModal from './ExcelMappingModal';

type DashboardProps = {
  initialWorkspaces: Workspace[];
};

export default function DashboardClient({ initialWorkspaces }: DashboardProps) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>(initialWorkspaces);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importTargetWsId, setImportTargetWsId] = useState<string | null>(null);

  // Modal states
  const [showWsModal, setShowWsModal] = useState(false);
  const [wsName, setWsName] = useState('');
  const [showBoardModal, setShowBoardModal] = useState(false);
  const [boardName, setBoardName] = useState('');
  const [boardTargetWsId, setBoardTargetWsId] = useState<string | null>(null);

  // Mapping state
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [parsedWorkbook, setParsedWorkbook] = useState<xlsx.WorkBook | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');

  const handleCreateWorkspace = () => {
    setWsName('');
    setShowWsModal(true);
  };

  const submitCreateWorkspace = async () => {
    if (!wsName.trim()) {
      alert("Please enter a workspace name");
      return;
    }
    try {
      const newWs = await createWorkspaceAction(wsName.trim());
      setWorkspaces([...workspaces, newWs as any]);
      setShowWsModal(false);
      setWsName('');
    } catch (e: any) {
      alert('Failed to create workspace: ' + (e?.message || JSON.stringify(e)));
    }
  };

  const handleCreateBoard = (workspaceId: string) => {
    setBoardName('');
    setBoardTargetWsId(workspaceId);
    setShowBoardModal(true);
  };

  const submitCreateBoard = async () => {
    if (!boardName.trim() || !boardTargetWsId) return;
    try {
      const newBoard = await createBoardAction(boardTargetWsId, boardName.trim());
      setWorkspaces(workspaces.map(ws =>
        ws.id === boardTargetWsId ? { ...ws, boards: [...ws.boards, newBoard as any] } : ws
      ));
      setShowBoardModal(false);
      setBoardName('');
      setBoardTargetWsId(null);
    } catch (e) {
      alert('Failed to create board');
    }
  };

  const handleImportExcelClick = (workspaceId: string) => {
    setImportTargetWsId(workspaceId);
    fileInputRef.current?.click();
  };

  const extractHeaders = (workbook: xlsx.WorkBook, sheetName: string) => {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) return [];
    const json = xlsx.utils.sheet_to_json(worksheet, { header: 1 }) as string[][];

    let bestRowIndex = 0;
    let maxCols = 0;
    for (let i = 0; i < Math.min(10, json.length); i++) {
      const rowProps = json[i]?.filter(c => typeof c === 'string' && c.trim() !== '') || [];
      if (rowProps.length > maxCols) {
        maxCols = rowProps.length;
        bestRowIndex = i;
      }
    }
    return (json[bestRowIndex] as string[])?.map(h => String(h).trim()).filter(h => h) || [];
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !importTargetWsId) return;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = xlsx.read(arrayBuffer, { type: 'array' });
      setParsedWorkbook(workbook);
      
      const names = workbook.SheetNames;
      setSheetNames(names);
      const firstSheet = names[0];
      setSelectedSheet(firstSheet);
      
      const headers = extractHeaders(workbook, firstSheet);
      setExcelHeaders(headers);
      setExcelFile(file);
      setShowMappingModal(true);
    } catch (err) {
      alert('Failed to parse Excel file.');
    }
  };

  const handleSheetChange = (sheetName: string) => {
    setSelectedSheet(sheetName);
    if (parsedWorkbook) {
      const targetSheet = sheetName === 'ALL' ? parsedWorkbook.SheetNames[0] : sheetName;
      setExcelHeaders(extractHeaders(parsedWorkbook, targetSheet));
    }
  };

  const handleConfirmMapping = async (sheetName: string, cardTitleColumn: string, listColumn: string, assigneeColumn: string) => {
    if (!excelFile || !importTargetWsId) return;

    setShowMappingModal(false);
    setIsImporting(true);
    const formData = new FormData();
    formData.append('file', excelFile);
    formData.append('sheetName', sheetName);
    formData.append('cardTitleColumn', cardTitleColumn);
    formData.append('listColumn', listColumn);
    formData.append('assigneeColumn', assigneeColumn);

    try {
      await importExcelToWorkspaceAction(importTargetWsId, formData);
      alert('Excel Imported Successfully! Please refresh the page to see the populated board.');
      window.location.reload();
    } catch (err: any) {
      alert('Failed to import excel: ' + (err.message || JSON.stringify(err)));
    } finally {
      setIsImporting(false);
      setImportTargetWsId(null);
      setExcelFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCancelMapping = () => {
    setShowMappingModal(false);
    setExcelFile(null);
    setImportTargetWsId(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const modalOverlay: React.CSSProperties = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
  };
  const modalBox: React.CSSProperties = {
    background: 'var(--surface)', borderRadius: '12px', padding: '2rem',
    width: '90%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '1rem',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  };

  return (
    <section style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>

      {/* Create Workspace Modal */}
      {showWsModal && (
        <div style={modalOverlay} onClick={() => setShowWsModal(false)}>
          <div style={modalBox} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: 0 }}>🏢 Create Workspace</h3>
            <input
              className="input"
              placeholder="Workspace name..."
              value={wsName}
              onChange={e => setWsName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submitCreateWorkspace()}
              autoFocus
            />
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button className="btn" onClick={() => setShowWsModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={submitCreateWorkspace}>Create</button>
            </div>
          </div>
        </div>
      )}

      {/* Create Board Modal */}
      {showBoardModal && (
        <div style={modalOverlay} onClick={() => setShowBoardModal(false)}>
          <div style={modalBox} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: 0 }}>📋 Create Board</h3>
            <input
              className="input"
              placeholder="Board title..."
              value={boardName}
              onChange={e => setBoardName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submitCreateBoard()}
              autoFocus
            />
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button className="btn" onClick={() => setShowBoardModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={submitCreateBoard}>Create</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2>Your Workspaces</h2>
        <div>
          <input type="file" accept=".xlsx, .xls" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChange} />
          <button className="btn btn-primary" onClick={handleCreateWorkspace}>+ Create Workspace</button>
        </div>
      </div>

      {workspaces.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', background: 'var(--surface)', borderRadius: '8px' }}>
          <p>You don't belong to any workspaces yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {workspaces.map(ws => (
            <div key={ws.id} style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0 }}>🏢 {ws.name}</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{ws.members.length} members</span>
                  <button
                    onClick={() => handleImportExcelClick(ws.id)}
                    className="btn"
                    style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem' }}
                    disabled={isImporting}
                  >
                    {isImporting && importTargetWsId === ws.id ? 'Importing...' : '📥 Import Excel'}
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                {ws.boards.map(board => (
                  <Link key={board.id} href={`/b/${board.id}`} style={{ textDecoration: 'none' }}>
                    <div style={{
                      background: 'var(--surface-hover)', height: '80px', borderRadius: '6px',
                      padding: '1rem', display: 'flex', flexDirection: 'column',
                      justifyContent: 'space-between', border: '1px solid var(--border)', color: 'var(--foreground)'
                    }}>
                      <strong>{board.title}</strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{board.visibility}</span>
                    </div>
                  </Link>
                ))}

                <div
                  onClick={() => handleCreateBoard(ws.id)}
                  style={{
                    background: 'rgba(0,0,0,0.02)', border: '1px dashed var(--border)',
                    height: '80px', borderRadius: '6px', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--muted)'
                  }}
                >
                  + Create new board
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showMappingModal && excelHeaders.length > 0 && (
        <ExcelMappingModal 
          headers={excelHeaders} 
          sheetNames={sheetNames}
          selectedSheet={selectedSheet}
          onSheetChange={handleSheetChange}
          onConfirm={handleConfirmMapping} 
          onCancel={handleCancelMapping}
        />
      )}
    </section>
  );
}
