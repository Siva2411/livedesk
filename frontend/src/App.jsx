import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Client } from '@stomp/stompjs'
import {
  Activity, AlertCircle, ArrowRight, ArrowUpRight, Bell, BookOpen, Check, CheckCheck,
  CheckCircle2, ChevronDown, ChevronRight, CircleHelp, FileText, Filter, Headphones, Inbox,
  LayoutDashboard, LifeBuoy, LogOut, Menu, MessageCircle, MoreHorizontal, Paperclip, Plus,
  Search, Send, Settings, ShieldCheck, SlidersHorizontal, Sparkles, Ticket, Users, X,
} from 'lucide-react'
import { api, apiBase, authStore } from './services/api'

const DEMO_LOGINS = [
  { label: 'Admin workspace', email: 'admin@livedesk.demo', password: 'Admin@123', role: 'ADMIN' },
  { label: 'Support agent', email: 'alex@livedesk.demo', password: 'Agent@123', role: 'AGENT' },
  { label: 'Customer portal', email: 'sophia@example.com', password: 'Customer@123', role: 'CUSTOMER' },
]

const navStaff = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'inbox', label: 'Live inbox', icon: Inbox, count: true },
  { id: 'tickets', label: 'All tickets', icon: Ticket },
  { id: 'customers', label: 'Customers', icon: Users },
]
const navCustomer = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'tickets', label: 'My tickets', icon: Ticket },
]

const initials = (name = '') => name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'LD'
const titleCase = (value = '') => value.toLowerCase().replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
const dateShort = (value) => value ? new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(value)) : '—'
const timeShort = (value) => value ? new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' }).format(new Date(value)) : ''
const ago = (value) => {
  if (!value) return 'Just now'
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000))
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function Avatar({ name, size = 'md', tone }) {
  const colors = ['violet', 'blue', 'peach', 'mint', 'rose', 'slate']
  const color = tone || colors[(name || '').length % colors.length]
  return <span className={`avatar avatar-${size} tone-${color}`}>{initials(name)}</span>
}

function StatusPill({ status }) {
  const map = { OPEN: 'open', IN_PROGRESS: 'progress', WAITING_FOR_CUSTOMER: 'waiting', RESOLVED: 'resolved', CLOSED: 'closed' }
  return <span className={`status-pill status-${map[status] || 'open'}`}><i />{titleCase(status || 'Open')}</span>
}

function PriorityPill({ priority }) {
  return <span className={`priority priority-${(priority || 'normal').toLowerCase()}`}><span />{titleCase(priority || 'Normal')}</span>
}

