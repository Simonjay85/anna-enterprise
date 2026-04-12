'use server';

import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { redirect } from 'next/navigation';

export async function registerUserAction(formData: FormData) {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !name || !password) {
    redirect('/register?error=Missing required fields');
  }

  const exists = await prisma.user.findUnique({
    where: { email }
  });

  if (exists) {
    redirect('/register?error=User already exists');
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
    }
  });

  redirect('/login');
}
