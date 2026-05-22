'use client'

import { useState, useEffect } from 'react'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

let _client: SupabaseClient | null = null

function db(): SupabaseClient {
  if (!_client) {
    _client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return _client
}

type Player = { id: string; name: string; created_at: string }
type Contribution = { id: string; player_id: string; amount: number; note: string | null; created_at: string }
type Session = { id: string; date: string; total_cost: number; created_at: string }
type SessionPlayer = { id: string; session_id: string; player_id: string; cost_share: number }
type Match = {
  id: string
  session_id: string | null
  team1_player_ids: string[]
  team2_player_ids: string[]
  amount: number
  winner: 'team1' | 'team2'
  created_at: string
}

function fmt(n: number) {
  return new Intl.NumberFormat('vi-VN').format(Math.round(n)) + 'đ'
}

function fmtDate(s: string) {
  const d = new Date(s.length === 10 ? s + 'T00:00:00' : s)
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function getBalance(
  pid: string,
  contributions: Contribution[],
  sessionPlayers: SessionPlayer[],
  matches: Match[]
) {
  const totalIn = contributions
    .filter(c => c.player_id === pid)
    .reduce((s, c) => s + Number(c.amount), 0)
  const totalSessionOut = sessionPlayers
    .filter(sp => sp.player_id === pid)
    .reduce((s, sp) => s + Number(sp.cost_share), 0)
  const totalMatchOut = matches.reduce((s, m) => {
    const losing = m.winner === 'team1' ? m.team2_player_ids : m.team1_player_ids
    return losing.includes(pid) ? s + Number(m.amount) / losing.length : s
  }, 0)
  return totalIn - totalSessionOut - totalMatchOut
}

function toggleItem<T>(arr: T[], id: T): T[] {
  return arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id]
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[92vh] overflow-y-auto">
        <div className="flex justify-between items-center px-5 py-4 border-b sticky top-0 bg-white rounded-t-2xl">
          <h3 className="text-base font-semibold text-gray-800">{title}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            ✕
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  )
}

function FieldInput({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-600 mb-1.5">{label}</label>
      <input
        {...props}
        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent bg-gray-50"
      />
    </div>
  )
}