function LoginScreen({ onLogin, onRegister }) {
  const [registerMode, setRegisterMode] = useState(false)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState(import.meta.env.DEV ? DEMO_LOGINS[0].email : '')
  const [password, setPassword] = useState(import.meta.env.DEV ? DEMO_LOGINS[0].password : '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)
    try { if (registerMode) await onRegister(fullName, email, password); else await onLogin(email, password) } catch (err) { setError(err.message || 'Unable to sign in') }
    finally { setLoading(false) }
  }

  const useDemo = (account) => { setEmail(account.email); setPassword(account.password); setError('') }

  return (
    <div className="login-shell">
      <div className="login-visual">
        <div className="login-brand"><span className="brand-mark"><LifeBuoy size={22} /></span><span>livedesk</span></div>
        <div className="login-visual-copy">
          <span className="eyebrow light-eyebrow"><span /> SUPPORT, IN SYNC</span>
          <h1>Great support<br />starts with <em>listening.</em></h1>
          <p>One calm workspace for every customer conversation. Stay close to the details, and even closer to the people.</p>
        </div>
        <div className="visual-chat-card">
          <div className="visual-chat-top"><span className="live-dot" /> Live conversation <span className="visual-time">now</span></div>
          <div className="visual-chat-row"><Avatar name="Sophia Bennett" size="sm" tone="peach" /><div><b>Sophia Bennett</b><span>Hi! I need a little help with my invoice.</span></div></div>
          <div className="visual-agent-reply">Absolutely, Sophia. I’m on it! <CheckCheck size={13} /></div>
          <div className="visual-chat-footer"><span>Reply in a moment...</span><span className="send-bubble"><ArrowRight size={14} /></span></div>
        </div>
        <div className="login-visual-footer"><span>Built for thoughtful support teams</span><span>01 / 03</span></div>
      </div>
      <div className="login-form-side">
        <div className="login-mobile-brand"><span className="brand-mark"><LifeBuoy size={20} /></span><b>livedesk</b></div>
        <div className="login-form-wrap">
          <div className="form-kicker">{registerMode ? 'GET STARTED' : 'WELCOME BACK'}</div>
          <h2>{registerMode ? 'Create your account' : 'Sign in to your workspace'}</h2>
          <p className="muted">{registerMode ? 'Create a customer account to start a support conversation.' : 'Your support desk is ready when you are.'}</p>
          <form onSubmit={submit} className="login-form">
            {registerMode && <><label>Full name<div className="input-wrap"><Users size={17}/><input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" maxLength={100} required/></div></label></>}
            <label>Email address</label>
            <div className="input-wrap"><Users size={17} /><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" required /></div>
            <div className="label-row"><label>Password</label><button type="button" className="text-button" onClick={() => setShowPassword((v) => !v)}>{showPassword ? 'Hide' : 'Show'}</button></div>
            <div className="input-wrap"><ShieldCheck size={17} /><input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={registerMode ? 'Choose a password (8+ characters)' : 'Enter your password'} minLength={registerMode ? 8 : undefined} required /></div>
            {error && <div className="form-error"><AlertCircle size={15} />{error}</div>}
            <button className="primary-button login-submit" disabled={loading}>{loading ? <span className="spinner" /> : <>{registerMode ? 'Create account' : 'Sign in'} <ArrowRight size={17} /></>}</button>
          </form>
          <div className="login-switch">{registerMode ? 'Already have an account?' : 'New to LiveDesk?'} <button type="button" onClick={() => { const next = !registerMode; setRegisterMode(next); setError(''); setEmail(next ? '' : (import.meta.env.DEV ? DEMO_LOGINS[0].email : '')); setPassword(next ? '' : (import.meta.env.DEV ? DEMO_LOGINS[0].password : '')) }}>{registerMode ? 'Sign in' : 'Create a customer account'}</button></div>
          {import.meta.env.DEV && !registerMode && <><div className="demo-divider"><span />DEMO ACCESS<span /></div>
          <div className="demo-options">
            {DEMO_LOGINS.map((account) => <button key={account.role} onClick={() => useDemo(account)} className={`demo-option ${email === account.email ? 'selected' : ''}`}><span className="demo-option-icon">{account.role === 'ADMIN' ? <ShieldCheck size={16} /> : account.role === 'AGENT' ? <Headphones size={16} /> : <Users size={16} />}</span><span><b>{account.label}</b><small>{account.email}</small></span><ChevronRight size={16} /></button>)}
          </div></>}
          <div className="login-footnote"><ShieldCheck size={14} /> {registerMode ? 'Customer registration is protected by server-side validation.' : 'Your demo workspace uses seeded sample data.'}</div>
        </div>
        <div className="login-legal">© 2026 LiveDesk <span>·</span> Made for better conversations</div>
      </div>
    </div>
  )
}

function PageHeading({ eyebrow, title, description, actions }) {
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{actions && <div className="heading-actions">{actions}</div>}</div>
}

function MetricCard({ label, value, note, icon: Icon, tone = 'blue' }) {
  return <div className="metric-card"><div className="metric-top"><span>{label}</span><span className={`metric-icon metric-${tone}`}><Icon size={18} /></span></div><div className="metric-value">{value}</div><div className="metric-foot"><span className="metric-foot-label">{note}</span></div></div>
}

function VolumeChart({ data = [] }) {
  const width = 660, height = 190, left = 20, right = 12, top = 18, bottom = 28
  const values = data.map((d) => d.count || 0)
  const max = Math.max(5, ...values)
  const points = values.map((v, i) => {
    const x = left + (i * (width - left - right)) / Math.max(1, values.length - 1)
    const y = top + (height - top - bottom) - (v / max) * (height - top - bottom)
    return `${x},${y}`
  }).join(' ')
  const fillPath = `${left},${height - bottom} ${points} ${width - right},${height - bottom}`
  return <div className="chart-wrap"><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Ticket volume for the last seven days" className="volume-svg"><defs><linearGradient id="volumeFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#4d91d9" stopOpacity=".22"/><stop offset="100%" stopColor="#4d91d9" stopOpacity="0"/></linearGradient></defs>{[0, 1, 2, 3].map((line) => { const y = top + line * ((height - top - bottom) / 3); return <line key={line} x1={left} y1={y} x2={width - right} y2={y} stroke="#edf0f4" strokeDasharray="4 5" /> })}<polygon points={fillPath} fill="url(#volumeFill)"/><polyline points={points} fill="none" stroke="#4b8fd5" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"/>{data.map((d, i) => { const x = left + (i * (width - left - right)) / Math.max(1, data.length - 1); const y = top + (height - top - bottom) - ((d.count || 0) / max) * (height - top - bottom); return <g key={d.day}><circle cx={x} cy={y} r="4" fill="#fff" stroke="#4b8fd5" strokeWidth="2"/><text x={x} y={height - 5} textAnchor="middle" fill="#98a1ae" fontSize="11">{d.day}</text></g> })}</svg></div>
}

function TicketTable({ tickets, onOpen, compact = false }) {
  if (!tickets?.length) return <div className="empty-state"><span><Ticket size={21}/></span><b>All clear here</b><p>No tickets match your current filters.</p></div>
  return <div className="table-scroll"><table className={`ticket-table ${compact ? 'compact' : ''}`}><thead><tr><th>Ticket</th><th>Customer</th><th>Priority</th><th>Status</th><th>Assignee</th><th>Updated</th><th /></tr></thead><tbody>{tickets.map((ticket) => <tr key={ticket.id} onClick={() => onOpen(ticket)}><td><div className="ticket-subject"><span className="ticket-key">{ticket.ticketKey}</span><b>{ticket.subject}</b></div></td><td><div className="customer-cell"><Avatar name={ticket.customerName} size="xs"/><span>{ticket.customerName}</span></div></td><td><PriorityPill priority={ticket.priority}/></td><td><StatusPill status={ticket.status}/></td><td>{ticket.assigneeName ? <div className="assignee-cell"><Avatar name={ticket.assigneeName} size="xs"/><span>{ticket.assigneeName}</span></div> : <span className="unassigned-label">Unassigned</span>}</td><td className="updated-cell">{ago(ticket.updatedAt)}</td><td><ChevronRight size={15} className="row-chevron"/></td></tr>)}</tbody></table></div>
}

function Dashboard({ user, stats, tickets, onNavigate, onOpenTicket, onCreate }) {
  const isStaff = user.role !== 'CUSTOMER'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const latest = [...tickets].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 5)
  const total = stats?.total ?? tickets.length
  const segments = [
    { value: stats?.open ?? 0, color: '#4b91d0' },
    { value: stats?.inProgress ?? 0, color: '#7fc8b2' },
    { value: stats?.waiting ?? 0, color: '#f0c27d' },
    { value: stats?.resolved ?? 0, color: '#dfe6ec' },
  ]
  let currentPercent = 0
  const donutGradient = total > 0
    ? `conic-gradient(${segments.map((segment) => { const start = currentPercent; currentPercent += (segment.value / total) * 100; return `${segment.color} ${start}% ${currentPercent}%` }).join(', ')})`
    : '#e7edf2'
  return <div className="page-content">
    <PageHeading eyebrow={isStaff ? 'WORKSPACE OVERVIEW' : 'YOUR SUPPORT SPACE'} title={`${greeting}, ${user.name.split(' ')[0]}`} description={isStaff ? 'Here’s what’s happening across your support desk today.' : 'Keep track of your conversations and get help when you need it.'} actions={<><button className="secondary-button" onClick={() => onNavigate('tickets')}><FileText size={16}/> {isStaff ? 'View tickets' : 'My tickets'}</button>{!isStaff && <button className="primary-button" onClick={onCreate}><Plus size={17}/> New ticket</button>}</>}/>
    <div className="metric-grid">
      <MetricCard label={isStaff ? 'Total tickets' : 'My tickets'} value={stats?.total ?? tickets.length} note="All conversations" icon={Ticket} tone="blue"/>
      <MetricCard label={isStaff ? 'Open tickets' : 'Awaiting response'} value={isStaff ? (stats?.open ?? 0) + (stats?.inProgress ?? 0) : (stats?.open ?? 0) + (stats?.inProgress ?? 0)} note="Open and in progress" icon={Inbox} tone="amber"/>
      <MetricCard label="Resolved" value={stats?.resolved ?? 0} note="Resolved or closed" icon={CheckCircle2} tone="green"/>
      <MetricCard label={isStaff ? 'Urgent priority' : 'Waiting on you'} value={isStaff ? stats?.urgent ?? 0 : stats?.waiting ?? 0} note={isStaff ? 'Needs attention' : 'Awaiting a response'} icon={AlertCircle} tone="rose"/>
    </div>
    <div className="dashboard-grid">
      <section className="panel volume-panel"><div className="panel-heading"><div><h3>Ticket activity</h3><p>Incoming conversations over the last 7 days</p></div><button className="period-select">Last 7 days <ChevronDown size={14}/></button></div><div className="chart-legend"><span><i/>New tickets</span><strong>{stats?.total ?? tickets.length} <small>total</small></strong></div><VolumeChart data={stats?.weeklyVolume || []}/></section>
      <section className="panel priority-panel"><div className="panel-heading"><div><h3>Ticket health</h3><p>Current support workload</p></div><button className="icon-button"><MoreHorizontal size={18}/></button></div><div className="health-visual"><div className="donut" style={{ background: donutGradient }}><div className="donut-center"><b>{stats?.total ?? tickets.length}</b><span>Total tickets</span></div></div></div><div className="health-legend"><div><span className="legend-dot dot-open"/>Open <b>{stats?.open ?? 0}</b></div><div><span className="legend-dot dot-progress"/>In progress <b>{stats?.inProgress ?? 0}</b></div><div><span className="legend-dot dot-waiting"/>Waiting <b>{stats?.waiting ?? 0}</b></div><div><span className="legend-dot dot-resolved"/>Resolved <b>{stats?.resolved ?? 0}</b></div></div></section>
    </div>
    <section className="panel recent-panel"><div className="panel-heading"><div><h3>{isStaff ? 'Recent tickets' : 'Recent conversations'}</h3><p>The latest conversations that need your attention</p></div><button className="link-button" onClick={() => onNavigate('tickets')}>View all <ArrowRight size={15}/></button></div><TicketTable tickets={latest} onOpen={onOpenTicket} compact/></section>
    <div className="bottom-note"><span className="note-icon"><Sparkles size={17}/></span><span><b>A little more human, every day.</b><small>LiveDesk brings your team and customers together in one thoughtful workspace.</small></span><button className="link-button" onClick={() => onNavigate('inbox')}>Go to inbox <ArrowRight size={14}/></button></div>
  </div>
}

