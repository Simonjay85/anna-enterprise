'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Workspace } from '@/store/boardStore';
import { createWorkspaceAction } from '@/actions/workspace';
import { createBoardAction } from '@/actions/board';
import { importExcelToWorkspaceAction } from '@/actions/excelAction';
import { useRef, useState as useReactState } from 'react';
import * as xlsx from 'xlsx';
import ExcelMappingModal from './ExcelMappingModal';

type DashboardProps = {
  initialWorkspaces: Workspace[];
};

export default function DashboardClient({ initialWorkspaces }: DashboardProps) {
  const [workspaces, setWorkspaces] = useReactState<Workspace[]>(initialWorkspaces);
  const [isImporting, setIsImporting] = useReactState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importTargetWsId, setImportTargetWsId] = useReactState<string | null>(null);

  // Mapping state
  const [showMappingModal, setShowMappingModal] = useReactState(false);
  const [excelHeaders, setExcelHeaders] = useReactState<string[]>([]);
  const [excelFile, setExcelFile] = useReactState<File | null>(null);
  
  
  const handleCreateWorkspace = async () => {
    const name = prompt("Enter new Workspace Name:");
    if (!name) return;
    
    try {
      const newWs = await createWorkspaceAction(name);
      setWorkspaces([...workspaces, newWs as any]);
    } catch (e) {
      alert("Failed to create workspace");
    }
  };

  const handleCreateBoard = async (workspaceId: string) => {
    const title = prompt("Enter new Board Title:");
    if (!title) return;

    try {
      const newBoard = await createBoardAction(workspaceId, title);
      setWorkspaces(workspaces.map(ws => 
        ws.id === workspaceId ? { ...ws, boards: [...ws.boards, newBoard as any] } : ws
      ));
    } catch (e) {
      alert("Failed to create board");
    }
  };

  const handleImportExcelClick = (workspaceId: string) => {
    setImportTargetWsId(workspaceId);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !importTargetWsId) return;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = xlsx.read(arrayBuffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const json = xlsx.utils.sheet_to_json(worksheet, { header: 1 }) as string[][];
      
      // Find the best row for headers (the one with the most columns/strings)
      // This bypasses merged title rows.
      let bestRowIndex = 0;
      let maxCols = 0;
      for (let i = 0; i < Math.min(10, json.length); i++) {
        const rowProps = json[i]?.filter(c => typeof c === 'string' && c.trim() !== '') || [];
        if (rowProps.length > maxCols) {
          maxCols = rowProps.length;
          bestRowIndex = i;
        }
      }

      const headers = (json[bestRowIndex] as string[])?.map(h => String(h).trim()).filter(h => h) || [];

      if (headers.length === 0) {
        alert("No headers found in the Excel file!");
        return;
      }

      setExcelHeaders(headers);
      setExcelFile(file);
      setShowMappingModal(true);
    } catch (err) {
      alert("Failed to parse Excel file.");
    }
  };

  const handleConfirmMapping = async (cardTitleColumn: string, listColumn: string, assigneeColumn: string) => {
    if (!excelFile || !importTargetWsId) return;
    
    setShowMappingModal(false);
    setIsImporting(true);
    const formData = new FormData();
    formData.append('file', excelFile);
    formData.append('cardTitleColumn', cardTitleColumn);
    formData.append('listColumn', listColumn);
    formData.append('assigneeColumn', assigneeColumn);

    try {
      await importExcelToWorkspaceAction(importTargetWsId, formData);
      alert("Excel Imported Successfully! Please refresh the page to see the populated board.");
      window.location.reload();
    } catch (err: any) {
      alert("Failed to import excel: " + err.message);
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

  return (
    <section style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
        
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
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  🏢 {ws.name}
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                    {ws.members.length} members
                  </div>
                  <button 
                    onClick={() => handleImportExcelClick(ws.id)}
                    className="btn" 
                    style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem' }}
                    disabled={isImporting}
                  >
                    {isImporting && importTargetWsId === ws.id ? "Importing..." : "📥 Import Custom Excel"}
                  </button>
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                {ws.boards.map(board => (
                  <Link key={board.id} href={`/b/${board.id}`} style={{ textDecoration: 'none' }}>
                    <div style={{ 
                      background: 'var(--surface-hover)', 
                      height: '80px', 
                      borderRadius: '6px', 
                      padding: '1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      border: '1px solid var(--border)',
                      color: 'var(--foreground)'
                    }}>
                      <strong>{board.title}</strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{board.visibility}</span>
                    </div>
                  </Link>
                ))}
                
                <div 
                  onClick={() => handleCreateBoard(ws.id)}
                  style={{
                    background: 'rgba(0,0,0,0.02)',
                    border: '1px dashed var(--border)',
                    height: '80px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: 'var(--muted)'
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
          onConfirm={handleConfirmMapping} 
          onCancel={handleCancelMapping} 
        />
      )}
    </section>
  );
}