export default function Home() {
  const [tab, setTab] = useState<'players' | 'sessions' | 'matches' | 'stats'>('players')
  const [players, setPlayers] = useState<Player[]>([])
  const [contributions, setContributions] = useState<Contribution[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [sessionPlayers, setSessionPlayers] = useState<SessionPlayer[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)

  // Modal state
  const [showAddPlayer, setShowAddPlayer] = useState(false)
  const [contribTarget, setContribTarget] = useState<Player | null>(null)
  const [showSession, setShowSession] = useState(false)
  const [showMatch, setShowMatch] = useState(false)

  // Add player form
  const [newName, setNewName] = useState('')

  // Contribution form
  const [contribAmount, setContribAmount] = useState('')
  const [contribNote, setContribNote] = useState('')

  // Session form
  const [sessDate, setSessDate] = useState(new Date().toISOString().slice(0, 10))
  const [sessCost, setSessCost] = useState('')
  const [sessPlayerIds, setSessPlayerIds] = useState<string[]>([])

  // Edit session
  const [editSession, setEditSession] = useState<Session | null>(null)
  const [editSessCost, setEditSessCost] = useState('')

  // Stats filter
  const [statsFrom, setStatsFrom] = useState('')
  const [statsTo, setStatsTo] = useState('')
  // Selected session IDs for stats (empty = all)
  const [statsSessIds, setStatsSessIds] = useState<string[]>([])

  // Match form
  const [matchTeam1, setMatchTeam1] = useState<string[]>([])
  const [matchTeam2, setMatchTeam2] = useState<string[]>([])
  const [matchAmount, setMatchAmount] = useState('50000')
  const [matchWinner, setMatchWinner] = useState<'team1' | 'team2'>('team1')
  const [matchSessId, setMatchSessId] = useState('')

  const [rev, setRev] = useState(0)
  function refresh() { setRev(r => r + 1) }

  useEffect(() => {
    async function fetchAll() {
      try {
        const [p, c, s, sp, m] = await Promise.all([
          db().from('players').select('*').order('name'),
          db().from('fund_contributions').select('*').order('created_at', { ascending: false }),
          db().from('sessions').select('*').order('date', { ascending: false }),
          db().from('session_players').select('*'),
          db().from('matches').select('*').order('created_at', { ascending: false }),
        ])
        setErr(p.error ? 'Lỗi kết nối: ' + p.error.message : '')
        setPlayers(p.data ?? [])
        setContributions(c.data ?? [])
        setSessions(s.data ?? [])
        setSessionPlayers(sp.data ?? [])
        setMatches(m.data ?? [])
      } finally {
        setLoading(false)
      }
    }
    void fetchAll()
  }, [rev])

  function playerName(id: string) {
    return players.find(p => p.id === id)?.name ?? '?'
  }

  async function handleAddPlayer(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!newName.trim()) return
    setSaving(true)
    const { error } = await db().from('players').insert({ name: newName.trim() })
    setSaving(false)
    if (error) { setErr(error.message); return }
    setNewName('')
    setShowAddPlayer(false)
    refresh()
  }

  async function handleContrib(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!contribTarget || !contribAmount || Number(contribAmount) <= 0) return
    setSaving(true)
    const { error } = await db().from('fund_contributions').insert({
      player_id: contribTarget.id,
      amount: Number(contribAmount),
      note: contribNote.trim() || null,
    })
    setSaving(false)
    if (error) { setErr(error.message); return }
    setContribAmount('')
    setContribNote('')
    setContribTarget(null)
    refresh()
  }

  async function handleSession(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!sessDate || !sessCost || sessPlayerIds.length === 0) return
    setSaving(true)
    const costShare = Number(sessCost) / sessPlayerIds.length
    const { data: sess, error: e1 } = await db()
      .from('sessions')
      .insert({ date: sessDate, total_cost: Number(sessCost) })
      .select()
      .single()
    if (e1 || !sess) { setErr(e1?.message ?? 'Lỗi tạo buổi'); setSaving(false); return }
    const { error: e2 } = await db().from('session_players').insert(
      sessPlayerIds.map(pid => ({ session_id: sess.id, player_id: pid, cost_share: costShare }))
    )
    setSaving(false)
    if (e2) { setErr(e2.message); return }
    setSessDate(new Date().toISOString().slice(0, 10))
    setSessCost('')
    setSessPlayerIds([])
    setShowSession(false)
    refresh()
  }

  async function handleMatch(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault()
    if (matchTeam1.length === 0 || matchTeam2.length === 0 || !matchAmount || Number(matchAmount) <= 0) return
    setSaving(true)
    const { error } = await db().from('matches').insert({
      session_id: matchSessId || null,
      team1_player_ids: matchTeam1,
      team2_player_ids: matchTeam2,
      amount: Number(matchAmount),
      winner: matchWinner,
    })
    setSaving(false)
    if (error) { setErr(error.message); return }
    setMatchTeam1([])
    setMatchTeam2([])
    setMatchAmount('50000')
    setMatchWinner('team1')
    setMatchSessId('')
    setShowMatch(false)
    refresh()
  }

  async function handleDeleteMatch(id: string) {
    if (!confirm('Xóa trận đấu này? Số dư quỹ của người chơi sẽ được hoàn lại.')) return
    const { error } = await db().from('matches').delete().eq('id', id)
    if (error) { setErr(error.message); return }
    refresh()
  }

  async function handleUpdateSession(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!editSession || !editSessCost || Number(editSessCost) <= 0) return
    setSaving(true)
    const newCost = Number(editSessCost)
    const sp = sessionPlayers.filter(s => s.session_id === editSession.id)
    const newShare = sp.length > 0 ? newCost / sp.length : 0
    const { error: e1 } = await db()
      .from('sessions')
      .update({ total_cost: newCost })
      .eq('id', editSession.id)
    if (e1) { setErr(e1.message); setSaving(false); return }
    if (sp.length > 0) {
      const { error: e2 } = await db()
        .from('session_players')
        .update({ cost_share: newShare })
        .eq('session_id', editSession.id)
      if (e2) { setErr(e2.message); setSaving(false); return }
    }
    setSaving(false)
    setEditSession(null)
    setEditSessCost('')
    refresh()
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="bg-white rounded-2xl p-8 shadow text-center max-w-sm">
          <div className="text-4xl mb-3">⚙️</div>
          <h2 className="font-bold text-gray-800 mb-2">Chưa cấu hình Supabase</h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            Tạo file <code className="bg-gray-100 px-1 rounded">.env.local</code> với{' '}
            <code className="bg-gray-100 px-1 rounded">NEXT_PUBLIC_SUPABASE_URL</code> và{' '}
            <code className="bg-gray-100 px-1 rounded">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>
          </p>
        </div>
      </div>
    )
  }

  const tabs = [
    { key: 'players' as const, label: 'Người chơi', icon: '👥' },
    { key: 'sessions' as const, label: 'Buổi chơi', icon: '📅' },
    { key: 'matches' as const, label: 'Trận đấu', icon: '🏆' },
    { key: 'stats' as const, label: 'Thống kê', icon: '📊' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-2.5">
          <span className="text-2xl">🏸</span>
          <div>
            <h1 className="text-lg font-bold text-indigo-700 leading-tight">Quỹ Pickleball</h1>
            <p className="text-xs text-gray-400">Quản lý tiền quỹ &amp; kết quả</p>
          </div>
        </div>
      </header>

      {/* Tab bar */}
      <div className="max-w-2xl mx-auto px-4 pt-4">
        <div className="flex bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-3 text-xs font-medium transition-colors flex flex-col items-center gap-0.5 ${
                tab === t.key
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <span className="text-base">{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Error banner */}
        {err && (
          <div className="mt-3 bg-red-50 text-red-700 px-4 py-2.5 rounded-xl text-sm flex justify-between items-center">
            <span>{err}</span>
            <button onClick={() => setErr('')} className="ml-2 text-red-400 hover:text-red-600">✕</button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="text-gray-400 text-sm animate-pulse">Đang tải dữ liệu...</div>
          </div>
        )}

        {/* ─── PLAYERS TAB ─── */}
        {!loading && tab === 'players' && (
          <div className="mt-4 pb-10 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-gray-600">
                {players.length} người chơi
              </span>
              <button
                onClick={() => { setNewName(''); setShowAddPlayer(true) }}
                className="bg-indigo-600 text-white text-xs font-medium px-3 py-2 rounded-xl hover:bg-indigo-700 active:scale-95 transition-all"
              >
                + Thêm người chơi
              </button>
            </div>

            {players.length === 0 ? (
              <div className="bg-white rounded-2xl p-10 text-center text-gray-400 shadow-sm">
                <div className="text-4xl mb-2">👤</div>
                <p className="text-sm">Chưa có người chơi. Thêm ngay!</p>
              </div>
            ) : (
              players.map(player => {
                const balance = getBalance(player.id, contributions, sessionPlayers, matches)
                const totalIn = contributions
                  .filter(c => c.player_id === player.id)
                  .reduce((s, c) => s + Number(c.amount), 0)
                const sessOut = sessionPlayers
                  .filter(sp => sp.player_id === player.id)
                  .reduce((s, sp) => s + Number(sp.cost_share), 0)
                const matchOut = matches.reduce((s, m) => {
                  const losing = m.winner === 'team1' ? m.team2_player_ids : m.team1_player_ids
                  return losing.includes(player.id) ? s + Number(m.amount) / losing.length : s
                }, 0)
                const recentContribs = contributions.filter(c => c.player_id === player.id).slice(0, 3)
                return (
                  <div key={player.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4 flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 truncate">{player.name}</p>
                        <div className="flex gap-3 mt-1 text-xs text-gray-400 flex-wrap">
                          <span>Nạp: <span className="text-emerald-600 font-medium">{fmt(totalIn)}</span></span>
                          <span>Sân: <span className="text-amber-600 font-medium">{fmt(sessOut)}</span></span>
                          <span>Thua: <span className="text-red-500 font-medium">{fmt(matchOut)}</span></span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className={`text-right ${balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          <p className="text-xs font-medium text-gray-400">Số dư</p>
                          <p className="text-base font-bold">
                            {balance >= 0 ? '+' : ''}{fmt(balance)}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setContribTarget(player)
                            setContribAmount('')
                            setContribNote('')
                          }}
                          className="bg-emerald-500 text-white text-xs px-2.5 py-1.5 rounded-xl hover:bg-emerald-600 active:scale-95 transition-all whitespace-nowrap"
                        >
                          💰 Nạp quỹ
                        </button>
                      </div>
                    </div>
                    {recentContribs.length > 0 && (
                      <div className="border-t border-gray-50 px-4 py-2 space-y-1 bg-gray-50/50">
                        {recentContribs.map(c => (
                          <div key={c.id} className="flex justify-between text-xs text-gray-500">
                            <span>{c.note ?? 'Nạp quỹ'} · {fmtDate(c.created_at)}</span>
                            <span className="text-emerald-600 font-medium">+{fmt(c.amount)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* ─── SESSIONS TAB ─── */}
        {!loading && tab === 'sessions' && (
          <div className="mt-4 pb-10 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-gray-600">
                {sessions.length} buổi chơi
              </span>
              <button
                onClick={() => {
                  setSessDate(new Date().toISOString().slice(0, 10))
                  setSessCost('')
                  setSessPlayerIds([])
                  setShowSession(true)
                }}
                className="bg-indigo-600 text-white text-xs font-medium px-3 py-2 rounded-xl hover:bg-indigo-700 active:scale-95 transition-all"
              >
                + Tạo buổi mới
              </button>
            </div>

            {sessions.length === 0 ? (
              <div className="bg-white rounded-2xl p-10 text-center text-gray-400 shadow-sm">
                <div className="text-4xl mb-2">📅</div>
                <p className="text-sm">Chưa có buổi chơi nào.</p>
              </div>
            ) : (
              sessions.map(sess => {
                const sp = sessionPlayers.filter(s => s.session_id === sess.id)
                const costShare = sp[0]?.cost_share ?? 0
                return (
                  <div key={sess.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800">📅 {fmtDate(sess.date)}</p>
                        <p className="text-xs text-gray-400 mt-1">{sp.length} người tham dự</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {sp.map(s => (
                            <span
                              key={s.id}
                              className="bg-indigo-50 text-indigo-700 text-xs px-2 py-0.5 rounded-full"
                            >
                              {playerName(s.player_id)}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-3 flex flex-col items-end gap-1">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-amber-600">{fmt(sess.total_cost)}</p>
                          <button
                            onClick={() => { setEditSession(sess); setEditSessCost(String(sess.total_cost)) }}
                            className="text-gray-300 hover:text-indigo-500 transition-colors text-sm leading-none"
                            title="Sửa chi phí"
                          >
                            ✏️
                          </button>
                        </div>
                        {sp.length > 0 && (
                          <p className="text-xs text-gray-400">
                            {fmt(costShare)}/người
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* ─── MATCHES TAB ─── */}
        {!loading && tab === 'matches' && (
          <div className="mt-4 pb-10 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-gray-600">
                {matches.length} trận đấu
              </span>
              <button
                onClick={() => {
                  setMatchTeam1([])
                  setMatchTeam2([])
                  setMatchAmount('50000')
                  setMatchWinner('team1')
                  setMatchSessId('')
                  setShowMatch(true)
                }}
                className="bg-indigo-600 text-white text-xs font-medium px-3 py-2 rounded-xl hover:bg-indigo-700 active:scale-95 transition-all"
              >
                + Thêm trận
              </button>
            </div>

            {matches.length === 0 ? (
              <div className="bg-white rounded-2xl p-10 text-center text-gray-400 shadow-sm">
                <div className="text-4xl mb-2">🏆</div>
                <p className="text-sm">Chưa có trận đấu nào.</p>
              </div>
            ) : (
              matches.map(match => {
                const losing = match.winner === 'team1' ? match.team2_player_ids : match.team1_player_ids
                const perPlayer = Number(match.amount) / losing.length
                const sessInfo = sessions.find(s => s.id === match.session_id)
                return (
                  <div key={match.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                    <div className="flex justify-between items-center mb-3">
                      <p className="text-xs text-gray-400">
                        {sessInfo ? fmtDate(sessInfo.date) : fmtDate(match.created_at)}
                      </p>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-amber-600">{fmt(match.amount)}</p>
                        <button
                          onClick={() => handleDeleteMatch(match.id)}
                          className="text-gray-300 hover:text-red-500 transition-colors text-base leading-none"
                          title="Xóa trận đấu"
                        >
                          🗑
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className={`rounded-xl p-3 ${match.winner === 'team1' ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
                        <p className="text-xs font-semibold mb-1.5">
                          {match.winner === 'team1' ? '🏆 Đội 1 (Thắng)' : '❌ Đội 1 (Thua)'}
                        </p>
                        {match.team1_player_ids.map(id => (
                          <p key={id} className="text-xs text-gray-700">{playerName(id)}</p>
                        ))}
                      </div>
                      <div className={`rounded-xl p-3 ${match.winner === 'team2' ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
                        <p className="text-xs font-semibold mb-1.5">
                          {match.winner === 'team2' ? '🏆 Đội 2 (Thắng)' : '❌ Đội 2 (Thua)'}
                        </p>
                        {match.team2_player_ids.map(id => (
                          <p key={id} className="text-xs text-gray-700">{playerName(id)}</p>
                        ))}
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      Mỗi người đội thua đóng:{' '}
                      <span className="text-red-600 font-semibold">{fmt(perPlayer)}</span>
                    </p>
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* ─── STATS TAB ─── */}
        {!loading && tab === 'stats' && (() => {
          const hasFilter = statsSessIds.length > 0 || statsFrom || statsTo

          const filteredMatches = matches.filter(m => {
            const sessDate = sessions.find(s => s.id === m.session_id)?.date
            const dateStr = sessDate ?? m.created_at.slice(0, 10)
            if (statsSessIds.length > 0 && m.session_id && !statsSessIds.includes(m.session_id)) return false
            if (statsFrom && dateStr < statsFrom) return false
            if (statsTo && dateStr > statsTo) return false
            return true
          })

          const stats = players
            .map(p => {
              const wins = filteredMatches.filter(m =>
                (m.winner === 'team1' ? m.team1_player_ids : m.team2_player_ids).includes(p.id)
              ).length
              const losses = filteredMatches.filter(m =>
                (m.winner === 'team1' ? m.team2_player_ids : m.team1_player_ids).includes(p.id)
              ).length
              return { p, wins, losses, total: wins + losses }
            })
            .filter(s => s.total > 0)
            .sort((a, b) => b.wins - a.wins || a.losses - b.losses)

          const medals = ['🥇', '🥈', '🥉']

          return (
            <div className="mt-4 pb-10 space-y-3">
              {/* Session selector */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
                <p className="text-sm font-semibold text-gray-700">Chọn ngày thống kê</p>

                {/* Date range */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Từ ngày</label>
                    <input
                      type="date"
                      value={statsFrom}
                      onChange={e => setStatsFrom(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Đến ngày</label>
                    <input
                      type="date"
                      value={statsTo}
                      onChange={e => setStatsTo(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  </div>
                </div>

                {/* Session checkboxes */}
                {sessions.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs text-gray-500">Hoặc chọn buổi cụ thể</label>
                      <button
                        onClick={() => setStatsSessIds([])}
                        className="text-xs text-indigo-600 hover:text-indigo-800"
                      >
                        Bỏ chọn tất cả
                      </button>
                    </div>
                    <div className="border border-gray-200 rounded-xl max-h-40 overflow-y-auto divide-y divide-gray-50">
                      {sessions.map(s => (
                        <label key={s.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors">
                          <input
                            type="checkbox"
                            checked={statsSessIds.includes(s.id)}
                            onChange={() => setStatsSessIds(toggleItem(statsSessIds, s.id))}
                            className="w-4 h-4 rounded accent-indigo-600"
                          />
                          <span className="text-sm text-gray-700 flex-1">{fmtDate(s.date)}</span>
                          <span className="text-xs text-gray-400">{sessionPlayers.filter(sp => sp.session_id === s.id).length} người</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {hasFilter && (
                  <button
                    onClick={() => { setStatsFrom(''); setStatsTo(''); setStatsSessIds([]) }}
                    className="w-full py-1.5 text-xs text-red-500 hover:text-red-700 border border-red-200 rounded-xl hover:bg-red-50 transition-colors"
                  >
                    Xóa bộ lọc → xem tất cả {matches.length} trận
                  </button>
                )}
              </div>

              {/* Summary */}
              <div className="bg-indigo-50 border border-indigo-100 rounded-2xl px-4 py-3 flex gap-4 text-sm">
                <div className="text-center flex-1">
                  <p className="text-2xl font-bold text-indigo-700">{filteredMatches.length}</p>
                  <p className="text-xs text-indigo-500 mt-0.5">Trận đấu</p>
                </div>
                <div className="w-px bg-indigo-200" />
                <div className="text-center flex-1">
                  <p className="text-2xl font-bold text-indigo-700">{stats.length}</p>
                  <p className="text-xs text-indigo-500 mt-0.5">Người chơi</p>
                </div>
                <div className="w-px bg-indigo-200" />
                <div className="text-center flex-1">
                  <p className="text-2xl font-bold text-indigo-700">
                    {hasFilter ? (statsSessIds.length > 0 ? statsSessIds.length : '—') : sessions.length}
                  </p>
                  <p className="text-xs text-indigo-500 mt-0.5">Buổi chơi</p>
                </div>
              </div>

              {/* No data */}
              {filteredMatches.length === 0 && (
                <div className="bg-white rounded-2xl p-10 text-center text-gray-400 shadow-sm">
                  <div className="text-4xl mb-2">📊</div>
                  <p className="text-sm">Không có trận đấu nào trong khoảng thời gian này.</p>
                </div>
              )}

              {/* Podium top 3 */}
              {stats.length >= 2 && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                  <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">Bảng xếp hạng</p>
                  <div className="space-y-2">
                    {stats.slice(0, 3).map((s, i) => {
                      const rate = s.total > 0 ? Math.round((s.wins / s.total) * 100) : 0
                      return (
                        <div key={s.p.id} className={`flex items-center gap-3 p-3 rounded-xl ${i === 0 ? 'bg-amber-50 border border-amber-200' : i === 1 ? 'bg-gray-50 border border-gray-200' : 'bg-orange-50 border border-orange-200'}`}>
                          <span className="text-2xl">{medals[i]}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-800 truncate">{s.p.name}</p>
                            <div className="flex gap-3 mt-0.5 text-xs">
                              <span className="text-emerald-600 font-medium">🏆 {s.wins} thắng</span>
                              <span className="text-red-500 font-medium">❌ {s.losses} thua</span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className={`text-lg font-bold ${rate >= 50 ? 'text-emerald-600' : 'text-red-500'}`}>{rate}%</p>
                            <p className="text-xs text-gray-400">{s.total} trận</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Full table */}
              {stats.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="grid grid-cols-5 px-4 py-2.5 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <div className="col-span-2">Người chơi</div>
                    <div className="text-center">Thắng</div>
                    <div className="text-center">Thua</div>
                    <div className="text-center">Tỉ lệ</div>
                  </div>
                  {stats.map((s, i) => {
                    const rate = s.total > 0 ? Math.round((s.wins / s.total) * 100) : 0
                    return (
                      <div key={s.p.id} className={`grid grid-cols-5 px-4 py-3 items-center text-sm ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} border-b border-gray-50 last:border-0`}>
                        <div className="col-span-2 flex items-center gap-2 min-w-0">
                          <span className="text-sm">{i < 3 ? medals[i] : `${i + 1}.`}</span>
                          <span className="font-medium text-gray-800 truncate">{s.p.name}</span>
                        </div>
                        <div className="text-center font-semibold text-emerald-600">{s.wins}</div>
                        <div className="text-center font-semibold text-red-500">{s.losses}</div>
                        <div className={`text-center font-bold ${rate >= 50 ? 'text-emerald-600' : 'text-red-500'}`}>{rate}%</div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })()}
      </div>

      {/* ─── MODAL: Thêm người chơi ─── */}
      {showAddPlayer && (
        <Modal title="Thêm người chơi" onClose={() => setShowAddPlayer(false)}>
          <form onSubmit={handleAddPlayer} className="space-y-4">
            <FieldInput
              label="Tên người chơi"
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Nhập tên..."
              autoFocus
              required
            />
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAddPlayer(false)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={saving || !newName.trim()}
                className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Đang lưu...' : 'Thêm'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ─── MODAL: Nạp quỹ ─── */}
      {contribTarget && (
        <Modal title={`Nạp quỹ cho ${contribTarget.name}`} onClose={() => setContribTarget(null)}>
          <form onSubmit={handleContrib} className="space-y-4">
            <FieldInput
              label="Số tiền (đồng)"
              type="number"
              value={contribAmount}
              onChange={e => setContribAmount(e.target.value)}
              placeholder="100000"
              min="1"
              autoFocus
              required
            />
            <FieldInput
              label="Ghi chú (tùy chọn)"
              type="text"
              value={contribNote}
              onChange={e => setContribNote(e.target.value)}
              placeholder="Nạp tiền tháng 5..."
            />
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setContribTarget(null)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={saving || !contribAmount || Number(contribAmount) <= 0}
                className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Đang lưu...' : '💰 Nạp quỹ'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ─── MODAL: Tạo buổi chơi ─── */}
      {showSession && (
        <Modal title="Tạo buổi chơi mới" onClose={() => setShowSession(false)}>
          <form onSubmit={handleSession} className="space-y-4">
            <FieldInput
              label="Ngày chơi"
              type="date"
              value={sessDate}
              onChange={e => setSessDate(e.target.value)}
              required
            />
            <FieldInput
              label="Tổng chi phí (đồng)"
              type="number"
              value={sessCost}
              onChange={e => setSessCost(e.target.value)}
              placeholder="500000"
              min="0"
              required
            />
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">
                Người tham dự ({sessPlayerIds.length} đã chọn)
              </label>
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                {players.length === 0 ? (
                  <p className="text-sm text-gray-400 p-3">Chưa có người chơi nào.</p>
                ) : (
                  <div className="max-h-44 overflow-y-auto divide-y divide-gray-50">
                    {players.map(p => (
                      <label
                        key={p.id}
                        className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={sessPlayerIds.includes(p.id)}
                          onChange={() => setSessPlayerIds(toggleItem(sessPlayerIds, p.id))}
                          className="w-4 h-4 rounded accent-indigo-600"
                        />
                        <span className="text-sm text-gray-700">{p.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              {sessPlayerIds.length > 0 && sessCost && Number(sessCost) > 0 && (
                <p className="mt-1.5 text-xs text-indigo-600 font-medium">
                  Chi phí mỗi người: {fmt(Number(sessCost) / sessPlayerIds.length)}
                </p>
              )}
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowSession(false)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={saving || sessPlayerIds.length === 0 || !sessCost || Number(sessCost) <= 0}
                className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Đang lưu...' : '📅 Tạo buổi'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ─── MODAL: Ghi kết quả trận ─── */}
      {showMatch && (
        <Modal title="Ghi kết quả trận đấu" onClose={() => setShowMatch(false)}>
          <form onSubmit={handleMatch} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">
                Buổi chơi (tùy chọn)
              </label>
              <select
                value={matchSessId}
                onChange={e => setMatchSessId(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-50"
              >
                <option value="">-- Không chọn --</option>
                {sessions.map(s => (
                  <option key={s.id} value={s.id}>{fmtDate(s.date)}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-sm font-semibold text-blue-600 mb-1.5">🔵 Đội 1</p>
                <div className="border-2 border-blue-100 rounded-xl overflow-hidden">
                  <div className="max-h-40 overflow-y-auto divide-y divide-blue-50">
                    {players.map(p => {
                      const inTeam2 = matchTeam2.includes(p.id)
                      return (
                        <label
                          key={p.id}
                          className={`flex items-center gap-2 px-2.5 py-2 text-xs transition-colors ${
                            inTeam2
                              ? 'opacity-30 cursor-not-allowed bg-gray-50'
                              : 'cursor-pointer hover:bg-blue-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={matchTeam1.includes(p.id)}
                            disabled={inTeam2}
                            onChange={() => !inTeam2 && setMatchTeam1(toggleItem(matchTeam1, p.id))}
                            className="w-3.5 h-3.5 rounded accent-blue-600"
                          />
                          <span className="truncate">{p.name}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>
                <p className="text-xs text-blue-500 mt-1">{matchTeam1.length} người</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-red-500 mb-1.5">🔴 Đội 2</p>
                <div className="border-2 border-red-100 rounded-xl overflow-hidden">
                  <div className="max-h-40 overflow-y-auto divide-y divide-red-50">
                    {players.map(p => {
                      const inTeam1 = matchTeam1.includes(p.id)
                      return (
                        <label
                          key={p.id}
                          className={`flex items-center gap-2 px-2.5 py-2 text-xs transition-colors ${
                            inTeam1
                              ? 'opacity-30 cursor-not-allowed bg-gray-50'
                              : 'cursor-pointer hover:bg-red-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={matchTeam2.includes(p.id)}
                            disabled={inTeam1}
                            onChange={() => !inTeam1 && setMatchTeam2(toggleItem(matchTeam2, p.id))}
                            className="w-3.5 h-3.5 rounded accent-red-500"
                          />
                          <span className="truncate">{p.name}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>
                <p className="text-xs text-red-400 mt-1">{matchTeam2.length} người</p>
              </div>
            </div>

            <FieldInput
              label="Số tiền trận (đội thua đóng vào quỹ)"
              type="number"
              value={matchAmount}
              onChange={e => setMatchAmount(e.target.value)}
              placeholder="50000"
              min="0"
              required
            />

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">Đội thắng</label>
              <div className="grid grid-cols-2 gap-2">
                {(['team1', 'team2'] as const).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setMatchWinner(t)}
                    className={`py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${
                      matchWinner === t
                        ? t === 'team1'
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-red-500 text-white border-red-500'
                        : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    {t === 'team1' ? '🔵 Đội 1 thắng' : '🔴 Đội 2 thắng'}
                  </button>
                ))}
              </div>
              {matchAmount && Number(matchAmount) > 0 && (matchWinner === 'team1' ? matchTeam2 : matchTeam1).length > 0 && (
                <p className="mt-1.5 text-xs text-red-500 font-medium">
                  Mỗi người đội thua đóng:{' '}
                  {fmt(Number(matchAmount) / (matchWinner === 'team1' ? matchTeam2 : matchTeam1).length)}
                </p>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowMatch(false)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={
                  saving ||
                  matchTeam1.length === 0 ||
                  matchTeam2.length === 0 ||
                  !matchAmount ||
                  Number(matchAmount) <= 0
                }
                className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Đang lưu...' : '🏆 Lưu kết quả'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ─── MODAL: Sửa chi phí buổi chơi ─── */}
      {editSession && (
        <Modal title={`Sửa chi phí buổi ${fmtDate(editSession.date)}`} onClose={() => setEditSession(null)}>
          <form onSubmit={handleUpdateSession} className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-600">
              <p>Số người tham dự: <span className="font-semibold text-gray-800">{sessionPlayers.filter(s => s.session_id === editSession.id).length} người</span></p>
              {editSessCost && Number(editSessCost) > 0 && sessionPlayers.filter(s => s.session_id === editSession.id).length > 0 && (
                <p className="mt-1">Chi phí mới mỗi người: <span className="font-semibold text-indigo-600">{fmt(Number(editSessCost) / sessionPlayers.filter(s => s.session_id === editSession.id).length)}</span></p>
              )}
            </div>
            <FieldInput
              label="Tổng chi phí mới (đồng)"
              type="number"
              value={editSessCost}
              onChange={e => setEditSessCost(e.target.value)}
              min="0"
              autoFocus
              required
            />
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setEditSession(null)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={saving || !editSessCost || Number(editSessCost) <= 0}
                className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Đang lưu...' : '💾 Lưu'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
