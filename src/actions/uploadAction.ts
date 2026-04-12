"use server";

import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function uploadAttachmentAction(cardId: string, formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");

  const file = formData.get('file') as File;
  if (!file) throw new Error("No file uploaded");

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // We should create an uploads dir if it doesn't exist
  const uploadDir = join(process.cwd(), 'public', 'uploads');
  if (!existsSync(uploadDir)) {
    await mkdir(uploadDir, { recursive: true });
  }

  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
  const ext = file.name.split('.').pop();
  const fileName = `${uniqueSuffix}.${ext}`;
  const path = join(uploadDir, fileName);

  await writeFile(path, buffer);
  
  const fileUrl = `/uploads/${fileName}`;

  return await prisma.attachment.create({
    data: {
      fileName: file.name,
      fileUrl,
      fileType: file.type,
      cardId
    }
  });
}

export async function deleteAttachmentAction(attachmentId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");
  
  // We can just rely on Prisma to delete the record. We could also delete from disk.
  // For safety, let's keep it simple and just delete the DB record in this MVP.
  await prisma.attachment.delete({ where: { id: attachmentId } });
}