function TicketsPage({ tickets, onOpen, onCreate, isStaff }) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('ALL')
  const [priority, setPriority] = useState('ALL')
  const filtered = tickets.filter((t) => `${t.ticketKey} ${t.subject} ${t.customerName}`.toLowerCase().includes(query.toLowerCase()) && (status === 'ALL' || t.status === status) && (priority === 'ALL' || t.priority === priority))
  return <div className="page-content"><PageHeading eyebrow="TICKET MANAGEMENT" title={isStaff ? 'All tickets' : 'My tickets'} description={isStaff ? 'Every customer conversation, organized in one place.' : 'Your support requests and their latest status.'} actions={!isStaff && <button className="primary-button" onClick={onCreate}><Plus size={17}/> Create ticket</button>}/>
    <section className="panel tickets-panel"><div className="table-toolbar"><div className="search-box"><Search size={16}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search tickets, customers..."/></div><div className="toolbar-filters"><label><Filter size={15}/><select value={status} onChange={(e) => setStatus(e.target.value)}><option value="ALL">All statuses</option><option value="OPEN">Open</option><option value="IN_PROGRESS">In progress</option><option value="WAITING_FOR_CUSTOMER">Waiting</option><option value="RESOLVED">Resolved</option><option value="CLOSED">Closed</option></select></label><label><SlidersHorizontal size={15}/><select value={priority} onChange={(e) => setPriority(e.target.value)}><option value="ALL">All priorities</option><option value="URGENT">Urgent</option><option value="HIGH">High</option><option value="NORMAL">Normal</option><option value="LOW">Low</option></select></label></div></div><div className="ticket-count-line"><span><b>{filtered.length}</b> {filtered.length === 1 ? 'ticket' : 'tickets'}</span><span>Sorted by last activity <ChevronDown size={13}/></span></div><TicketTable tickets={filtered} onOpen={onOpen}/></section>
  </div>
}

