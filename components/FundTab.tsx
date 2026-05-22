import type { FundExpense, Match, MatchPayment, Player, Session } from '@/lib/types'
import { fmt, fmtDate, losingPlayerIds, winningPlayerIds } from '@/lib/utils'

type MatchDebt = {
  key: string
  match: Match
  matchDate: string
  playerId: string
  player: Player | null
  due: number
  fundDue: number
  winnerDue: number
  paid: number
  remaining: number
  payments: MatchPayment[]
}

export type PlayerDebtSummary = {
  playerId: string
  player: Player | null
  due: number
  fundDue: number
  winnerDue: number
  winCredit: number
  required: number
  paid: number
  remaining: number
  payable: number
  matchCount: number
  winMatchCount: number
  payments: MatchPayment[]
  debts: MatchDebt[]
}

interface Props {
  fundExpenses: FundExpense[]
  matches: Match[]
  matchPayments: MatchPayment[]
  players: Player[]
  sessions: Session[]
  isAdmin: boolean
  onAddExpense: () => void
  onCollectMatchPayment: (summary: PlayerDebtSummary & { player: Player }) => void
  onDeleteExpense: (id: string) => void
  onDeleteMatchPayment: (id: string) => void
}

export function FundTab({
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
    const fundDue = losers.length > 0 ? Number(match.amount) / losers.length : 0
    const winnerDue = losers.length > 0 ? Number(match.win_amount ?? 0) / losers.length : 0
    const due = fundDue + winnerDue

    return losers.map(playerId => {
      const payments = matchPayments.filter(
        payment => payment.match_id === match.id && payment.player_id === playerId
      )
      const paid = payments.reduce((sum, payment) => sum + Number(payment.amount), 0)
      return {
        key: `${match.id}-${playerId}`,
        match,
        matchDate: matchDate(match),
        playerId,
        player: players.find(item => item.id === playerId) ?? null,
        due,
        fundDue,
        winnerDue,
        paid,
        remaining: Math.max(due - paid, 0),
        payments,
      }
    })
  })

  const playerDebtSummaries = Array.from(
    matches.reduce((map, match) => {
      const winners = winningPlayerIds(match)
      const winCredit = winners.length > 0 ? Number(match.win_amount ?? 0) / winners.length : 0
      if (winCredit <= 0) return map

      for (const playerId of winners) {
        const current = map.get(playerId) ?? {
          playerId,
          player: players.find(player => player.id === playerId) ?? null,
          due: 0,
          fundDue: 0,
          winnerDue: 0,
          winCredit: 0,
          required: 0,
          paid: 0,
          remaining: 0,
          payable: 0,
          matchCount: 0,
          winMatchCount: 0,
          payments: [],
          debts: [],
        }

        current.winCredit += winCredit
        current.winMatchCount += 1
        map.set(playerId, current)
      }

      return map
    }, matchDebts.reduce((map, debt) => {
      const current = map.get(debt.playerId) ?? {
        playerId: debt.playerId,
        player: debt.player,
        due: 0,
        fundDue: 0,
        winnerDue: 0,
        winCredit: 0,
        required: 0,
        paid: 0,
        remaining: 0,
        payable: 0,
        matchCount: 0,
        winMatchCount: 0,
        payments: [],
        debts: [],
      }

      current.due += debt.due
      current.fundDue += debt.fundDue
      current.winnerDue += debt.winnerDue
      current.paid += debt.paid
      current.matchCount += 1
      current.payments.push(...debt.payments)
      current.debts.push(debt)
      map.set(debt.playerId, current)

      return map
    }, new Map<string, PlayerDebtSummary>()))
      .values()
  )
    .map(summary => {
      const required = summary.fundDue + summary.winnerDue - summary.winCredit
      const net = required - summary.paid
      return {
        ...summary,
        required: Math.max(required, 0),
        remaining: Math.max(net, 0),
        payable: Math.max(-net, 0),
      }
    })
    .sort((a, b) =>
      b.remaining - a.remaining ||
      b.payable - a.payable ||
      playerName(a.playerId).localeCompare(playerName(b.playerId))
    )

  const totalFundDue = playerDebtSummaries.reduce((sum, summary) => sum + summary.fundDue, 0)
  const totalMatchPaid = matchPayments.reduce((sum, payment) => sum + Number(payment.amount), 0)
  const totalWinCredit = playerDebtSummaries.reduce((sum, summary) => sum + summary.winCredit, 0)
  const totalWinnerDue = playerDebtSummaries.reduce((sum, summary) => sum + summary.winnerDue, 0)
  const totalReceivable = playerDebtSummaries.reduce((sum, summary) => sum + summary.remaining, 0)
  const totalPayable = playerDebtSummaries.reduce((sum, summary) => sum + summary.payable, 0)
  const totalManualExpense = fundExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0)
  const cashInHand = totalMatchPaid - totalManualExpense
  const projectedBalance = cashInHand + totalReceivable - totalPayable

  return (
    <div className="mt-4 pb-10 space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <SummaryBox label="Tổng phải đóng" value={fmt(totalFundDue)} tone="amber" />
        <SummaryBox label="Số tiền thắng" value={fmt(totalWinCredit)} tone="emerald" />
        <SummaryBox label="Số tiền thua" value={fmt(totalWinnerDue)} tone="red" />
        <SummaryBox label="Còn lại" value={fmt(totalReceivable)} tone={totalReceivable > 0 ? 'red' : 'emerald'} />
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3 flex items-center justify-between gap-3 shadow-sm">
        <div>
          <p className="text-sm font-semibold text-gray-700">Tiền đang có trong quỹ</p>
          <p className="text-xs text-gray-400 mt-0.5">
            Đã thu {fmt(totalMatchPaid)} · Chi {fmt(totalManualExpense)}
          </p>
        </div>
        <p className={`text-xl font-bold ${cashInHand >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
          {fmt(cashInHand)}
        </p>
      </div>

      <div className="bg-gray-900 text-white rounded-2xl px-4 py-3">
        <div className="flex justify-between items-center gap-3">
          <div>
            <p className="text-sm font-semibold">Số dư sau tất toán</p>
            <p className="text-xs text-gray-300 mt-0.5">
              Sau khi thu phần còn lại và trả phần được nhận
            </p>
          </div>
          <p className={`text-xl font-bold ${projectedBalance >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
            {fmt(projectedBalance)}
          </p>
        </div>
      </div>

      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-700">Tổng hợp người chơi</p>
            <p className="text-xs text-gray-400">
              {playerDebtSummaries.length} người có phát sinh tiền trận hoặc tiền thắng
            </p>
          </div>
        </div>

        {playerDebtSummaries.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <div className="text-4xl mb-2">🏆</div>
            <p className="text-sm">Chưa có trận nào phát sinh tiền thua.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {playerDebtSummaries.map(summary => {
              const summaryPlayer = summary.player
              const remainingLabel = summary.payable > 0 ? `Nhận ${fmt(summary.payable)}` : fmt(summary.remaining)
              const remainingTone = summary.payable > 0 ? 'blue' : summary.remaining > 0 ? 'red' : 'emerald'
              const statusLabel = summary.payable > 0
                ? `Được nhận ${fmt(summary.payable)}`
                : summary.remaining > 0
                  ? `Còn ${fmt(summary.remaining)}`
                  : 'Đã đủ'
              const statusClass = summary.payable > 0
                ? 'bg-blue-50 text-blue-600'
                : summary.remaining > 0
                  ? 'bg-red-50 text-red-600'
                  : 'bg-emerald-50 text-emerald-600'

              return (
                <div key={summary.playerId} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-800 truncate">
                        {summaryPlayer?.name ?? playerName(summary.playerId)}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {summary.matchCount} trận thua
                        {summary.winMatchCount > 0 && ` · ${summary.winMatchCount} trận thắng`}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass}`}>
                      {statusLabel}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    <MoneyMetric label="Tổng phải đóng" value={fmt(summary.fundDue)} tone="amber" />
                    <MoneyMetric label="Số tiền thắng" value={fmt(summary.winCredit)} tone="emerald" />
                    <MoneyMetric label="Số tiền thua" value={fmt(summary.winnerDue)} tone="red" />
                    <MoneyMetric label="Cần đóng" value={fmt(summary.required)} tone="indigo" emphasis />
                    <MoneyMetric label="Đã đóng" value={fmt(summary.paid)} tone="blue" />
                    <MoneyMetric label="Còn lại" value={remainingLabel} tone={remainingTone} emphasis />
                  </div>

                  <div className="mt-3 flex justify-end">
                    {isAdmin && summaryPlayer && summary.remaining > 0 && (
                      <button
                        onClick={() => onCollectMatchPayment({ ...summary, player: summaryPlayer })}
                        className="shrink-0 bg-emerald-500 text-white text-xs px-2.5 py-1.5 rounded-xl hover:bg-emerald-600 active:scale-95 transition-all"
                      >
                        Thu tiền
                      </button>
                    )}
                  </div>

                  {summary.payments.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {summary.payments.map(payment => (
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
            <p className="text-xs text-gray-400">Chi khác: {fmt(totalManualExpense)}</p>
          </div>
          {isAdmin && (
            <button
              onClick={onAddExpense}
              className="bg-red-500 text-white text-xs font-medium px-3 py-2 rounded-xl hover:bg-red-600 active:scale-95 transition-all"
            >
              + Tạo chi
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
  tone: 'emerald' | 'blue' | 'red' | 'amber'
}) {
  const toneClass = {
    emerald: 'text-emerald-700 bg-emerald-50 border-emerald-100',
    blue: 'text-blue-700 bg-blue-50 border-blue-100',
    red: 'text-red-600 bg-red-50 border-red-100',
    amber: 'text-amber-700 bg-amber-50 border-amber-100',
  }[tone]

  return (
    <div className={`rounded-2xl border p-3 ${toneClass}`}>
      <p className="text-xs opacity-75">{label}</p>
      <p className="text-lg font-bold mt-0.5">{value}</p>
    </div>
  )
}

function MoneyMetric({
  label,
  value,
  tone,
  emphasis = false,
}: {
  label: string
  value: string
  tone: 'amber' | 'emerald' | 'red' | 'indigo' | 'blue'
  emphasis?: boolean
}) {
  const toneClass = {
    amber: 'border-amber-100 bg-amber-50 text-amber-700',
    emerald: 'border-emerald-100 bg-emerald-50 text-emerald-700',
    red: 'border-red-100 bg-red-50 text-red-600',
    indigo: 'border-indigo-100 bg-indigo-50 text-indigo-700',
    blue: 'border-blue-100 bg-blue-50 text-blue-700',
  }[tone]

  return (
    <div className={`rounded-xl border px-3 py-2 ${toneClass}`}>
      <p className="text-[11px] font-medium opacity-75">{label}</p>
      <p className={`mt-1 ${emphasis ? 'text-base' : 'text-sm'} font-bold leading-tight`}>
        {value}
      </p>
    </div>
  )
}
