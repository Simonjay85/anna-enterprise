"use server";

import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { encode } from 'next-auth/jwt';

export async function loginUserAction(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    redirect('/login?error=Missing email or password');
  }

  try {
    // 1. Verify credentials against DB
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.password) {
      redirect('/login?error=Invalid email or password');
    }

    const isValid = await bcrypt.compare(password, user.password!);
    if (!isValid) {
      redirect('/login?error=Invalid email or password');
    }

    // 2. Create NextAuth-compatible JWT token using next-auth/jwt encode
    const token = await encode({
      token: {
        sub: user.id,
        name: user.name,
        email: user.email,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days
      },
      secret: process.env.NEXTAUTH_SECRET!,
    });

    // 3. Set the session cookie (NextAuth uses __Secure- prefix in production)
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
    // Let Next.js redirects pass through
    if (e?.digest?.startsWith('NEXT_REDIRECT')) throw e;
    console.error('Login error:', e);
    redirect('/login?error=Server error, please try again');
  }

  redirect('/');
}
