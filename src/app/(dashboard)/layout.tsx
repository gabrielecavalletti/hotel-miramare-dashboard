import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { DashboardTopbar } from '@/components/layout/DashboardTopbar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const newCount = await prisma.call.count({ where: { status: 'NEW' } })

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <DashboardTopbar
        userName={session.user?.name ?? session.user?.email ?? 'Utente'}
        userRole={(session.user as { role?: string }).role ?? 'STAFF'}
        newCount={newCount}
      />
      <main className="flex-1 container mx-auto px-4 py-6 max-w-7xl">
        {children}
      </main>
    </div>
  )
}
