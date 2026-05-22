import { useState, type FormEvent } from 'react'
import { FieldInput } from '@/components/FieldInput'
import { Modal } from '@/components/Modal'
import { createSession, toErrorMessage } from '@/lib/pickleball-api'
import type { Player } from '@/lib/types'
import { fmt, toggleItem } from '@/lib/utils'

type SessionModalProps = {
  players: Player[]
  onClose: () => void
  onError: (message: string) => void
  onSaved: () => void
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

export function SessionModal({ players, onClose, onError, onSaved }: SessionModalProps) {
  const [date, setDate] = useState(today)
  const [cost, setCost] = useState('')
  const [playerIds, setPlayerIds] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!date || !cost || playerIds.length === 0 || Number(cost) <= 0) return

    setSaving(true)
    try {
      await createSession(date, Number(cost), playerIds)
      onSaved()
      onClose()
    } catch (error) {
      onError(toErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="Tạo buổi chơi mới" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FieldInput
          label="Ngày chơi"
          type="date"
          value={date}
          onChange={event => setDate(event.target.value)}
          required
        />
        <FieldInput
          label="Tổng chi phí (đồng)"
          type="number"
          value={cost}
          onChange={event => setCost(event.target.value)}
          placeholder="500000"
          min="0"
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
          {playerIds.length > 0 && cost && Number(cost) > 0 && (
            <p className="mt-1.5 text-xs text-indigo-600 font-medium">
              Chi phí mỗi người: {fmt(Number(cost) / playerIds.length)}
            </p>
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
            disabled={saving || playerIds.length === 0 || !cost || Number(cost) <= 0}
            className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Đang lưu...' : '📅 Tạo buổi'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
