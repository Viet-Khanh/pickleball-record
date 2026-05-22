'use client'

import { useState, useEffect } from 'react'
import { db } from '@/lib/supabase'
import type { Player, Contribution, Session, SessionPlayer, Match } from '@/lib/types'
import { toggleItem, fmt, fmtDate, balancedSplit } from '@/lib/utils'
import { Modal } from '@/components/Modal'
import { FieldInput } from '@/components/FieldInput'
import { PlayersTab } from '@/components/PlayersTab'
import { SessionsTab } from '@/components/SessionsTab'
import { MatchesTab } from '@/components/MatchesTab'
import { StatsTab } from '@/components/StatsTab'

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

  // Auth
  const [isAdmin, setIsAdmin] = useState(() =>
    typeof window !== 'undefined' && sessionStorage.getItem('pickleball_admin') === '1'
  )
  const [showLogin, setShowLogin] = useState(false)
  const [loginPwd, setLoginPwd] = useState('')
  const [loginErr, setLoginErr] = useState('')

  // Modal state
  const [showAddPlayer, setShowAddPlayer] = useState(false)
  const [contribTarget, setContribTarget] = useState<Player | null>(null)
  const [showSession, setShowSession] = useState(false)
  const [showMatch, setShowMatch] = useState(false)
  const [editSession, setEditSession] = useState<Session | null>(null)

  // Add player form
  const [newName, setNewName] = useState('')

  // Contribution form
  const [contribAmount, setContribAmount] = useState('')
  const [contribNote, setContribNote] = useState('')

  // Session form
  const [sessDate, setSessDate] = useState(new Date().toISOString().slice(0, 10))
  const [sessCost, setSessCost] = useState('')
  const [sessPlayerIds, setSessPlayerIds] = useState<string[]>([])

  // Edit session form
  const [editSessCost, setEditSessCost] = useState('')

  // Stats filter
  const [statsFrom, setStatsFrom] = useState('')
  const [statsTo, setStatsTo] = useState('')
  const [statsSessIds, setStatsSessIds] = useState<string[]>([])

  // Match form
  const [matchMode, setMatchMode] = useState<'manual' | 'auto'>('manual')
  const [matchTeam1, setMatchTeam1] = useState<string[]>([])
  const [matchTeam2, setMatchTeam2] = useState<string[]>([])
  const [matchAmount, setMatchAmount] = useState('50000')
  const [matchWinAmount, setMatchWinAmount] = useState('50000')
  const [matchWinner, setMatchWinner] = useState<'team1' | 'team2'>('team1')
  const [matchSessId, setMatchSessId] = useState('')
  const [autoPlayers, setAutoPlayers] = useState<string[]>([])
  const [autoSplit, setAutoSplit] = useState<[string[], string[]] | null>(null)

  const [rev, setRev] = useState(0)
  function refresh() { setRev(r => r + 1) }

  function handleLogin(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault()
    if (loginPwd === process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
      sessionStorage.setItem('pickleball_admin', '1')
      setIsAdmin(true)
      setShowLogin(false)
      setLoginPwd('')
      setLoginErr('')
    } else {
      setLoginErr('Sai mật khẩu')
    }
  }

  function handleLogout() {
    sessionStorage.removeItem('pickleball_admin')
    setIsAdmin(false)
  }

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
      win_amount: Number(matchWinAmount),
      winner: matchWinner,
    })
    setSaving(false)
    if (error) { setErr(error.message); return }
    setMatchMode('manual')
    setMatchTeam1([])
    setMatchTeam2([])
    setAutoPlayers([])
    setAutoSplit(null)
    setMatchAmount('50000')
    setMatchWinAmount('50000')
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

  function openMatchModal() {
    const today = new Date().toISOString().slice(0, 10)
    const defaultSess = sessions.find(s => s.date === today) ?? sessions[0]
    setMatchMode('manual')
    setMatchTeam1([])
    setMatchTeam2([])
    setAutoPlayers([])
    setAutoSplit(null)
    setMatchAmount('50000')
    setMatchWinAmount('50000')
    setMatchWinner('team1')
    setMatchSessId(defaultSess?.id ?? '')
    setShowMatch(true)
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
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-2.5">
          <span className="text-2xl">🏸</span>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-indigo-700 leading-tight">Quỹ Pickleball</h1>
            <p className="text-xs text-gray-400">Quản lý tiền quỹ &amp; kết quả</p>
          </div>
          {isAdmin ? (
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs text-gray-500 border border-gray-200 px-2.5 py-1.5 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <span className="text-amber-500">👑</span> Admin
            </button>
          ) : (
            <button
              onClick={() => { setLoginPwd(''); setLoginErr(''); setShowLogin(true) }}
              className="text-xs text-gray-400 border border-gray-200 px-2.5 py-1.5 rounded-xl hover:bg-gray-50 transition-colors"
            >
              🔐 Login
            </button>
          )}
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 pt-4">
        <div className="flex bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-3 text-xs font-medium transition-colors flex flex-col items-center gap-0.5 ${
                tab === t.key ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <span className="text-base">{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {err && (
          <div className="mt-3 bg-red-50 text-red-700 px-4 py-2.5 rounded-xl text-sm flex justify-between items-center">
            <span>{err}</span>
            <button onClick={() => setErr('')} className="ml-2 text-red-400 hover:text-red-600">✕</button>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="text-gray-400 text-sm animate-pulse">Đang tải dữ liệu...</div>
          </div>
        )}

        {!loading && tab === 'players' && (
          <PlayersTab
            players={players}
            contributions={contributions}
            sessionPlayers={sessionPlayers}
            matches={matches}
            isAdmin={isAdmin}
            onAddPlayer={() => { setNewName(''); setShowAddPlayer(true) }}
            onContrib={player => { setContribTarget(player); setContribAmount(''); setContribNote('') }}
          />
        )}

        {!loading && tab === 'sessions' && (
          <SessionsTab
            sessions={sessions}
            sessionPlayers={sessionPlayers}
            players={players}
            isAdmin={isAdmin}
            onNewSession={() => {
              setSessDate(new Date().toISOString().slice(0, 10))
              setSessCost('')
              setSessPlayerIds([])
              setShowSession(true)
            }}
            onEditSession={sess => { setEditSession(sess); setEditSessCost(String(sess.total_cost)) }}
          />
        )}

        {!loading && tab === 'matches' && (
          <MatchesTab
            matches={matches}
            sessions={sessions}
            players={players}
            isAdmin={isAdmin}
            onNewMatch={openMatchModal}
            onDeleteMatch={handleDeleteMatch}
          />
        )}

        {!loading && tab === 'stats' && (
          <StatsTab
            matches={matches}
            sessions={sessions}
            players={players}
            sessionPlayers={sessionPlayers}
            statsFrom={statsFrom}
            statsTo={statsTo}
            statsSessIds={statsSessIds}
            setStatsFrom={setStatsFrom}
            setStatsTo={setStatsTo}
            setStatsSessIds={setStatsSessIds}
          />
        )}
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
              <button type="button" onClick={() => setShowAddPlayer(false)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                Hủy
              </button>
              <button type="submit" disabled={saving || !newName.trim()}
                className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
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
              <button type="button" onClick={() => setContribTarget(null)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                Hủy
              </button>
              <button type="submit" disabled={saving || !contribAmount || Number(contribAmount) <= 0}
                className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors">
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
            <FieldInput label="Ngày chơi" type="date" value={sessDate}
              onChange={e => setSessDate(e.target.value)} required />
            <FieldInput label="Tổng chi phí (đồng)" type="number" value={sessCost}
              onChange={e => setSessCost(e.target.value)} placeholder="500000" min="0" required />
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
                      <label key={p.id} className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors">
                        <input type="checkbox" checked={sessPlayerIds.includes(p.id)}
                          onChange={() => setSessPlayerIds(toggleItem(sessPlayerIds, p.id))}
                          className="w-4 h-4 rounded accent-indigo-600" />
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
              <button type="button" onClick={() => setShowSession(false)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                Hủy
              </button>
              <button type="submit" disabled={saving || sessPlayerIds.length === 0 || !sessCost || Number(sessCost) <= 0}
                className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
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
            {/* Mode toggle */}
            <div className="flex rounded-xl overflow-hidden border border-gray-200">
              {(['manual', 'auto'] as const).map(m => (
                <button key={m} type="button"
                  onClick={() => {
                    setMatchMode(m)
                    setMatchTeam1([])
                    setMatchTeam2([])
                    setAutoPlayers([])
                    setAutoSplit(null)
                  }}
                  className={`flex-1 py-2 text-xs font-medium transition-colors ${
                    matchMode === m ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-50'
                  }`}>
                  {m === 'manual' ? '✋ Chọn thủ công' : '🎲 Tự động chia đội'}
                </button>
              ))}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">Buổi chơi (tùy chọn)</label>
              <select value={matchSessId} onChange={e => setMatchSessId(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-50">
                <option value="">-- Không chọn --</option>
                {sessions.map(s => (
                  <option key={s.id} value={s.id}>{fmtDate(s.date)}</option>
                ))}
              </select>
            </div>

            {/* ── Manual mode ── */}
            {matchMode === 'manual' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-sm font-semibold text-blue-600 mb-1.5">🔵 Đội 1</p>
                  <div className="border-2 border-blue-100 rounded-xl overflow-hidden">
                    <div className="max-h-40 overflow-y-auto divide-y divide-blue-50">
                      {players.map(p => {
                        const inTeam2 = matchTeam2.includes(p.id)
                        return (
                          <label key={p.id} className={`flex items-center gap-2 px-2.5 py-2 text-xs transition-colors ${inTeam2 ? 'opacity-30 cursor-not-allowed bg-gray-50' : 'cursor-pointer hover:bg-blue-50'}`}>
                            <input type="checkbox" checked={matchTeam1.includes(p.id)} disabled={inTeam2}
                              onChange={() => !inTeam2 && setMatchTeam1(toggleItem(matchTeam1, p.id))}
                              className="w-3.5 h-3.5 rounded accent-blue-600" />
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
                          <label key={p.id} className={`flex items-center gap-2 px-2.5 py-2 text-xs transition-colors ${inTeam1 ? 'opacity-30 cursor-not-allowed bg-gray-50' : 'cursor-pointer hover:bg-red-50'}`}>
                            <input type="checkbox" checked={matchTeam2.includes(p.id)} disabled={inTeam1}
                              onChange={() => !inTeam1 && setMatchTeam2(toggleItem(matchTeam2, p.id))}
                              className="w-3.5 h-3.5 rounded accent-red-500" />
                            <span className="truncate">{p.name}</span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                  <p className="text-xs text-red-400 mt-1">{matchTeam2.length} người</p>
                </div>
              </div>
            )}

            {/* ── Auto mode ── */}
            {matchMode === 'auto' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">
                    Chọn người chơi ({autoPlayers.length} đã chọn
                    {autoPlayers.length % 2 !== 0 && autoPlayers.length > 0 && (
                      <span className="text-amber-500"> · cần chẵn</span>
                    )})
                  </label>
                  <div className="border border-gray-200 rounded-xl overflow-hidden max-h-44 overflow-y-auto divide-y divide-gray-50">
                    {players.map(p => (
                      <label key={p.id} className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors">
                        <input type="checkbox" checked={autoPlayers.includes(p.id)}
                          onChange={() => {
                            setAutoPlayers(toggleItem(autoPlayers, p.id))
                            setAutoSplit(null)
                            setMatchTeam1([])
                            setMatchTeam2([])
                          }}
                          className="w-4 h-4 rounded accent-indigo-600" />
                        <span className="text-sm text-gray-700">{p.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <button type="button"
                  disabled={autoPlayers.length < 2 || autoPlayers.length % 2 !== 0}
                  onClick={() => {
                    const [t1, t2] = balancedSplit(autoPlayers, matches)
                    setAutoSplit([t1, t2])
                    setMatchTeam1(t1)
                    setMatchTeam2(t2)
                  }}
                  className="w-full py-2.5 rounded-xl text-sm font-medium border-2 border-indigo-300 text-indigo-700 hover:bg-indigo-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  🎲 {autoSplit ? 'Chia lại' : 'Chia đội'}
                </button>

                {autoSplit && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                      <p className="text-xs font-semibold text-blue-600 mb-1.5">🔵 Đội 1</p>
                      {autoSplit[0].map(id => (
                        <p key={id} className="text-xs text-gray-700">{players.find(p => p.id === id)?.name}</p>
                      ))}
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                      <p className="text-xs font-semibold text-red-500 mb-1.5">🔴 Đội 2</p>
                      {autoSplit[1].map(id => (
                        <p key={id} className="text-xs text-gray-700">{players.find(p => p.id === id)?.name}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <FieldInput label="💸 Đội thua đóng (tổng)" type="number" value={matchAmount}
                onChange={e => setMatchAmount(e.target.value)} placeholder="50000" min="0" required />
              <FieldInput label="🏆 Đội thắng nhận (tổng)" type="number" value={matchWinAmount}
                onChange={e => setMatchWinAmount(e.target.value)} placeholder="50000" min="0" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">Đội thắng</label>
              <div className="grid grid-cols-2 gap-2">
                {(['team1', 'team2'] as const).map(t => (
                  <button key={t} type="button" onClick={() => setMatchWinner(t)}
                    className={`py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${
                      matchWinner === t
                        ? t === 'team1' ? 'bg-blue-600 text-white border-blue-600' : 'bg-red-500 text-white border-red-500'
                        : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}>
                    {t === 'team1' ? '🔵 Đội 1 thắng' : '🔴 Đội 2 thắng'}
                  </button>
                ))}
              </div>
              {(() => {
                const losingTeam = matchWinner === 'team1' ? matchTeam2 : matchTeam1
                const winningTeam = matchWinner === 'team1' ? matchTeam1 : matchTeam2
                const showLose = Number(matchAmount) > 0 && losingTeam.length > 0
                const showWin = Number(matchWinAmount) > 0 && winningTeam.length > 0
                if (!showLose && !showWin) return null
                return (
                  <div className="mt-2 flex gap-3 text-xs font-medium flex-wrap">
                    {showLose && <span className="text-red-500">Thua đóng: {fmt(Number(matchAmount) / losingTeam.length)}/người</span>}
                    {showWin && <span className="text-emerald-600">Thắng nhận: +{fmt(Number(matchWinAmount) / winningTeam.length)}/người</span>}
                  </div>
                )
              })()}
            </div>

            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setShowMatch(false)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                Hủy
              </button>
              <button type="submit"
                disabled={saving || matchTeam1.length === 0 || matchTeam2.length === 0 || !matchAmount || Number(matchAmount) <= 0}
                className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
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
              <p>Số người tham dự: <span className="font-semibold text-gray-800">
                {sessionPlayers.filter(s => s.session_id === editSession.id).length} người
              </span></p>
              {editSessCost && Number(editSessCost) > 0 && sessionPlayers.filter(s => s.session_id === editSession.id).length > 0 && (
                <p className="mt-1">Chi phí mới mỗi người: <span className="font-semibold text-indigo-600">
                  {fmt(Number(editSessCost) / sessionPlayers.filter(s => s.session_id === editSession.id).length)}
                </span></p>
              )}
            </div>
            <FieldInput label="Tổng chi phí mới (đồng)" type="number" value={editSessCost}
              onChange={e => setEditSessCost(e.target.value)} min="0" autoFocus required />
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setEditSession(null)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                Hủy
              </button>
              <button type="submit" disabled={saving || !editSessCost || Number(editSessCost) <= 0}
                className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                {saving ? 'Đang lưu...' : '💾 Lưu'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ─── MODAL: Login admin ─── */}
      {showLogin && (
        <Modal title="Đăng nhập Admin" onClose={() => setShowLogin(false)}>
          <form onSubmit={handleLogin} className="space-y-4">
            <FieldInput
              label="Mật khẩu"
              type="password"
              value={loginPwd}
              onChange={e => { setLoginPwd(e.target.value); setLoginErr('') }}
              placeholder="Nhập mật khẩu..."
              autoFocus
              required
            />
            {loginErr && (
              <p className="text-sm text-red-500 font-medium">{loginErr}</p>
            )}
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setShowLogin(false)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                Hủy
              </button>
              <button type="submit" disabled={!loginPwd}
                className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                Đăng nhập
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
