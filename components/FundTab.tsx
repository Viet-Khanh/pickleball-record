import type {
  Contribution,
  FundExpense,
  Match,
  MatchPayment,
  Player,
  Session,
} from '@/lib/types'
import { fmt, fmtDate, losingPlayerIds } from '@/lib/utils'

type MatchDebt = {
  key: string
  match: Match
  playerId: string
  player: Player | null
  due: number
  paid: number
  remaining: number
  payments: MatchPayment[]
}

interface Props {
  contributions: Contribution[]
  fundExpenses: FundExpense[]
  matches: Match[]
  matchPayments: MatchPayment[]
  players: Player[]
  sessions: Session[]
  isAdmin: boolean
  onAddExpense: () => void
  onCollectMatchPayment: (debt: MatchDebt & { player: Player }) => void
  onDeleteExpense: (id: string) => void
  onDeleteMatchPayment: (id: string) => void
}

export function FundTab({
  contributions,
  fundExpenses,
  matches,
  matchPayments,
  players,
  sessions,
  isAdmin,
  onAddExpense,
  onCollectMatchPayment,
  onDeleteExpense,
  onDeleteMatchPayment,
}: Props) {
  function playerName(id: string) {
    return players.find(player => player.id === id)?.name ?? '?'
  }

  function matchDate(match: Match) {
    return sessions.find(session => session.id === match.session_id)?.date ?? match.created_at
  }

  const matchDebts = matches.flatMap(match => {
    const losers = losingPlayerIds(match)
    const due = losers.length > 0 ? Number(match.amount) / losers.length : 0

    return losers.map(playerId => {
      const payments = matchPayments.filter(
        payment => payment.match_id === match.id && payment.player_id === playerId
      )
      const paid = payments.reduce((sum, payment) => sum + Number(payment.amount), 0)
      return {
        key: `${match.id}-${playerId}`,
        match,
        playerId,
        player: players.find(item => item.id === playerId) ?? null,
        due,
        paid,
        remaining: Math.max(due - paid, 0),
        payments,
      }
    })
  })

  const totalContribution = contributions.reduce((sum, item) => sum + Number(item.amount), 0)
  const totalLossDue = matches.reduce((sum, match) => sum + Number(match.amount), 0)
  const totalLossPaid = matchPayments.reduce((sum, payment) => sum + Number(payment.amount), 0)
  const totalLossRemaining = Math.max(totalLossDue - totalLossPaid, 0)
  const totalCourtExpense = sessions.reduce((sum, session) => sum + Number(session.total_cost), 0)
  const totalWinnerPayout = matches.reduce((sum, match) => sum + Number(match.win_amount ?? 0), 0)
  const totalManualExpense = fundExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0)
  const totalExpense = totalCourtExpense + totalWinnerPayout + totalManualExpense
  const cashBalance = totalContribution + totalLossPaid - totalExpense
  const projectedBalance = cashBalance + totalLossRemaining

  return (
    <div className="mt-4 pb-10 space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <SummaryBox label="Đã đóng quỹ" value={fmt(totalContribution)} tone="emerald" />
        <SummaryBox label="Đã thu tiền thua" value={fmt(totalLossPaid)} tone="blue" />
        <SummaryBox label="Tổng chi" value={fmt(totalExpense)} tone="red" />
        <SummaryBox label="Số dư quỹ" value={fmt(cashBalance)} tone={cashBalance >= 0 ? 'emerald' : 'red'} />
      </div>

      <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3">
        <div className="flex justify-between items-center gap-3">
          <div>
            <p className="text-sm font-semibold text-amber-800">Tiền thua còn phải thu</p>
            <p className="text-xs text-amber-600 mt-0.5">
              Quỹ dự kiến sau khi thu đủ: {fmt(projectedBalance)}
            </p>
          </div>
          <p className="text-xl font-bold text-amber-700">{fmt(totalLossRemaining)}</p>
        </div>
      </div>

      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-700">Tiền thua cần thu</p>
            <p className="text-xs text-gray-400">{matchDebts.length} lượt người chơi bên thua</p>
          </div>
        </div>

        {matchDebts.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <div className="text-4xl mb-2">🏆</div>
            <p className="text-sm">Chưa có trận nào phát sinh tiền thua.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {matchDebts.map(debt => {
              const debtPlayer = debt.player

              return (
                <div key={debt.key} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-800 truncate">
                        {debtPlayer?.name ?? playerName(debt.playerId)}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Trận {fmtDate(matchDate(debt.match))}
                      </p>
                      <div className="flex gap-2 mt-1 text-xs flex-wrap">
                        <span className="text-red-500">Phải đóng: {fmt(debt.due)}</span>
                        <span className="text-emerald-600">Đã đóng: {fmt(debt.paid)}</span>
                        {debt.remaining > 0 ? (
                          <span className="text-amber-600">Còn: {fmt(debt.remaining)}</span>
                        ) : (
                          <span className="text-emerald-600 font-medium">Đã đủ</span>
                        )}
                      </div>
                    </div>
                    {isAdmin && debtPlayer && debt.remaining > 0 && (
                      <button
                        onClick={() => onCollectMatchPayment({ ...debt, player: debtPlayer })}
                        className="shrink-0 bg-emerald-500 text-white text-xs px-2.5 py-1.5 rounded-xl hover:bg-emerald-600 active:scale-95 transition-all"
                      >
                        Thu tiền
                      </button>
                    )}
                  </div>

                  {debt.payments.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {debt.payments.map(payment => (
                        <div key={payment.id} className="flex justify-between items-center text-xs text-gray-500 bg-gray-50 rounded-lg px-2 py-1">
                          <span>
                            {fmtDate(payment.paid_at)} · {payment.note ?? 'Đóng tiền thua'}
                          </span>
                          <span className="flex items-center gap-2">
                            <span className="text-emerald-600 font-medium">+{fmt(payment.amount)}</span>
                            {isAdmin && (
                              <button
                                onClick={() => onDeleteMatchPayment(payment.id)}
                                className="text-gray-300 hover:text-red-500"
                                title="Xóa khoản thu"
                              >
                                ✕
                              </button>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-700">Khoản chi</p>
            <p className="text-xs text-gray-400">
              Sân: {fmt(totalCourtExpense)} · Thưởng: {fmt(totalWinnerPayout)} · Khác: {fmt(totalManualExpense)}
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={onAddExpense}
              className="bg-red-500 text-white text-xs font-medium px-3 py-2 rounded-xl hover:bg-red-600 active:scale-95 transition-all"
            >
              + Thêm chi
            </button>
          )}
        </div>

        {fundExpenses.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <div className="text-4xl mb-2">🧾</div>
            <p className="text-sm">Chưa có khoản chi mua bóng, nước hoặc vật dụng khác.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {fundExpenses.map(expense => (
              <div key={expense.id} className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{expense.note}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{fmtDate(expense.spent_at)}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <p className="font-semibold text-red-500">-{fmt(expense.amount)}</p>
                  {isAdmin && (
                    <button
                      onClick={() => onDeleteExpense(expense.id)}
                      className="text-gray-300 hover:text-red-500"
                      title="Xóa khoản chi"
                    >
                      🗑
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function SummaryBox({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: 'emerald' | 'blue' | 'red'
}) {
  const toneClass = {
    emerald: 'text-emerald-700 bg-emerald-50 border-emerald-100',
    blue: 'text-blue-700 bg-blue-50 border-blue-100',
    red: 'text-red-600 bg-red-50 border-red-100',
  }[tone]

  return (
    <div className={`rounded-2xl border p-3 ${toneClass}`}>
      <p className="text-xs opacity-75">{label}</p>
      <p className="text-lg font-bold mt-0.5">{value}</p>
    </div>
  )
}
