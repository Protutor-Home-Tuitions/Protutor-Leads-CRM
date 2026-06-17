// src/components/Sidebar.jsx
import { LayoutDashboard, Users, PhoneCall, Settings, LogOut } from 'lucide-react'
import { BRAND } from '../lib/constants'
import { useAuth } from '../lib/AuthContext'
import { Avatar } from './ui'

const NAV = [
  { id: 'dashboard',  label: 'Dashboard',       icon: LayoutDashboard },
  { id: 'leads',      label: 'Leads',            icon: PhoneCall },
  { id: 'call-data',  label: 'Call Data',        icon: PhoneCall },
  { id: 'users',      label: 'User Management',  icon: Settings },
]

export default function Sidebar({ current, onNavigate }) {
  const { user, logout } = useAuth()
  const isManager = user?.role === 'manager'

  const visibleNav = isManager ? NAV : NAV.filter(n => n.id !== 'users')

  return (
    <aside style={{
      width: '200px', minHeight: '100vh', background: BRAND.primary,
      display: 'flex', flexDirection: 'column', flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: '20px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: 32, height: 32, borderRadius: '8px', background: BRAND.accent,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 800, fontSize: '14px',
          }}>P</div>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: '15px' }}>ProTutor CRM</span>
        </div>
      </div>

      {/* Nav links */}
      <nav style={{ flex: 1, padding: '12px 8px' }}>
        <p style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', padding: '0 8px', marginBottom: '6px', letterSpacing: '0.08em' }}>MENU</p>
        {visibleNav.map(({ id, label, icon: Icon }) => {
          const active = current === id
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                padding: '9px 10px', borderRadius: '8px', border: 'none',
                background: active ? 'rgba(255,255,255,0.15)' : 'transparent',
                color: active ? '#fff' : 'rgba(255,255,255,0.65)',
                fontSize: '13px', fontWeight: active ? 600 : 400,
                cursor: 'pointer', marginBottom: '2px', textAlign: 'left',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
            >
              <Icon size={15} />
              {label}
            </button>
          )
        })}
      </nav>

      {/* User + logout */}
      <div style={{ padding: '12px 8px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', marginBottom: '4px' }}>
          <Avatar name={user?.fname} size={28} color={BRAND.accent} />
          <div>
            <div style={{ color: '#fff', fontSize: '12px', fontWeight: 600 }}>{user?.fname}</div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', textTransform: 'capitalize' }}>{user?.role}</div>
          </div>
        </div>
        <button
          onClick={logout}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
            padding: '8px 10px', border: 'none', borderRadius: '8px',
            background: 'transparent', color: 'rgba(255,255,255,0.55)',
            fontSize: '13px', cursor: 'pointer',
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#fff'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.55)'}
        >
          <LogOut size={14} />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
