"use server";

import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { redirect } from 'next/navigation';

export async function loginUserAction(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    redirect('/login?error=Missing email or password');
  }

  // 1. Manually hit NextAuth API so NextAuth sets the session cookie natively 
  // bypassing all client side next-auth react hooks and CSRF tokens
  
  // We fetch CSRF Token
  const csrfRes = await fetch('http://localhost:3000/api/auth/csrf', { cache: 'no-store' });
  const { csrfToken } = await csrfRes.json();
  const csrfCookie = csrfRes.headers.get('set-cookie');

  const payload = new URLSearchParams({
    email,
    password,
    csrfToken,
    json: 'true',
  });

  const res = await fetch('http://localhost:3000/api/auth/callback/credentials', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': csrfCookie ? csrfCookie.split(';')[0] : '',
    },
    body: payload,
    redirect: 'manual'
  });

  const data = await res.json();
  
  if (data.url && !data.url.includes('error')) {
    // Forward the session cookie down to the client!
    const { cookies } = await import('next/headers');
    const setCookieHeader = res.headers.get('set-cookie');
    
    if (setCookieHeader) {
      // Very simple extraction: next-auth.session-token=ABC; Path=/; HttpOnly...
      // Instead of parsing perfectly, Next.js cookies API handles it well
      const match = setCookieHeader.match(/next-auth\.session-token=([^;]+)/);
      if (match && match[1]) {
        (await cookies()).set('next-auth.session-token', match[1], {
          path: '/',
          httpOnly: true,
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production'
        });
      }
    }
    
    redirect('/');
  } else {
    redirect('/login?error=Invalid email or password');
  }
}