function InboxPage({ tickets, selected, setSelected, messages, onSend, onStatus, onPriority, agents, onAssign, currentUser }) {
  const [message, setMessage] = useState('')
  const [filter, setFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [sending, setSending] = useState(false)
  const endRef = useRef(null)
  const visible = tickets.filter((t) => (filter === 'ALL' || (filter === 'OPEN' ? ['OPEN', 'IN_PROGRESS'].includes(t.status) : t.status === filter)) && `${t.subject} ${t.customerName} ${t.ticketKey}`.toLowerCase().includes(search.toLowerCase()))
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) }, [messages, selected?.id])
  const submit = async (e) => { e.preventDefault(); if (!message.trim() || !selected || sending) return; setSending(true); try { await onSend(selected.id, message.trim()); setMessage('') } finally { setSending(false) } }
  return <div className="page-content inbox-page"><PageHeading eyebrow="REAL-TIME CONVERSATIONS" title="Live inbox" description="Every customer conversation, right where your team needs it." actions={<span className="live-status"><i/> Live connection</span>}/>
    <div className="inbox-layout panel">
      <aside className="inbox-list"><div className="inbox-list-head"><div className="inbox-tabs"><button className={filter === 'ALL' ? 'active' : ''} onClick={() => setFilter('ALL')}>All <span>{tickets.length}</span></button><button className={filter === 'OPEN' ? 'active' : ''} onClick={() => setFilter('OPEN')}>Open</button><button className={filter === 'WAITING_FOR_CUSTOMER' ? 'active' : ''} onClick={() => setFilter('WAITING_FOR_CUSTOMER')}>Waiting</button></div><div className="inbox-search"><Search size={15}/><input placeholder="Find a conversation" value={search} onChange={(e) => setSearch(e.target.value)}/></div></div>
        <div className="conversation-list">{visible.map((t) => <button key={t.id} className={`conversation-item ${selected?.id === t.id ? 'selected' : ''}`} onClick={() => setSelected(t)}><div className="conversation-avatar"><Avatar name={t.customerName} size="md"/><span className={`presence ${t.status === 'OPEN' ? 'presence-green' : ''}`}/></div><div className="conversation-copy"><div className="conversation-line"><b>{t.customerName}</b><time>{ago(t.updatedAt)}</time></div><div className="conversation-subject">{t.subject}</div><div className="conversation-preview"><span>{t.ticketKey}</span><StatusPill status={t.status}/></div></div></button>)}{visible.length === 0 && <div className="conversation-empty">No conversations found.</div>}</div>
        <div className="inbox-list-footer"><span className="online-indicator"/> {tickets.length} conversations in your workspace</div>
      </aside>
      {selected ? <section className="conversation-main"><div className="conversation-header"><div className="conversation-person"><Avatar name={selected.customerName} size="lg"/><div><b>{selected.customerName}</b><span>{selected.customerEmail} <i/> {selected.ticketKey}</span></div></div><div className="conversation-actions"><select aria-label="Ticket status" value={selected.status} onChange={(e) => onStatus(selected.id, e.target.value)}><option value="OPEN">Open</option><option value="IN_PROGRESS">In progress</option><option value="WAITING_FOR_CUSTOMER">Waiting</option><option value="RESOLVED">Resolved</option><option value="CLOSED">Closed</option></select><button className="icon-button"><MoreHorizontal size={18}/></button></div></div>
        <div className="conversation-topic"><div><span className="topic-label">SUBJECT</span><b>{selected.subject}</b></div><div className="topic-meta"><PriorityPill priority={selected.priority}/><span className="category-chip">{titleCase(selected.category)}</span></div></div>
        <div className="message-stream"><div className="day-divider"><span>{dateShort(selected.createdAt)}</span></div>{messages.map((m) => { const mine = m.senderEmail === currentUser.email; return <div key={m.id} className={`message-row ${mine ? 'message-mine' : ''}`}><Avatar name={m.senderName} size="sm" tone={m.senderRole === 'CUSTOMER' ? 'peach' : 'blue'}/><div className="message-body"><div className="message-meta"><b>{m.senderName}</b><span>{m.senderRole === 'CUSTOMER' ? 'Customer' : 'Support team'}</span><time>{timeShort(m.createdAt)}</time></div><div className="message-bubble">{m.body}</div></div></div>})}<div ref={endRef}/></div>
        <form className="reply-composer" onSubmit={submit}><div className="composer-tools"><button type="button" title="Attach file (coming soon)" onClick={() => window.alert('File attachments are planned for the next milestone.')}><Paperclip size={17}/></button><span>Replying as <b>{currentUser.name}</b></span><button type="button" title="Insert help article" onClick={() => window.alert('Knowledge base integration is planned for the next milestone.')}><BookOpen size={17}/></button></div><div className="composer-input"><textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Write a thoughtful reply..." rows={2} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(e) } }}/><button className="send-button" type="submit" disabled={!message.trim() || sending}>{sending ? <span className="spinner"/> : <Send size={17}/>}</button></div><div className="composer-hint">Press <kbd>Enter</kbd> to send · <kbd>Shift + Enter</kbd> for a new line</div></form>
      </section> : <div className="inbox-no-selection"><span><MessageCircle size={25}/></span><b>Select a conversation</b><p>Choose a ticket to read the conversation and reply.</p></div>}
      {selected && <aside className="ticket-details"><div className="detail-title">TICKET DETAILS <button className="icon-button"><MoreHorizontal size={17}/></button></div><div className="detail-customer"><Avatar name={selected.customerName} size="xl"/><b>{selected.customerName}</b><span>{selected.customerEmail}</span><small>Customer account</small></div><div className="detail-divider"/><div className="detail-field"><span>ASSIGNEE</span><select value={selected.assigneeEmail || ''} onChange={(e) => onAssign(selected.id, e.target.value)}><option value="">Unassigned</option>{agents.map((a) => <option key={a.id} value={a.email}>{a.name}</option>)}</select></div><div className="detail-field"><span>PRIORITY</span><select aria-label="Ticket priority" value={selected.priority} onChange={(e) => onPriority(selected.id, e.target.value)}><option value="LOW">Low</option><option value="NORMAL">Normal</option><option value="HIGH">High</option><option value="URGENT">Urgent</option></select></div><div className="detail-field"><span>CATEGORY</span><strong>{titleCase(selected.category)}</strong></div><div className="detail-field"><span>CREATED</span><strong>{dateShort(selected.createdAt)}</strong></div><div className="detail-divider"/><div className="detail-note"><span><Sparkles size={15}/> Conversation tip</span><p>Acknowledge the customer's issue before moving into troubleshooting steps.</p></div></aside>}
    </div>
  </div>
}

