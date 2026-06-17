// src/pages/DashboardPage.jsx
import { useMemo } from 'react'
import { Phone, Users, TrendingUp, Clock } from 'lucide-react'
import { Card, Badge } from '../components/ui'
import { BRAND } from '../lib/constants'
import { useAuth } from '../lib/AuthContext'

function StatCard({ icon: Icon, label, value, color, sub }) {
  return (
    <Card style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
      <div style={{ width: 40, height: 40, borderRadius: '10px', background: color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={18} color={color} />
      </div>
      <div>
        <div style={{ fontSize: '26px', fontWeight: 800, color: BRAND.textMain, lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: '12px', color: BRAND.textMuted, marginTop: '3px' }}>{label}</div>
        {sub && <div style={{ fontSize: '11px', color: BRAND.textSub, marginTop: '2px' }}>{sub}</div>}
      </div>
    </Card>
  )
}

export default function DashboardPage({ leads, numbers, users }) {
  const { user } = useAuth()

  const today = new Date().toISOString().split('T')[0]

  const stats = useMemo(() => {
    const openLeads    = leads.filter(l => l.status === 'open').length
    const closedLeads  = leads.filter(l => l.status === 'closed').length
    const todayFollowups = leads.filter(l => l.followupDate?.startsWith(today)).length
    const totalCalls   = leads.reduce((sum, l) => sum + (l.callLogs?.length || 0), 0)
    return { openLeads, closedLeads, todayFollowups, totalCalls }
  }, [leads, today])

  // Leads needing follow-up today
  const followupToday = leads.filter(l => l.followupDate?.startsWith(today)).slice(0, 8)

  // Recent leads
  const recentLeads = [...leads].slice(0, 5)

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <div style={{ padding: '24px 28px', overflowY: 'auto', height: '100%' }}>
      {/* Greeting */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 800, color: BRAND.textMain, margin: '0 0 4px' }}>
          {greeting()}, {user?.fname}! 🌟
        </h1>
        <p style={{ fontSize: '13px', color: BRAND.textMuted, margin: 0 }}>
          Consistency beats perfection every time.
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
        <StatCard icon={Phone}      label="Open Leads"       value={stats.openLeads}      color="#2563eb" />
        <StatCard icon={TrendingUp} label="Closed Leads"     value={stats.closedLeads}    color="#16a34a" />
        <StatCard icon={Clock}      label="Follow-ups Today" value={stats.todayFollowups} color="#d97706" />
        <StatCard icon={Phone}      label="Total Calls"      value={stats.totalCalls}     color="#7c3aed" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* Follow-ups today */}
        <Card>
          <div style={{ fontSize: '14px', fontWeight: 700, color: BRAND.textMain, marginBottom: '14px' }}>
            📅 Follow-ups Today
          </div>
          {followupToday.length === 0 ? (
            <div style={{ fontSize: '13px', color: BRAND.textMuted, textAlign: 'center', padding: '20px 0' }}>
              No follow-ups scheduled for today
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {followupToday.map(lead => (
                <div key={lead.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: BRAND.bg, borderRadius: '8px' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: BRAND.textMain }}>{lead.parentName || lead.mobile}</div>
                    <div style={{ fontSize: '11px', color: BRAND.textMuted }}>{lead.city} · {lead.callLogs?.length || 0} calls</div>
                  </div>
                  <Badge status={lead.status}>{lead.status === 'open' ? 'Open' : 'Closed'}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recent activity */}
        <Card>
          <div style={{ fontSize: '14px', fontWeight: 700, color: BRAND.textMain, marginBottom: '14px' }}>
            🕐 Recent Leads
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {recentLeads.map(lead => (
              <div key={lead.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: BRAND.bg, borderRadius: '8px' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: BRAND.textMain }}>{lead.parentName || lead.mobile}</div>
                  <div style={{ fontSize: '11px', color: BRAND.textMuted }}>{lead.city} · {lead.source}</div>
                </div>
                <div style={{ fontSize: '11px', color: BRAND.textMuted }}>{lead.entryDate}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
