"use server";

import * as xlsx from 'xlsx';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

const getUser = async () => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user;
};

// Importer logic to read excel and create boards
export async function importExcelToWorkspaceAction(workspaceId: string, formData: FormData) {
  const user = await getUser();

  // Validate membership
  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: user.id } }
  });
  if (!membership) throw new Error("Not a member of this workspace");

  const file = formData.get('file') as File;
  const cardTitleColumn = formData.get('cardTitleColumn') as string;
  const listColumn = formData.get('listColumn') as string;
  const assigneeColumn = formData.get('assigneeColumn') as string;
  
  if (!file) throw new Error("No file found");

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Read excel
  const workbook = xlsx.read(buffer, { type: 'buffer' });
  const sheetNames = workbook.SheetNames;

  for (const sheetName of sheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const rawRows = xlsx.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
    if (rawRows.length === 0) continue;

    // Find best header row (most string columns)
    let bestRowIndex = 0;
    let maxCols = 0;
    for (let i = 0; i < Math.min(10, rawRows.length); i++) {
      const rowProps = rawRows[i]?.filter((c: any) => typeof c === 'string' && c.trim() !== '') || [];
      if (rowProps.length > maxCols) {
        maxCols = rowProps.length;
        bestRowIndex = i;
      }
    }

    const headers = rawRows[bestRowIndex]?.map((h: any) => String(h).trim()) || [];
    if (headers.length === 0) continue;

    // Parse all data rows
    const jsonRows: Record<string, any>[] = [];
    for (let i = bestRowIndex + 1; i < rawRows.length; i++) {
      const r = rawRows[i];
      if (!r || r.length === 0) continue;
      const mappedRow: Record<string, any> = {};
      for (let c = 0; c < headers.length; c++) {
        if (headers[c]) mappedRow[headers[c]] = r[c];
      }
      // Skip completely empty rows
      const hasData = Object.values(mappedRow).some(v => v !== undefined && v !== null && String(v).trim() !== '');
      if (hasData) jsonRows.push(mappedRow);
    }
    
    if (jsonRows.length === 0) continue;

    // Cap at 500 rows to prevent timeout
    const limitedRows = jsonRows.slice(0, 500);

    // Create board for this sheet
    const board = await prisma.board.create({
      data: { title: sheetName, workspaceId }
    });

    // Collect unique list names
    const listNames = new Set<string>();
    if (listColumn) {
      limitedRows.forEach(row => {
        const val = row[listColumn];
        if (val !== undefined && val !== null && String(val).trim() !== '') {
          listNames.add(String(val).trim());
        }
      });
    }
    if (listNames.size === 0) listNames.add("Imported Data");

    // Create all lists in one batch
    const listInputs = Array.from(listNames).map((name, idx) => ({
      title: name,
      boardId: board.id,
      order: idx
    }));
    await prisma.list.createMany({ data: listInputs });

    // Fetch back to get IDs
    const createdLists = await prisma.list.findMany({ where: { boardId: board.id } });
    const listMap = new Map(createdLists.map(l => [l.title, l.id]));

    // Build all card inserts
    const cardInserts: { title: string; description: string; listId: string; order: number; ownerName: string | null }[] = [];
    const orderCounter = new Map<string, number>();

    for (const row of limitedRows) {
      const targetListName = listColumn && row[listColumn]
        ? String(row[listColumn]).trim()
        : "Imported Data";

      const listId = listMap.get(targetListName) || listMap.get("Imported Data")!;
      if (!listId) continue;

      let cardTitle = cardTitleColumn && row[cardTitleColumn]
        ? String(row[cardTitleColumn]).trim()
        : "Untitled";
      if (!cardTitle) cardTitle = "Untitled";
      if (cardTitle.length > 50) cardTitle = cardTitle.substring(0, 50) + "...";

      let ownerName: string | null = null;
      if (assigneeColumn && row[assigneeColumn]) {
        ownerName = String(row[assigneeColumn]).trim();
      }

      // Short description with key data only
      const descParts: string[] = [];
      for (const [key, value] of Object.entries(row)) {
        if (value !== undefined && value !== null && String(value).trim() !== '') {
          descParts.push(`**${key}:** ${value}`);
        }
      }
      const description = descParts.join('\n');

      const currentOrder = orderCounter.get(listId) || 0;
      orderCounter.set(listId, currentOrder + 1);

      cardInserts.push({ title: cardTitle, description, listId, order: currentOrder, ownerName });
    }

    // Batch insert all cards at once
    if (cardInserts.length > 0) {
      await prisma.card.createMany({ data: cardInserts });
    }
  }

  return { success: true };
}
