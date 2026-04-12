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
    // We will parse it as array of rows to bypass merged title rows
    const rawRows = xlsx.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
    if (rawRows.length === 0) continue;

    let bestRowIndex = 0;
    let maxCols = 0;
    for (let i = 0; i < Math.min(10, rawRows.length); i++) {
      const rowProps = rawRows[i]?.filter(c => typeof c === 'string' && c.trim() !== '') || [];
      if (rowProps.length > maxCols) {
        maxCols = rowProps.length;
        bestRowIndex = i;
      }
    }

    const headers = rawRows[bestRowIndex]?.map(h => String(h).trim()) || [];
    if (headers.length === 0) continue;

    const jsonRows: Record<string, any>[] = [];
    for (let i = bestRowIndex + 1; i < rawRows.length; i++) {
        const r = rawRows[i];
        if (!r || r.length === 0) continue;
        const mappedRow: Record<string, any> = {};
        for (let c = 0; c < headers.length; c++) {
            if (headers[c]) {
                mappedRow[headers[c]] = r[c];
            }
        }
        jsonRows.push(mappedRow);
    }
    
    if (jsonRows.length === 0) continue;

    // Create a new board for each sheet
    const board = await prisma.board.create({
      data: {
        title: sheetName,
        workspaceId,
      }
    });

    // Strategy: 
    // 1. Find all distinct values in the chosen `listColumn` to form the Lists.
    // Если listColumn is not provided or empty, fallback to "Imported Data".
    const listNames = new Set<string>();
    
    if (listColumn) {
      jsonRows.forEach(row => {
        const val = row[listColumn];
        if (val !== undefined && val !== null && String(val).trim() !== '') {
          listNames.add(String(val).trim());
        }
      });
    }

    if (listNames.size === 0) {
      listNames.add("Imported Data");
    }

    // 2. Create the Lists in the database and keep a map of Name -> ListID
    const listMap = new Map<string, string>();
    let listOrder = 0;
    for (const name of Array.from(listNames)) {
      const newList = await prisma.list.create({
        data: { title: name, boardId: board.id, order: listOrder++ }
      });
      listMap.set(name, newList.id);
    }

    // 3. Create Cards
    for (let r = 0; r < jsonRows.length; r++) {
      const row = jsonRows[r];
      // Determine the target list
      let targetListName = listColumn && row[listColumn] ? String(row[listColumn]).trim() : "Imported Data";
      if (!listMap.has(targetListName)) {
        targetListName = "Imported Data";
      }
      const listId = listMap.get(targetListName)!;

      // Determine Card Title
      let cardTitle = cardTitleColumn && row[cardTitleColumn] 
        ? String(row[cardTitleColumn]).trim() 
        : `Row ${r + 1}`;
      
      if (!cardTitle) cardTitle = "Untitled Card";

      // Determine Assignee
      let ownerName: string | null = null;
      if (assigneeColumn && row[assigneeColumn]) {
        ownerName = String(row[assigneeColumn]).trim();
      }

      // Render extra data into description
      let description = `**Imported from Excel**\n\n`;
      for (const [key, value] of Object.entries(row)) {
        if (value !== undefined && value !== null) {
          description += `- **${key}:** ${value}\n`;
        }
      }

      const cardCount = await prisma.card.count({ where: { listId } });
      await prisma.card.create({
        data: {
          title: cardTitle.length > 50 ? cardTitle.substring(0, 50) + "..." : cardTitle,
          description: description,
          listId: listId,
          order: cardCount,
          ownerName: ownerName
        }
      });
    }
  }

  return true;
}
