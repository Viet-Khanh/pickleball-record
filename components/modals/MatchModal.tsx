import { useState, type FormEvent } from 'react'
import { FieldInput } from '@/components/FieldInput'
import { Modal } from '@/components/Modal'
import { createMatch, toErrorMessage } from '@/lib/pickleball-api'
import type { Match, Player, Session } from '@/lib/types'
import { balancedSplit, fmt, fmtDate, toggleItem } from '@/lib/utils'

type MatchMode = 'manual' | 'auto'

type MatchModalProps = {
  matches: Match[]
  players: Player[]
  sessions: Session[]
  onClose: () => void
  onError: (message: string) => void
  onSaved: () => void
}

function defaultSessionId(sessions: Session[]) {
  const today = new Date().toISOString().slice(0, 10)
  const defaultSession = sessions.find(session => session.date === today) ?? sessions[0]
  return defaultSession?.id ?? ''
}

export function MatchModal({
  matches,
  players,
  sessions,
  onClose,
  onError,
  onSaved,
}: MatchModalProps) {
  const [mode, setMode] = useState<MatchMode>('manual')
  const [team1, setTeam1] = useState<string[]>([])
  const [team2, setTeam2] = useState<string[]>([])
  const [amount, setAmount] = useState('50000')
  const [winAmount, setWinAmount] = useState('50000')
  const [winner, setWinner] = useState<Match['winner']>('team1')
  const [sessionId, setSessionId] = useState(() => defaultSessionId(sessions))
  const [autoPlayers, setAutoPlayers] = useState<string[]>([])
  const [autoSplit, setAutoSplit] = useState<[string[], string[]] | null>(null)
  const [saving, setSaving] = useState(false)

  function resetTeams() {
    setTeam1([])
    setTeam2([])
    setAutoPlayers([])
    setAutoSplit(null)
  }

  function handleModeChange(nextMode: MatchMode) {
    setMode(nextMode)
    resetTeams()
  }

  function handleAutoPlayerToggle(playerId: string) {
    setAutoPlayers(current => toggleItem(current, playerId))
    setAutoSplit(null)
    setTeam1([])
    setTeam2([])
  }

  function handleAutoSplit() {
    const split = balancedSplit(autoPlayers, matches)
    setAutoSplit(split)
    setTeam1(split[0])
    setTeam2(split[1])
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (team1.length === 0 || team2.length === 0 || !amount || Number(amount) <= 0) return

    setSaving(true)
    try {
      await createMatch({
        sessionId: sessionId || null,
        team1PlayerIds: team1,
        team2PlayerIds: team2,
        amount: Number(amount),
        winAmount: Number(winAmount),
        winner,
      })
      onSaved()
      onClose()
    } catch (error) {
      onError(toErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  const losingTeam = winner === 'team1' ? team2 : team1
  const winningTeam = winner === 'team1' ? team1 : team2
  const showLoseShare = Number(amount) > 0 && losingTeam.length > 0
  const showWinShare = Number(winAmount) > 0 && winningTeam.length > 0

  return (
    <Modal title="Ghi kết quả trận đấu" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex rounded-xl overflow-hidden border border-gray-200">
          {(['manual', 'auto'] as const).map(item => (
            <button
              key={item}
              type="button"
              onClick={() => handleModeChange(item)}
              className={`flex-1 py-2 text-xs font-medium transition-colors ${
                mode === item ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              {item === 'manual' ? '✋ Chọn thủ công' : '🎲 Tự động chia đội'}
            </button>
          ))}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1.5">
            Buổi chơi (tùy chọn)
          </label>
          <select
            value={sessionId}
            onChange={event => setSessionId(event.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-50"
          >
            <option value="">-- Không chọn --</option>
            {sessions.map(session => (
              <option key={session.id} value={session.id}>
                {fmtDate(session.date)}
              </option>
            ))}
          </select>
        </div>

        {mode === 'manual' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-sm font-semibold text-blue-600 mb-1.5">🔵 Đội 1</p>
              <div className="border-2 border-blue-100 rounded-xl overflow-hidden">
                <div className="max-h-40 overflow-y-auto divide-y divide-blue-50">
                  {players.map(player => {
                    const inTeam2 = team2.includes(player.id)
                    return (
                      <label
                        key={player.id}
                        className={`flex items-center gap-2 px-2.5 py-2 text-xs transition-colors ${
                          inTeam2
                            ? 'opacity-30 cursor-not-allowed bg-gray-50'
                            : 'cursor-pointer hover:bg-blue-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={team1.includes(player.id)}
                          disabled={inTeam2}
                          onChange={() =>
                            !inTeam2 && setTeam1(current => toggleItem(current, player.id))
                          }
                          className="w-3.5 h-3.5 rounded accent-blue-600"
                        />
                        <span className="truncate">{player.name}</span>
                      </label>
                    )
                  })}
                </div>
              </div>
              <p className="text-xs text-blue-500 mt-1">{team1.length} người</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-red-500 mb-1.5">🔴 Đội 2</p>
              <div className="border-2 border-red-100 rounded-xl overflow-hidden">
                <div className="max-h-40 overflow-y-auto divide-y divide-red-50">
                  {players.map(player => {
                    const inTeam1 = team1.includes(player.id)
                    return (
                      <label
                        key={player.id}
                        className={`flex items-center gap-2 px-2.5 py-2 text-xs transition-colors ${
                          inTeam1
                            ? 'opacity-30 cursor-not-allowed bg-gray-50'
                            : 'cursor-pointer hover:bg-red-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={team2.includes(player.id)}
                          disabled={inTeam1}
                          onChange={() =>
                            !inTeam1 && setTeam2(current => toggleItem(current, player.id))
                          }
                          className="w-3.5 h-3.5 rounded accent-red-500"
                        />
                        <span className="truncate">{player.name}</span>
                      </label>
                    )
                  })}
                </div>
              </div>
              <p className="text-xs text-red-400 mt-1">{team2.length} người</p>
            </div>
          </div>
        )}

        {mode === 'auto' && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">
                Chọn người chơi ({autoPlayers.length} đã chọn
                {autoPlayers.length % 2 !== 0 && autoPlayers.length > 0 && (
                  <span className="text-amber-500"> · cần chẵn</span>
                )}
                )
              </label>
              <div className="border border-gray-200 rounded-xl overflow-hidden max-h-44 overflow-y-auto divide-y divide-gray-50">
                {players.map(player => (
                  <label
                    key={player.id}
                    className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={autoPlayers.includes(player.id)}
                      onChange={() => handleAutoPlayerToggle(player.id)}
                      className="w-4 h-4 rounded accent-indigo-600"
                    />
                    <span className="text-sm text-gray-700">{player.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <button
              type="button"
              disabled={autoPlayers.length < 2 || autoPlayers.length % 2 !== 0}
              onClick={handleAutoSplit}
              className="w-full py-2.5 rounded-xl text-sm font-medium border-2 border-indigo-300 text-indigo-700 hover:bg-indigo-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              🎲 {autoSplit ? 'Chia lại' : 'Chia đội'}
            </button>

            {autoSplit && (
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                  <p className="text-xs font-semibold text-blue-600 mb-1.5">🔵 Đội 1</p>
                  {autoSplit[0].map(id => (
                    <p key={id} className="text-xs text-gray-700">
                      {players.find(player => player.id === id)?.name}
                    </p>
                  ))}
                </div>
                <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                  <p className="text-xs font-semibold text-red-500 mb-1.5">🔴 Đội 2</p>
                  {autoSplit[1].map(id => (
                    <p key={id} className="text-xs text-gray-700">
                      {players.find(player => player.id === id)?.name}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <FieldInput
            label="💸 Đội thua đóng (tổng)"
            type="number"
            value={amount}
            onChange={event => setAmount(event.target.value)}
            placeholder="50000"
            min="0"
            required
          />
          <FieldInput
            label="🏆 Đội thắng nhận (tổng)"
            type="number"
            value={winAmount}
            onChange={event => setWinAmount(event.target.value)}
            placeholder="50000"
            min="0"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1.5">Đội thắng</label>
          <div className="grid grid-cols-2 gap-2">
            {(['team1', 'team2'] as const).map(team => (
              <button
                key={team}
                type="button"
                onClick={() => setWinner(team)}
                className={`py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${
                  winner === team
                    ? team === 'team1'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-red-500 text-white border-red-500'
                    : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                {team === 'team1' ? '🔵 Đội 1 thắng' : '🔴 Đội 2 thắng'}
              </button>
            ))}
          </div>
          {(showLoseShare || showWinShare) && (
            <div className="mt-2 flex gap-3 text-xs font-medium flex-wrap">
              {showLoseShare && (
                <span className="text-red-500">
                  Thua đóng: {fmt(Number(amount) / losingTeam.length)}/người
                </span>
              )}
              {showWinShare && (
                <span className="text-emerald-600">
                  Thắng nhận: +{fmt(Number(winAmount) / winningTeam.length)}/người
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={
              saving || team1.length === 0 || team2.length === 0 || !amount || Number(amount) <= 0
            }
            className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Đang lưu...' : '🏆 Lưu kết quả'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
