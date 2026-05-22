import { useState, type FormEvent } from 'react'
import { FieldInput } from '@/components/FieldInput'
import { Modal } from '@/components/Modal'
import { toErrorMessage, updateSessionCost } from '@/lib/pickleball-api'
import type { Session, SessionPlayer } from '@/lib/types'
import { fmt, fmtDate } from '@/lib/utils'

type EditSessionModalProps = {
  session: Session
  sessionPlayers: SessionPlayer[]
  onClose: () => void
  onError: (message: string) => void
  onSaved: () => void
}

export function EditSessionModal({
  session,
  sessionPlayers,
  onClose,
  onError,
  onSaved,
}: EditSessionModalProps) {
  const [cost, setCost] = useState(String(session.total_cost))
  const [saving, setSaving] = useState(false)
  const attendeeCount = sessionPlayers.filter(item => item.session_id === session.id).length
  const showShare = cost && Number(cost) > 0 && attendeeCount > 0

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!cost || Number(cost) <= 0) return

    setSaving(true)
    try {
      await updateSessionCost(session.id, Number(cost), attendeeCount)
      onSaved()
      onClose()
    } catch (error) {
      onError(toErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={`Sửa chi phí buổi ${fmtDate(session.date)}`} onClose={onClose}>
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
            disabled={saving || !cost || Number(cost) <= 0}
            className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Đang lưu...' : '💾 Lưu'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
