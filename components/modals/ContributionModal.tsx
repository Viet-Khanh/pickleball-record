import { useState, type FormEvent } from 'react'
import { FieldInput } from '@/components/FieldInput'
import { Modal } from '@/components/Modal'
import { createContribution, toErrorMessage } from '@/lib/pickleball-api'
import type { Player } from '@/lib/types'

type ContributionModalProps = {
  player: Player
  onClose: () => void
  onError: (message: string) => void
  onSaved: () => void
}

export function ContributionModal({ player, onClose, onError, onSaved }: ContributionModalProps) {
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!amount || Number(amount) <= 0) return

    setSaving(true)
    try {
      await createContribution(player.id, Number(amount), note.trim() || null)
      onSaved()
      onClose()
    } catch (error) {
      onError(toErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={`Nạp quỹ cho ${player.name}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FieldInput
          label="Số tiền (đồng)"
          type="number"
          value={amount}
          onChange={event => setAmount(event.target.value)}
          placeholder="100000"
          min="1"
          autoFocus
          required
        />
        <FieldInput
          label="Ghi chú (tùy chọn)"
          type="text"
          value={note}
          onChange={event => setNote(event.target.value)}
          placeholder="Nạp tiền tháng 5..."
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
            disabled={saving || !amount || Number(amount) <= 0}
            className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Đang lưu...' : '💰 Nạp quỹ'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
