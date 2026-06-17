// src/App.jsx
import { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './lib/AuthContext'
import { leads as leadsApi, callData as callDataApi, users as usersApi } from './lib/api'
import { BRAND } from './lib/constants'

import Sidebar       from './components/Sidebar'
import LoginPage     from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import LeadsPage     from './pages/LeadsPage'
import CallDataPage  from './pages/CallDataPage'
import UsersPage     from './pages/UsersPage'
import { Spinner }   from './components/ui'

function CRMApp() {
  const { user } = useAuth()
  const [page, setPage]       = useState('dashboard')
  const [leads, setLeads]     = useState([])
  const [numbers, setNumbers] = useState([])
  const [users, setUsers]     = useState([])
  const [loading, setLoading] = useState(false)

  // Load all data once on login
  useEffect(() => {
    if (!user) return
    setLoading(true)
    Promise.all([
      leadsApi.list(),
      callDataApi.list(),
      usersApi.list().catch(() => ({ users: [] })), // non-managers get 403
    ]).then(([leadsData, cdData, usersData]) => {
      setLeads(leadsData.leads || [])
      setNumbers(cdData.numbers || [])
      setUsers(usersData.users || [])
    }).catch(console.error)
      .finally(() => setLoading(false))
  }, [user])

  if (!user) return <LoginPage />

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: '12px' }}>
        <Spinner size={32} />
        <span style={{ fontSize: '13px', color: BRAND.textSub }}>Loading your data…</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  const pages = {
    dashboard: <DashboardPage leads={leads} numbers={numbers} users={users} />,
    leads:     <LeadsPage leads={leads} setLeads={setLeads} />,
    'call-data': <CallDataPage numbers={numbers} setNumbers={setNumbers} />,
    users:     <UsersPage users={users} setUsers={setUsers} />,
  }

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', system-ui, -apple-system, sans-serif; background: ${BRAND.bg}; }
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        <Sidebar current={page} onNavigate={setPage} />
        <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {pages[page] || pages.dashboard}
        </main>
      </div>
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <CRMApp />
    </AuthProvider>
  )
}
