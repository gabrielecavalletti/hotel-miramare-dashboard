'use client'

import { signOut } from 'next-auth/react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LogOutIcon, PhoneCallIcon, BarChart2Icon, BotIcon } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface DashboardTopbarProps {
  userName: string
  userRole: string
  newCount: number
}

export function DashboardTopbar({ userName, userRole, newCount }: DashboardTopbarProps) {
  const pathname = usePathname()
  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex items-center justify-between h-14">
          {/* Left: Brand + Nav */}
          <div className="flex items-center gap-6">
            <Link href="/calls" className="flex items-center gap-2 font-bold text-gray-900 hover:text-blue-600 transition-colors">
              <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                M
              </div>
              <span className="hidden sm:inline">Miramare Dashboard</span>
            </Link>
            <nav className="flex items-center gap-1">
              <Link
                href="/calls"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  pathname.startsWith('/calls')
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <PhoneCallIcon className="size-4" />
                <span>Chiamate</span>
                {newCount > 0 && (
                  <Badge className="bg-blue-600 text-white text-xs ml-0.5 h-4 min-w-4 px-1">
                    {newCount}
                  </Badge>
                )}
              </Link>
              <Link
                href="/stats"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  pathname.startsWith('/stats')
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <BarChart2Icon className="size-4" />
                <span>Statistiche</span>
              </Link>
              {userRole === 'ADMIN' && (
                <Link
                  href="/agent"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    pathname.startsWith('/agent')
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <BotIcon className="size-4" />
                  <span>Gestione Bot</span>
                </Link>
              )}
            </nav>
          </div>

          {/* Right: User info + signout */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm font-medium text-gray-800 leading-none">{userName}</span>
              <span className="text-xs text-gray-400 leading-none mt-0.5">
                {userRole === 'ADMIN' ? 'Amministratore' : 'Staff'}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => signOut({ callbackUrl: '/login' })}
              title="Esci"
              className="text-gray-500 hover:text-red-600"
            >
              <LogOutIcon className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