function CustomersPage({ tickets, onOpen }) {
  const customers = useMemo(() => Object.values(tickets.reduce((acc, t) => { if (!acc[t.customerEmail]) acc[t.customerEmail] = { name: t.customerName, email: t.customerEmail, count: 0, latest: t.updatedAt, tickets: [] }; acc[t.customerEmail].count += 1; acc[t.customerEmail].tickets.push(t); if (new Date(t.updatedAt) > new Date(acc[t.customerEmail].latest)) acc[t.customerEmail].latest = t.updatedAt; return acc }, {})).sort((a, b) => b.count - a.count), [tickets])
  return <div className="page-content"><PageHeading eyebrow="CUSTOMER DIRECTORY" title="Customers" description="Get to know the people behind every conversation."/><div className="customer-grid">{customers.map((c) => <article className="customer-card" key={c.email}><div className="customer-card-head"><Avatar name={c.name} size="xl"/><button className="icon-button"><MoreHorizontal size={17}/></button></div><h3>{c.name}</h3><p>{c.email}</p><div className="customer-stats"><div><b>{c.count}</b><span>Tickets</span></div><div><b>{c.tickets.filter((t) => ['OPEN','IN_PROGRESS'].includes(t.status)).length}</b><span>Active</span></div><div><b>{dateShort(c.latest)}</b><span>Last seen</span></div></div><button className="customer-view" onClick={() => onOpen(c.tickets[0])}>View conversations <ArrowRight size={14}/></button></article>)}</div>{customers.length === 0 && <div className="empty-state">No customers yet.</div>}</div>
}

function AnalyticsPage({ stats, tickets }) {
  const avg = tickets.length ? Math.round(tickets.filter((t) => ['RESOLVED', 'CLOSED'].includes(t.status)).length / tickets.length * 100) : 0
  return <div className="page-content"><PageHeading eyebrow="TEAM PERFORMANCE" title="Analytics" description="A clear view of your support desk's pulse."/><div className="metric-grid"><MetricCard label="Resolution rate" value={`${avg}%`} note="Share of all tickets" icon={CheckCircle2} tone="green"/><MetricCard label="Urgent tickets" value={stats?.urgent ?? 0} note="Needs attention" icon={AlertCircle} tone="rose"/><MetricCard label="Unassigned" value={stats?.unassigned ?? 0} note="Waiting for ownership" icon={Users} tone="amber"/><MetricCard label="Total conversations" value={stats?.total ?? 0} note="All conversations" icon={MessageCircle} tone="blue"/></div><div className="dashboard-grid analytics-grid"><section className="panel volume-panel"><div className="panel-heading"><div><h3>Conversation volume</h3><p>Tickets created by day · last 7 days</p></div></div><VolumeChart data={stats?.weeklyVolume || []}/></section><section className="panel priority-panel"><div className="panel-heading"><div><h3>By category</h3><p>Ticket distribution</p></div></div><div className="category-bars">{(stats?.categories || []).map((c, i) => <div className="category-bar" key={c.category}><div><span>{titleCase(c.category)}</span><b>{c.count}</b></div><div className="bar-track"><i style={{ width: `${Math.max(8, c.count / Math.max(1, stats?.total || 1) * 100)}%` }}/></div></div>)}</div></section></div><div className="panel analytics-tip"><span className="tip-icon"><Activity size={19}/></span><div><b>Keep the feedback loop healthy</b><p>Review urgent and unassigned tickets daily. Fast first responses often make the biggest difference to customer confidence.</p></div></div></div>
}

