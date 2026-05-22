import { useState, type FormEvent } from 'react'
import { FieldInput } from '@/components/FieldInput'
import { Modal } from '@/components/Modal'

type LoginModalProps = {
  onClose: () => void
  onLogin: (password: string) => boolean
}

export function LoginModal({ onClose, onLogin }: LoginModalProps) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (onLogin(password)) {
      setPassword('')
      setError('')
      onClose()
      return
    }

    setError('Sai mật khẩu')
  }

  return (
    <Modal title="Đăng nhập Admin" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FieldInput
          label="Mật khẩu"
          type="password"
          value={password}
          onChange={event => {
            setPassword(event.target.value)
            setError('')
          }}
          placeholder="Nhập mật khẩu..."
          autoFocus
          required
        />
        {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
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
            disabled={!password}
            className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            Đăng nhập
          </button>
        </div>
      </form>
    </Modal>
  )
}
