export type PickleballTab = 'players' | 'sessions' | 'matches' | 'fund' | 'stats'

const tabs: Array<{ key: PickleballTab; label: string; icon: string }> = [
  { key: 'players', label: 'Người chơi', icon: '👥' },
  { key: 'sessions', label: 'Buổi chơi', icon: '📅' },
  { key: 'matches', label: 'Trận đấu', icon: '🏆' },
  { key: 'fund', label: 'Quỹ', icon: '💰' },
  { key: 'stats', label: 'Thống kê', icon: '📊' },
]

type PickleballTabNavProps = {
  activeTab: PickleballTab
  onTabChange: (tab: PickleballTab) => void
}

export function PickleballTabNav({ activeTab, onTabChange }: PickleballTabNavProps) {
  return (
    <div className="flex bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
      {tabs.map(tab => (
        <button
          key={tab.key}
          onClick={() => onTabChange(tab.key)}
          className={`flex-1 py-3 text-xs font-medium transition-colors flex flex-col items-center gap-0.5 ${
            activeTab === tab.key ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          <span className="text-base">{tab.icon}</span>
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  )
}
