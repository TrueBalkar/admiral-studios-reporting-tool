import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'
import Sidebar from '@/components/Sidebar'
import ConfirmProvider from '@/components/ui/ConfirmProvider'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthUser()
  if (!user) redirect('/login')

  return (
    <ConfirmProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar user={user} />
        <main
          id="main-content"
          className="flex-1 overflow-y-auto bg-gray-50"
          style={{ marginLeft: '240px', transition: 'margin-left 0.2s ease' }}
        >
          {children}
        </main>
      </div>
    </ConfirmProvider>
  )
}
