import { useState, type FormEvent } from 'react'
import { FieldInput } from '@/components/FieldInput'
import { Modal } from '@/components/Modal'
import { createMatchPayment, toErrorMessage } from '@/lib/pickleball-api'
import type { Match, Player } from '@/lib/types'
import { fmt, fmtDate } from '@/lib/utils'

type MatchPaymentModalProps = {
  match: Match
  player: Player
  due: number
  paid: number
  remaining: number
  matchDate: string
  onClose: () => void
  onError: (message: string) => void
  onSaved: () => void
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

export function MatchPaymentModal({
  match,
  player,
  due,
  paid,
  remaining,
  matchDate,
  onClose,
  onError,
  onSaved,
}: MatchPaymentModalProps) {
  const [amount, setAmount] = useState(String(Math.round(remaining)))
  const [paidAt, setPaidAt] = useState(today)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!amount || Number(amount) <= 0 || !paidAt) return

    setSaving(true)
    try {
      await createMatchPayment({
        matchId: match.id,
        playerId: player.id,
        amount: Number(amount),
        paidAt,
        note: note.trim() || null,
      })
      onSaved()
      onClose()
    } catch (error) {
      onError(toErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={`Thu tiền thua của ${player.name}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-600">
          <p>
            Trận ngày <span className="font-semibold text-gray-800">{fmtDate(matchDate)}</span>
          </p>
          <div className="flex gap-3 mt-1 text-xs flex-wrap">
            <span>Phải đóng: <span className="font-semibold text-red-500">{fmt(due)}</span></span>
            <span>Đã đóng: <span className="font-semibold text-emerald-600">{fmt(paid)}</span></span>
            <span>Còn: <span className="font-semibold text-amber-600">{fmt(remaining)}</span></span>
          </div>
        </div>
        <FieldInput
          label="Số tiền thu (đồng)"
          type="number"
          value={amount}
          onChange={event => setAmount(event.target.value)}
          min="1"
          autoFocus
          required
        />
        <FieldInput
          label="Ngày thu"
          type="date"
          value={paidAt}
          onChange={event => setPaidAt(event.target.value)}
          required
        />
        <FieldInput
          label="Ghi chú (tùy chọn)"
          type="text"
          value={note}
          onChange={event => setNote(event.target.value)}
          placeholder="Tiền thua trận..."
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
            disabled={saving || !amount || Number(amount) <= 0 || !paidAt}
            className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Đang lưu...' : 'Ghi nhận thu'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
