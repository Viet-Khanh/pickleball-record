import Image from 'next/image'
import type { Player, Contribution, SessionPlayer, Match } from '@/lib/types'
import { fmt, fmtDate, getBalance, matchPenalties, matchEarnings } from '@/lib/utils'

interface Props {
  players: Player[]
  contributions: Contribution[]
  sessionPlayers: SessionPlayer[]
  matches: Match[]
  isAdmin: boolean
  onAddPlayer: () => void
  onContrib: (player: Player) => void
}

export function PlayersTab({ players, contributions, sessionPlayers, matches, isAdmin, onAddPlayer, onContrib }: Props) {
  return (
    <div className="mt-4 pb-10 space-y-3">
      {/* QR chuyển tiền */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center gap-4">
        <Image
          src="/QR code.png"
          alt="QR chuyển tiền"
          width={96}
          height={96}
          className="rounded-xl shrink-0"
        />
        <div>
          <p className="text-sm font-semibold text-gray-800">💳 Chuyển tiền vào quỹ</p>
          <p className="text-xs text-gray-400 mt-1 leading-relaxed">Quét mã QR để nạp tiền.<br />Ghi chú tên của bạn khi chuyển.</p>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <span className="text-sm font-semibold text-gray-600">{players.length} người chơi</span>
        {isAdmin && (
          <button
            onClick={onAddPlayer}
            className="bg-indigo-600 text-white text-xs font-medium px-3 py-2 rounded-xl hover:bg-indigo-700 active:scale-95 transition-all"
          >
            + Thêm người chơi
          </button>
        )}
      </div>

      {players.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center text-gray-400 shadow-sm">
          <div className="text-4xl mb-2">👤</div>
          <p className="text-sm">Chưa có người chơi.</p>
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
          const matchOut = matchPenalties(player.id, matches)
          const matchIn = matchEarnings(player.id, matches)
          const recentContribs = contributions.filter(c => c.player_id === player.id).slice(0, 3)
          return (
            <div key={player.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 truncate">{player.name}</p>
                  <div className="flex gap-2 mt-1 text-xs text-gray-400 flex-wrap">
                    <span>Nạp: <span className="text-emerald-600 font-medium">{fmt(totalIn)}</span></span>
                    <span>Sân: <span className="text-amber-600 font-medium">{fmt(sessOut)}</span></span>
                    {matchIn > 0 && <span>Thắng: <span className="text-blue-500 font-medium">+{fmt(matchIn)}</span></span>}
                    {matchOut > 0 && <span>Thua: <span className="text-red-500 font-medium">-{fmt(matchOut)}</span></span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className={`text-right ${balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    <p className="text-xs font-medium text-gray-400">Số dư</p>
                    <p className="text-base font-bold">
                      {balance >= 0 ? '+' : ''}{fmt(balance)}
                    </p>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => onContrib(player)}
                      className="bg-emerald-500 text-white text-xs px-2.5 py-1.5 rounded-xl hover:bg-emerald-600 active:scale-95 transition-all whitespace-nowrap"
                    >
                      💰 Nạp quỹ
                    </button>
                  )}
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
  )
}
