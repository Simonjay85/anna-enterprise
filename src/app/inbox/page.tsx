import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';

export default async function InboxPage() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'sans-serif' }}>
        <p>Redirecting to login...</p>
        <script dangerouslySetInnerHTML={{ __html: `window.location.href = "/login";` }} />
      </div>
    );
  }

  // Fetch all cards belonging to ANY workspace the user is a member of
  const cards = await prisma.card.findMany({
    where: {
      list: {
        board: {
          workspace: {
            members: {
              some: { userId: session.user.id }
            }
          }
        }
      }
    },
    include: {
      list: {
        include: {
          board: {
            include: {
              workspace: true
            }
          }
        }
      },
      assignee: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

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
            ← Home
          </Link>
          <h1 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--foreground)' }}>
            📥 Unified Inbox / Task Board
          </h1>
        </div>
      </header>

      <section style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ background: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--border)', overflow: 'hidden' }}>
          
          {cards.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)' }}>
              No tasks found across your workspaces.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--surface-hover)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '1rem' }}>Task</th>
                  <th style={{ padding: '1rem' }}>Project (Board)</th>
                  <th style={{ padding: '1rem' }}>Status (List)</th>
                  <th style={{ padding: '1rem' }}>Assignee/Owner</th>
                </tr>
              </thead>
              <tbody>
                {cards.map(card => (
                  <tr key={card.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '1rem' }}>
                      <Link href={`/b/${card.list.boardId}`} style={{ color: 'var(--foreground)', textDecoration: 'none', fontWeight: '500' }}>
                        {card.title}
                      </Link>
                    </td>
                    <td style={{ padding: '1rem', color: 'var(--muted)' }}>
                      {card.list.board.title}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ background: 'var(--surface-hover)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.85rem' }}>
                        {card.list.title}
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {(card.assignee || card.ownerName) ? (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--primary)', background: 'rgba(59, 130, 246, 0.1)', padding: '0.2rem 0.6rem', borderRadius: '12px' }}>
                          👤 {card.assignee?.name || card.ownerName}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Unassigned</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

        </div>
      </section>
    </main>
  );
}