function SettingsPage({ user, onLogout }) {
  return <div className="page-content"><PageHeading eyebrow="WORKSPACE PREFERENCES" title="Settings" description="Manage your personal workspace and session."/><div className="settings-layout"><section className="panel settings-panel"><div className="settings-section-head"><div><h3>Profile information</h3><p>Your account details for this workspace.</p></div><span className="settings-icon"><Users size={19}/></span></div><div className="profile-preview"><Avatar name={user.name} size="2xl"/><div><b>{user.name}</b><span>{user.email}</span><small>{titleCase(user.role)} account</small></div></div><div className="settings-divider"/><div className="settings-row"><div><b>Workspace</b><span>LiveDesk demo workspace</span></div><span className="readonly-pill">Default</span></div><div className="settings-row"><div><b>Connection</b><span>Secure API session with live updates</span></div><span className="connected-pill"><i/> Connected</span></div><div className="settings-row"><div><b>Session</b><span>Sign out of this device</span></div><button className="secondary-button danger-button" onClick={onLogout}><LogOut size={15}/> Sign out</button></div></section><section className="panel settings-info"><span className="settings-info-icon"><LifeBuoy size={20}/></span><h3>Need a hand?</h3><p>LiveDesk is a support workspace demo. Some integrations such as email delivery, file attachments and knowledge base search are planned for future releases.</p><div className="info-line"><CheckCircle2 size={15}/> Ticket management</div><div className="info-line"><CheckCircle2 size={15}/> Real-time messaging</div><div className="info-line"><CheckCircle2 size={15}/> Role-based access</div></section></div></div>
}


function CustomerTicketModal({ ticket, messages, onSend, onClose }) {
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const endRef = useRef(null)
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) }, [messages])
  const submit = async (e) => {
    e.preventDefault()
    if (!body.trim() || busy) return
    setBusy(true)
    try { await onSend(ticket.id, body.trim()); setBody('') }
    finally { setBusy(false) }
  }
  return <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}><div className="modal-card customer-thread-modal">
    <div className="modal-header"><div><span className="eyebrow">{ticket.ticketKey} · YOUR SUPPORT REQUEST</span><h2>{ticket.subject}</h2><p><StatusPill status={ticket.status}/> <PriorityPill priority={ticket.priority}/></p></div><button className="icon-button" onClick={onClose}><X size={19}/></button></div>
    <div className="customer-thread-stream">{messages.map((m) => <div key={m.id} className={`customer-thread-message ${m.senderRole === 'CUSTOMER' ? 'customer-own-message' : ''}`}><div className="thread-message-meta"><b>{m.senderRole === 'CUSTOMER' ? 'You' : m.senderName}</b><time>{dateShort(m.createdAt)} · {timeShort(m.createdAt)}</time></div><div>{m.body}</div></div>)}<div ref={endRef}/></div>
    <form className="customer-thread-reply" onSubmit={submit}><textarea rows={2} placeholder="Add a reply to your support request..." value={body} onChange={(e) => setBody(e.target.value)}/><button className="primary-button" disabled={!body.trim() || busy}>{busy ? <span className="spinner"/> : <><Send size={15}/> Send reply</>}</button></form>
  </div></div>
}

function NewTicketModal({ onClose, onCreate }) {
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('GENERAL')
  const [priority, setPriority] = useState('NORMAL')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const submit = async (e) => { e.preventDefault(); setError(''); setBusy(true); try { await onCreate({ subject, description, category, priority }); onClose() } catch (err) { setError(err.message) } finally { setBusy(false) } }
  return <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}><div className="modal-card"><div className="modal-header"><div><span className="eyebrow">NEW CONVERSATION</span><h2>Create a ticket</h2><p>Give your support team the context they need.</p></div><button className="icon-button" onClick={onClose}><X size={19}/></button></div><form onSubmit={submit} className="modal-form"><label>Subject<input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="What can we help you with?" maxLength={180} required/></label><label>Describe your issue<textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Share a few details so we can help faster..." maxLength={5000} required/></label><div className="form-two"><label>Category<select value={category} onChange={(e) => setCategory(e.target.value)}><option value="GENERAL">General</option><option value="BILLING">Billing</option><option value="TECHNICAL">Technical</option><option value="ACCOUNT">Account</option><option value="FEATURE_REQUEST">Feature request</option></select></label><label>Priority<select value={priority} onChange={(e) => setPriority(e.target.value)}><option value="LOW">Low</option><option value="NORMAL">Normal</option><option value="HIGH">High</option><option value="URGENT">Urgent</option></select></label></div>{error && <div className="form-error"><AlertCircle size={15}/>{error}</div>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button" disabled={busy || !subject.trim() || !description.trim()}>{busy ? <span className="spinner"/> : <><Plus size={16}/> Create ticket</>}</button></div></form></div></div>
}

