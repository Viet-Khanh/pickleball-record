import type { Session, SessionPlayer, Player } from '@/lib/types'
import { fmt, fmtDate } from '@/lib/utils'

interface Props {
  sessions: Session[]
  sessionPlayers: SessionPlayer[]
  players: Player[]
  isAdmin: boolean
  onNewSession: () => void
  onEditSession: (sess: Session) => void
}

export function SessionsTab({ sessions, sessionPlayers, players, isAdmin, onNewSession, onEditSession }: Props) {
  function playerName(id: string) {
    return players.find(p => p.id === id)?.name ?? '?'
  }

  return (
    <div className="mt-4 pb-10 space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-sm font-semibold text-gray-600">{sessions.length} buổi chơi</span>
        <button
          onClick={onNewSession}
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
                      <span key={s.id} className="bg-indigo-50 text-indigo-700 text-xs px-2 py-0.5 rounded-full">
                        {playerName(s.player_id)}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-right shrink-0 ml-3 flex flex-col items-end gap-1">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-amber-600">{fmt(sess.total_cost)}</p>
                    {isAdmin && (
                      <button
                        onClick={() => onEditSession(sess)}
                        className="text-gray-300 hover:text-indigo-500 transition-colors text-sm leading-none"
                        title="Sửa chi phí"
                      >
                        ✏️
                      </button>
                    )}
                  </div>
                  {sp.length > 0 && (
                    <p className="text-xs text-gray-400">{fmt(costShare)}/người</p>
                  )}
                </div>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
