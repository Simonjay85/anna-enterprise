import Board from '@/components/Board';
import LogoutButton from '@/components/LogoutButton';
import { getBoardAction, getUsersAction } from '@/actions/board';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function BoardPage({ params }: { params: Promise<{ boardId: string }> }) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'sans-serif' }}>
        <p>Redirecting to login...</p>
        <script dangerouslySetInnerHTML={{ __html: `window.location.href = "/login";` }} />
      </div>
    );
  }

  try {
    const { boardId } = await params;
    const board = await getBoardAction(boardId);
    const users = await getUsersAction();

    return (
      <main className="min-h-screen" style={{ backgroundColor: 'var(--background)' }}>
        <header style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          padding: '1rem 2rem', 
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Link href="/" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 'bold' }}>
              ← Anna Home
            </Link>
            <h1 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--foreground)' }}>
              {board.title}
            </h1>
            <span style={{ padding: '0.2rem 0.5rem', background: 'var(--surface-hover)', borderRadius: '4px', fontSize: '0.8rem' }}>
              {board.visibility}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <Link href="/inbox" style={{ textDecoration: 'none', background: 'var(--surface-hover)', padding: '0.5rem 1rem', borderRadius: '4px', color: 'var(--foreground)' }}>
              📥 Phân Công (Inbox)
            </Link>
            <span>{session.user?.name}</span>
            <LogoutButton />
          </div>
        </header>

        <section style={{ padding: '1rem 2rem', height: 'calc(100vh - 70px)' }}>
          <Board boardId={board.id} initialLists={board.lists as any} initialUsers={users} initialRules={board.rules as any} />
        </section>
      </main>
    );
  } catch (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>Unauthorized or Board Not Found</h2>
        <Link href="/">Return to Home</Link>
      </div>
    );
  }
}
