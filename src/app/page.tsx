import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import LogoutButton from '@/components/LogoutButton';
import { getWorkspacesAction } from '@/actions/workspace';
import DashboardClient from '@/components/DashboardClient';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'sans-serif' }}>
        <p>Redirecting to login...</p>
        <script dangerouslySetInnerHTML={{ __html: `window.location.href = "/login";` }} />
      </div>
    );
  }

  const workspaces = await getWorkspacesAction();

  return (
    <main className="min-h-screen" style={{ backgroundColor: 'var(--background)' }}>
      <header style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        padding: '1rem 2rem', 
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)'
      }}>
        <h1 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--primary)' }}>
          Anna Enterprise
        </h1>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <Link href="/inbox" style={{ textDecoration: 'none', background: 'var(--surface-hover)', padding: '0.5rem 1rem', borderRadius: '4px', color: 'var(--foreground)' }}>
            📥 Phân Công (Inbox)
          </Link>
          <span>{session.user?.name}</span>
          <LogoutButton />
        </div>
      </header>

      <DashboardClient initialWorkspaces={workspaces as any} />
    </main>
  );
}