export default function App() {
  const [user, setUser] = useState(() => authStore.getUser())
  const [page, setPage] = useState('overview')
  const [tickets, setTickets] = useState([])
  const [stats, setStats] = useState(null)
  const [agents, setAgents] = useState([])
  const [selected, setSelected] = useState(null)
  const [messages, setMessages] = useState([])
  const [showCreate, setShowCreate] = useState(false)
  const [toast, setToast] = useState('')
  const [loading, setLoading] = useState(false)
  const [mobileNav, setMobileNav] = useState(false)
  const [socketReady, setSocketReady] = useState(false)
  const stompRef = useRef(null)
  const staff = user?.role === 'ADMIN' || user?.role === 'AGENT'

  const notify = useCallback((text) => { setToast(text); window.clearTimeout(notify.timer); notify.timer = window.setTimeout(() => setToast(''), 3200) }, [])

  const loadWorkspace = useCallback(async () => {
    if (!authStore.getToken()) return
    setLoading(true)
    try {
      const [ticketData, statData] = await Promise.all([api('/api/tickets'), api('/api/dashboard/stats')])
      setTickets(ticketData || [])
      setStats(statData)
      if (user?.role !== 'CUSTOMER') {
        const agentData = await api('/api/agents')
        setAgents(agentData || [])
      }
    } catch (error) { notify(error.message) }
    finally { setLoading(false) }
  }, [notify, user?.role])

  useEffect(() => {
    const unauthorized = () => { setUser(null); setSelected(null) }
    window.addEventListener('livedesk:unauthorized', unauthorized)
    return () => window.removeEventListener('livedesk:unauthorized', unauthorized)
  }, [])

  useEffect(() => { if (user) loadWorkspace() }, [user, loadWorkspace])

  useEffect(() => {
    if (!user || !authStore.getToken()) return
    const client = new Client({
      brokerURL: websocketUrl(),
      connectHeaders: { Authorization: `Bearer ${authStore.getToken()}` },
      reconnectDelay: 4000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      onConnect: () => {
        if (user.role !== 'CUSTOMER') {
          client.subscribe('/topic/agents/tickets', (frame) => {
            try {
              const event = JSON.parse(frame.body)
              if (event.ticket) setTickets((prev) => upsertTicket(prev, event.ticket))
              api('/api/dashboard/stats').then(setStats).catch(() => {})
            } catch { /* Ignore malformed broker payloads. */ }
          })
        }
        const subscriptionIds = user.role === 'CUSTOMER' ? tickets.map((ticket) => ticket.id) : (selected?.id ? [selected.id] : [])
        subscriptionIds.forEach((ticketId) => client.subscribe(`/topic/tickets/${ticketId}`, (frame) => handleSocketEvent(frame)))
        setSocketReady(true)
      },
      onWebSocketClose: () => setSocketReady(false),
      onStompError: () => setSocketReady(false),
    })
    function handleSocketEvent(frame) {
      try {
        const event = JSON.parse(frame.body)
        if (event.ticket) setTickets((prev) => upsertTicket(prev, event.ticket))
        if (event.message && selected?.id === event.ticket?.id) setMessages((prev) => prev.some((m) => m.id === event.message.id) ? prev : [...prev, event.message])
        api('/api/dashboard/stats').then(setStats).catch(() => {})
      } catch { /* Ignore malformed broker payloads. */ }
    }
    client.activate()
    stompRef.current = client
    return () => { client.deactivate(); stompRef.current = null; setSocketReady(false) }
  // subscriptions are intentionally refreshed when a customer's ticket set changes
  }, [user?.email, user?.role, tickets.map((t) => t.id).join(','), selected?.id])

  useEffect(() => {
    if (!selected || !user) { setMessages([]); return }
    api(`/api/tickets/${selected.id}/messages`).then(setMessages).catch((error) => notify(error.message))
  }, [selected?.id, user?.email, notify])

  const login = async (email, password) => {
    const result = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
    authStore.save(result)
    setUser(result.user)
    setPage('overview')
    setSelected(null)
  }
  const register = async (name, email, password) => {
    const result = await api('/api/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) })
    authStore.save(result)
    setUser(result.user)
    setPage('overview')
    setSelected(null)
  }
  const logout = () => { stompRef.current?.deactivate(); authStore.clear(); setUser(null); setTickets([]); setStats(null); setAgents([]); setSelected(null); setMessages([]); setPage('overview') }

  const createTicket = async (payload) => {
    const created = await api('/api/tickets', { method: 'POST', body: JSON.stringify(payload) })
    setTickets((prev) => upsertTicket(prev, created))
    setSelected(created)
    setPage(staff ? 'inbox' : 'tickets')
    const nextStats = await api('/api/dashboard/stats')
    setStats(nextStats)
    notify(`${created.ticketKey} created successfully`)
  }
  const updateStatus = async (id, status) => {
    const updated = await api(`/api/tickets/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) })
    setTickets((prev) => upsertTicket(prev, updated))
    setSelected(updated)
    setStats(await api('/api/dashboard/stats'))
    notify('Ticket status updated')
  }
  const updatePriority = async (id, priority) => {
    const updated = await api(`/api/tickets/${id}`, { method: 'PATCH', body: JSON.stringify({ priority }) })
    setTickets((prev) => upsertTicket(prev, updated)); setSelected(updated); notify('Ticket priority updated')
  }
  const assignTicket = async (id, assigneeEmail) => {
    const updated = await api(`/api/tickets/${id}/assign`, { method: 'PATCH', body: JSON.stringify({ assigneeEmail }) })
    setTickets((prev) => upsertTicket(prev, updated)); setSelected(updated); notify('Ticket assigned')
  }
  const sendMessage = async (id, body) => {
    const message = await api(`/api/tickets/${id}/messages`, { method: 'POST', body: JSON.stringify({ body }) })
    setMessages((prev) => prev.some((m) => m.id === message.id) ? prev : [...prev, message])
    setTickets((prev) => prev.map((t) => t.id === id ? { ...t, updatedAt: message.createdAt, messageCount: (t.messageCount || 0) + 1 } : t))
  }
  const openTicket = (ticket) => { setSelected(ticket); setPage(staff ? 'inbox' : 'tickets') }
  const navigate = (next) => { setPage(next); setMobileNav(false) }

  if (!user) return <LoginScreen onLogin={login} onRegister={register}/>

  const navItems = staff ? navStaff : navCustomer
  const pageMeta = { overview: 'Overview', inbox: 'Live inbox', tickets: staff ? 'All tickets' : 'My tickets', customers: 'Customers', analytics: 'Analytics', settings: 'Settings' }

  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
      <div className="sidebar-brand"><span className="brand-mark"><LifeBuoy size={20}/></span><span>livedesk</span><span className="brand-badge">BETA</span><button className="mobile-close icon-button" onClick={() => setMobileNav(false)}><X size={18}/></button></div>
      <div className="workspace-switch"><div className="workspace-avatar">N</div><div><b>Northstar Studio</b><span>Workspace</span></div><ChevronDown size={15}/></div>
      <div className="nav-label">WORKSPACE</div>
      <nav className="side-nav">{navItems.map(({ id, label, icon: Icon, count }) => <button key={id} className={`nav-item ${page === id ? 'active' : ''}`} onClick={() => navigate(id)}><Icon size={18}/><span>{label}</span>{count && <small>{tickets.filter((t) => ['OPEN','IN_PROGRESS'].includes(t.status)).length}</small>}</button>)}</nav>
      {staff && <><div className="nav-label nav-label-spaced">INSIGHTS</div><nav className="side-nav"><button className={`nav-item ${page === 'analytics' ? 'active' : ''}`} onClick={() => navigate('analytics')}><Activity size={18}/><span>Analytics</span></button><button className="nav-item" onClick={() => notify('Knowledge base is coming in the next milestone.')}><BookOpen size={18}/><span>Knowledge base</span><span className="nav-soon">SOON</span></button></nav></>}
      <div className="sidebar-bottom"><div className="help-card"><div className="help-card-icon"><CircleHelp size={17}/></div><b>Need a little help?</b><span>Explore tips to get the most out of LiveDesk.</span><button onClick={() => notify('The getting started guide is coming soon.')}>Explore guide <ArrowRight size={13}/></button></div><button className={`nav-item settings-nav ${page === 'settings' ? 'active' : ''}`} onClick={() => navigate('settings')}><Settings size={18}/><span>Settings</span></button><div className="sidebar-user"><Avatar name={user.name} size="md"/><div><b>{user.name}</b><span>{titleCase(user.role)}</span></div><button className="user-menu" onClick={logout} title="Sign out"><LogOut size={16}/></button></div></div>
    </aside>
    {mobileNav && <button className="mobile-scrim" onClick={() => setMobileNav(false)} aria-label="Close navigation"/>}
    <main className="main-area">
      <header className="topbar"><div className="topbar-left"><button className="mobile-menu icon-button" onClick={() => setMobileNav(true)}><Menu size={20}/></button><div className="breadcrumb">Workspace <ChevronRight size={14}/> <b>{pageMeta[page]}</b></div></div><div className="topbar-right"><div className={`connection-pill ${socketReady ? 'connected' : ''}`}><i/>{socketReady ? 'Live' : 'Connecting'}</div><button className="topbar-icon" onClick={() => notify('You are all caught up.')}><Bell size={18}/><i/></button><div className="topbar-divider"/><button className="topbar-profile" onClick={() => navigate('settings')}><Avatar name={user.name} size="sm"/><ChevronDown size={13}/></button></div></header>
      <div className="page-scroll">{loading && <div className="loading-strip"/>}
        {page === 'overview' && <Dashboard user={user} stats={stats} tickets={tickets} onNavigate={navigate} onOpenTicket={openTicket} onCreate={() => setShowCreate(true)}/>}
        {page === 'tickets' && <TicketsPage tickets={tickets} onOpen={openTicket} onCreate={() => setShowCreate(true)} isStaff={staff}/>}
        {page === 'inbox' && staff && <InboxPage tickets={tickets} selected={selected} setSelected={setSelected} messages={messages} onSend={sendMessage} onStatus={updateStatus} onPriority={updatePriority} agents={agents} onAssign={assignTicket} currentUser={user}/>}
        {page === 'customers' && staff && <CustomersPage tickets={tickets} onOpen={openTicket}/>}
        {page === 'analytics' && staff && <AnalyticsPage stats={stats} tickets={tickets}/>}
        {page === 'settings' && <SettingsPage user={user} onLogout={logout}/>}
      </div>
    </main>
    {showCreate && <NewTicketModal onClose={() => setShowCreate(false)} onCreate={createTicket}/>}
    {selected && !staff && page === 'tickets' && <CustomerTicketModal ticket={selected} messages={messages} onSend={sendMessage} onClose={() => setSelected(null)}/>}
    {toast && <div className="toast"><span><Check size={15}/></span>{toast}<button onClick={() => setToast('')}><X size={15}/></button></div>}
  </div>
}

function websocketUrl() {
  const endpoint = new URL('/ws', apiBase || window.location.origin)
  endpoint.protocol = endpoint.protocol === 'https:' ? 'wss:' : 'ws:'
  return endpoint.toString()
}

function upsertTicket(list, ticket) {
  const exists = list.some((item) => item.id === ticket.id)
  return exists ? list.map((item) => item.id === ticket.id ? { ...item, ...ticket } : item).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)) : [ticket, ...list]
}
