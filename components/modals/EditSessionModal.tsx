import { useState, type FormEvent } from 'react'
import { FieldInput } from '@/components/FieldInput'
import { Modal } from '@/components/Modal'
import { toErrorMessage, updateSessionDetails } from '@/lib/pickleball-api'
import type { Player, Session, SessionPlayer } from '@/lib/types'
import { fmt, fmtDate, toggleItem } from '@/lib/utils'

type EditSessionModalProps = {
  session: Session
  players: Player[]
  sessionPlayers: SessionPlayer[]
  onClose: () => void
  onError: (message: string) => void
  onSaved: () => void
}

export function EditSessionModal({
  session,
  players,
  sessionPlayers,
  onClose,
  onError,
  onSaved,
}: EditSessionModalProps) {
  const [cost, setCost] = useState(String(session.total_cost))
  const [playerIds, setPlayerIds] = useState(() =>
    sessionPlayers.filter(item => item.session_id === session.id).map(item => item.player_id)
  )
  const [saving, setSaving] = useState(false)
  const attendeeCount = playerIds.length
  const showShare = cost && Number(cost) > 0 && attendeeCount > 0

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!cost || Number(cost) <= 0) return

    setSaving(true)
    try {
      await updateSessionDetails(session.id, Number(cost), playerIds)
      onSaved()
      onClose()
    } catch (error) {
      onError(toErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={`Sửa buổi ${fmtDate(session.date)}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-600">
          <p>
            Số người tham dự:{' '}
            <span className="font-semibold text-gray-800">{attendeeCount} người</span>
          </p>
          {showShare && (
            <p className="mt-1">
              Chi phí mới mỗi người:{' '}
              <span className="font-semibold text-indigo-600">
                {fmt(Number(cost) / attendeeCount)}
              </span>
            </p>
          )}
        </div>
        <FieldInput
          label="Tổng chi phí mới (đồng)"
          type="number"
          value={cost}
          onChange={event => setCost(event.target.value)}
          min="0"
          autoFocus
          required
        />
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1.5">
            Người tham dự ({playerIds.length} đã chọn)
          </label>
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            {players.length === 0 ? (
              <p className="text-sm text-gray-400 p-3">Chưa có người chơi nào.</p>
            ) : (
              <div className="max-h-44 overflow-y-auto divide-y divide-gray-50">
                {players.map(player => (
                  <label
                    key={player.id}
                    className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={playerIds.includes(player.id)}
                      onChange={() => setPlayerIds(current => toggleItem(current, player.id))}
                      className="w-4 h-4 rounded accent-indigo-600"
                    />
                    <span className="text-sm text-gray-700">{player.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
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
            disabled={saving || !cost || Number(cost) <= 0 || playerIds.length === 0}
            className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Đang lưu...' : '💾 Lưu'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
