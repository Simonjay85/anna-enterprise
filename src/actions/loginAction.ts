"use server";

import { signIn } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { SignJWT } from 'jose';

export async function loginUserAction(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    redirect('/login?error=Missing email or password');
  }

  try {
    // Verify credentials manually
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.password) {
      redirect('/login?error=Invalid email or password');
    }

    const isValid = await bcrypt.compare(password, user.password!);
    if (!isValid) {
      redirect('/login?error=Invalid email or password');
    }

    // Create a JWT session token directly (same format NextAuth uses)
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET!);
    const now = Math.floor(Date.now() / 1000);

    const token = await new SignJWT({
      sub: user.id,
      name: user.name,
      email: user.email,
      iat: now,
      exp: now + 30 * 24 * 60 * 60, // 30 days
      jti: crypto.randomUUID(),
    })
      .setProtectedHeader({ alg: 'HS256' })
      .sign(secret);

    const cookieStore = await cookies();
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieName = isProduction
      ? '__Secure-next-auth.session-token'
      : 'next-auth.session-token';

    cookieStore.set(cookieName, token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    });
  } catch (e: any) {
    // redirect throws internally, let it pass
    if (e?.digest?.startsWith('NEXT_REDIRECT')) throw e;
    redirect('/login?error=Server error, please try again');
  }

  redirect('/');
}
