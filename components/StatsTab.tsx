import { useState } from 'react'
import type { Match, Session, Player, SessionPlayer } from '@/lib/types'
import { fmtDate, toggleItem } from '@/lib/utils'

interface Props {
  matches: Match[]
  sessions: Session[]
  players: Player[]
  sessionPlayers: SessionPlayer[]
}

export function StatsTab({
  matches, sessions, players, sessionPlayers,
}: Props) {
  const [statsFrom, setStatsFrom] = useState('')
  const [statsTo, setStatsTo] = useState('')
  const [statsSessIds, setStatsSessIds] = useState<string[]>([])
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
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
        <p className="text-sm font-semibold text-gray-700">Chọn ngày thống kê</p>
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

      {filteredMatches.length === 0 && (
        <div className="bg-white rounded-2xl p-10 text-center text-gray-400 shadow-sm">
          <div className="text-4xl mb-2">📊</div>
          <p className="text-sm">Không có trận đấu nào trong khoảng thời gian này.</p>
        </div>
      )}

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
}
