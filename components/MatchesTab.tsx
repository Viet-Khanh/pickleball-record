import type { Match, Session, Player } from '@/lib/types'
import { fmt, fmtDate } from '@/lib/utils'

interface Props {
  matches: Match[]
  sessions: Session[]
  players: Player[]
  isAdmin: boolean
  onNewMatch: () => void
  onDeleteMatch: (id: string) => void
}

export function MatchesTab({ matches, sessions, players, isAdmin, onNewMatch, onDeleteMatch }: Props) {
  function playerName(id: string) {
    return players.find(p => p.id === id)?.name ?? '?'
  }

  return (
    <div className="mt-4 pb-10 space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-sm font-semibold text-gray-600">{matches.length} trận đấu</span>
        <button
          onClick={onNewMatch}
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
          const winning = match.winner === 'team1' ? match.team1_player_ids : match.team2_player_ids
          const perLoser = Number(match.amount) / losing.length
          const perWinner = Number(match.win_amount ?? 0) / winning.length
          const sessInfo = sessions.find(s => s.id === match.session_id)
          return (
            <div key={match.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <div className="flex justify-between items-center mb-3">
                <p className="text-xs text-gray-400">
                  {sessInfo ? fmtDate(sessInfo.date) : fmtDate(match.created_at)}
                </p>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-amber-600">{fmt(match.amount)}</p>
                  {isAdmin && (
                    <button
                      onClick={() => onDeleteMatch(match.id)}
                      className="text-gray-300 hover:text-red-500 transition-colors text-base leading-none"
                      title="Xóa trận đấu"
                    >
                      🗑
                    </button>
                  )}
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
              <div className="mt-2 flex gap-4 text-xs">
                <span className="text-gray-500">Thua đóng: <span className="text-red-600 font-semibold">{fmt(perLoser)}</span>/người</span>
                <span className="text-gray-500">Thắng nhận: <span className="text-emerald-600 font-semibold">+{fmt(perWinner)}</span>/người</span>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
