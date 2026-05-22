import { useState, type FormEvent } from 'react'
import { FieldInput } from '@/components/FieldInput'
import { Modal } from '@/components/Modal'
import { createMatchPayments, toErrorMessage } from '@/lib/pickleball-api'
import type { Match, Player } from '@/lib/types'
import { fmt, fmtDate } from '@/lib/utils'

export type MatchPaymentDebtInput = {
  match: Match
  due: number
  paid: number
  remaining: number
  matchDate: string
}

type MatchPaymentModalProps = {
  player: Player
  debts: MatchPaymentDebtInput[]
  due: number
  paid: number
  remaining: number
  onClose: () => void
  onError: (message: string) => void
  onSaved: () => void
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

export function MatchPaymentModal({
  player,
  debts,
  due,
  paid,
  remaining,
  onClose,
  onError,
  onSaved,
}: MatchPaymentModalProps) {
  const [amount, setAmount] = useState(String(Math.round(remaining)))
  const [paidAt, setPaidAt] = useState(today)
  const [note, setNote] = useState('')
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const unpaidDebts = debts.filter(debt => debt.remaining > 0)
  const visibleDebts = unpaidDebts.slice(0, 3)
  const hiddenDebtCount = unpaidDebts.length - visibleDebts.length

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const paymentAmount = Number(amount)
    if (!amount || paymentAmount <= 0 || !paidAt) return
    if (paymentAmount > remaining) {
      setFormError('Số tiền thu không được lớn hơn số còn phải đóng')
      return
    }

    setSaving(true)
    try {
      let rest = paymentAmount
      const trimmedNote = note.trim() || null
      const payments = unpaidDebts
        .map(debt => {
          if (rest <= 0) return null
          const amountForDebt = Math.min(rest, debt.remaining)
          rest -= amountForDebt

          return {
            matchId: debt.match.id,
            playerId: player.id,
            amount: amountForDebt,
            paidAt,
            note: trimmedNote,
          }
        })
        .filter(payment => payment !== null)

      await createMatchPayments(payments)
      onSaved()
      onClose()
    } catch (error) {
      onError(toErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={`Thu tiền trận của ${player.name}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-600">
          <p>
            Tổng hợp <span className="font-semibold text-gray-800">{debts.length} trận</span>
          </p>
          <div className="flex gap-3 mt-1 text-xs flex-wrap">
            <span>Phải đóng: <span className="font-semibold text-red-500">{fmt(due)}</span></span>
            <span>Đã đóng: <span className="font-semibold text-emerald-600">{fmt(paid)}</span></span>
            <span>Còn: <span className="font-semibold text-amber-600">{fmt(remaining)}</span></span>
          </div>
        </div>
        {unpaidDebts.length > 0 && (
          <div className="border border-gray-100 rounded-xl overflow-hidden divide-y divide-gray-50">
            {visibleDebts.map(debt => (
              <div key={debt.match.id} className="px-3 py-2 flex justify-between text-xs text-gray-500">
                <span>Trận {fmtDate(debt.matchDate)}</span>
                <span className="text-amber-600 font-medium">Còn {fmt(debt.remaining)}</span>
              </div>
            ))}
            {hiddenDebtCount > 0 && (
              <div className="px-3 py-2 text-xs text-gray-400">
                Và {hiddenDebtCount} trận còn thiếu khác
              </div>
            )}
          </div>
        )}
        <FieldInput
          label="Số tiền thu (đồng)"
          type="number"
          value={amount}
          onChange={event => {
            setAmount(event.target.value)
            setFormError('')
          }}
          min="1"
          max={Math.round(remaining)}
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
        {formError && <p className="text-sm text-red-500 font-medium">{formError}</p>}
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
            disabled={saving || !amount || Number(amount) <= 0 || Number(amount) > remaining || !paidAt}
            className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Đang lưu...' : 'Ghi nhận thu'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
