import { useState, type FormEvent } from 'react'
import { FieldInput } from '@/components/FieldInput'
import { Modal } from '@/components/Modal'
import { createFundExpense, toErrorMessage } from '@/lib/pickleball-api'

type FundExpenseModalProps = {
  onClose: () => void
  onError: (message: string) => void
  onSaved: () => void
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

export function FundExpenseModal({ onClose, onError, onSaved }: FundExpenseModalProps) {
  const [note, setNote] = useState('')
  const [amount, setAmount] = useState('')
  const [spentAt, setSpentAt] = useState(today)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedNote = note.trim()
    if (!trimmedNote || !amount || Number(amount) <= 0 || !spentAt) return

    setSaving(true)
    try {
      await createFundExpense({
        note: trimmedNote,
        amount: Number(amount),
        spentAt,
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
    <Modal title="Thêm khoản chi" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FieldInput
          label="Nội dung chi"
          type="text"
          value={note}
          onChange={event => setNote(event.target.value)}
          placeholder="Mua bóng, mua nước, đi ăn uống..."
          autoFocus
          required
        />
        <FieldInput
          label="Số tiền (đồng)"
          type="number"
          value={amount}
          onChange={event => setAmount(event.target.value)}
          placeholder="100000"
          min="1"
          required
        />
        <FieldInput
          label="Ngày chi"
          type="date"
          value={spentAt}
          onChange={event => setSpentAt(event.target.value)}
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
            disabled={saving || !note.trim() || !amount || Number(amount) <= 0 || !spentAt}
            className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Đang lưu...' : 'Tạo khoản chi'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
