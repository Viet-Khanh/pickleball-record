type PickleballHeaderProps = {
  isAdmin: boolean
  onLoginClick: () => void
  onLogout: () => void
}

export function PickleballHeader({ isAdmin, onLoginClick, onLogout }: PickleballHeaderProps) {
  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
      <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-2.5">
        <span className="text-2xl">🏸</span>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-indigo-700 leading-tight">Quỹ Pickleball</h1>
          <p className="text-xs text-gray-400">Quản lý tiền quỹ &amp; kết quả</p>
        </div>
        {isAdmin ? (
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 text-xs text-gray-500 border border-gray-200 px-2.5 py-1.5 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <span className="text-amber-500">👑</span> Admin
          </button>
        ) : (
          <button
            onClick={onLoginClick}
            className="text-xs text-gray-400 border border-gray-200 px-2.5 py-1.5 rounded-xl hover:bg-gray-50 transition-colors"
          >
            🔐 Login
          </button>
        )}
      </div>
    </header>
  )
}
