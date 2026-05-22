import { useState, type FormEvent } from 'react'
import { FieldInput } from '@/components/FieldInput'
import { Modal } from '@/components/Modal'
import { createPlayer, toErrorMessage } from '@/lib/pickleball-api'

type AddPlayerModalProps = {
  onClose: () => void
  onError: (message: string) => void
  onSaved: () => void
}

export function AddPlayerModal({ onClose, onError, onSaved }: AddPlayerModalProps) {
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) return

    setSaving(true)
    try {
      await createPlayer(trimmedName)
      onSaved()
      onClose()
    } catch (error) {
      onError(toErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="Thêm người chơi" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FieldInput
          label="Tên người chơi"
          type="text"
          value={name}
          onChange={event => setName(event.target.value)}
          placeholder="Nhập tên..."
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
            disabled={saving || !name.trim()}
            className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Đang lưu...' : 'Thêm'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
