'use client'

import { useState } from 'react'
import { FundTab } from '@/components/FundTab'
import { MatchesTab } from '@/components/MatchesTab'
import { PickleballHeader } from '@/components/PickleballHeader'
import { PickleballModalHost, type ActiveModal } from '@/components/PickleballModalHost'
import { PickleballTabNav, type PickleballTab } from '@/components/PickleballTabNav'
import { PlayersTab } from '@/components/PlayersTab'
import { SessionsTab } from '@/components/SessionsTab'
import { SetupNotice } from '@/components/SetupNotice'
import { StatsTab } from '@/components/StatsTab'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import { usePickleballData } from '@/hooks/usePickleballData'
import {
  deleteFundExpense,
  deleteMatch,
  deleteMatchPayment,
  toErrorMessage,
} from '@/lib/pickleball-api'

const hasSupabaseConfig = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export function PickleballApp() {
  if (!hasSupabaseConfig) {
    return <SetupNotice />
  }

  return <PickleballClientApp />
}

function PickleballClientApp() {
  const [tab, setTab] = useState<PickleballTab>('players')
  const [activeModal, setActiveModal] = useState<ActiveModal>(null)
  const {
    players,
    contributions,
    sessions,
    sessionPlayers,
    matches,
    fundExpenses,
    matchPayments,
    loading,
    error,
    setError,
    refresh,
  } = usePickleballData()
  const { isAdmin, login, logout } = useAdminAuth()

  async function handleDeleteMatch(id: string) {
    if (!confirm('Xóa trận đấu này? Các khoản thu tiền thua liên quan cũng sẽ bị xóa.')) return

    try {
      await deleteMatch(id)
      refresh()
    } catch (deleteError) {
      setError(toErrorMessage(deleteError))
    }
  }

  async function handleDeleteFundExpense(id: string) {
    if (!confirm('Xóa khoản chi này?')) return

    try {
      await deleteFundExpense(id)
      refresh()
    } catch (deleteError) {
      setError(toErrorMessage(deleteError))
    }
  }

  async function handleDeleteMatchPayment(id: string) {
    if (!confirm('Xóa khoản thu tiền thua này?')) return

    try {
      await deleteMatchPayment(id)
      refresh()
    } catch (deleteError) {
      setError(toErrorMessage(deleteError))
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PickleballHeader
        isAdmin={isAdmin}
        onLoginClick={() => setActiveModal({ type: 'login' })}
        onLogout={logout}
      />

      <div className="max-w-2xl mx-auto px-4 pt-4">
        <PickleballTabNav activeTab={tab} onTabChange={setTab} />

        {error && (
          <div className="mt-3 bg-red-50 text-red-700 px-4 py-2.5 rounded-xl text-sm flex justify-between items-center">
            <span>{error}</span>
            <button
              onClick={() => setError('')}
              className="ml-2 text-red-400 hover:text-red-600"
            >
              ✕
            </button>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="text-gray-400 text-sm animate-pulse">Đang tải dữ liệu...</div>
          </div>
        )}

        {!loading && tab === 'players' && (
          <PlayersTab
            players={players}
            contributions={contributions}
            sessionPlayers={sessionPlayers}
            isAdmin={isAdmin}
            onAddPlayer={() => setActiveModal({ type: 'add-player' })}
            onContrib={player => setActiveModal({ type: 'contribution', player })}
          />
        )}

        {!loading && tab === 'sessions' && (
          <SessionsTab
            sessions={sessions}
            sessionPlayers={sessionPlayers}
            players={players}
            isAdmin={isAdmin}
            onNewSession={() => setActiveModal({ type: 'session' })}
            onEditSession={session => setActiveModal({ type: 'edit-session', session })}
          />
        )}

        {!loading && tab === 'matches' && (
          <MatchesTab
            matches={matches}
            sessions={sessions}
            players={players}
            isAdmin={isAdmin}
            onNewMatch={() => setActiveModal({ type: 'match' })}
            onDeleteMatch={handleDeleteMatch}
          />
        )}

        {!loading && tab === 'fund' && (
          <FundTab
            fundExpenses={fundExpenses}
            matches={matches}
            matchPayments={matchPayments}
            players={players}
            sessions={sessions}
            isAdmin={isAdmin}
            onAddExpense={() => setActiveModal({ type: 'fund-expense' })}
            onCollectMatchPayment={debt =>
              setActiveModal({
                type: 'match-payment',
                player: debt.player,
                debts: debt.debts.map(item => ({
                  match: item.match,
                  due: item.due,
                  paid: item.paid,
                  remaining: item.remaining,
                  matchDate: item.matchDate,
                })),
                due: debt.due,
                paid: debt.paid,
                remaining: debt.remaining,
              })
            }
            onDeleteExpense={handleDeleteFundExpense}
            onDeleteMatchPayment={handleDeleteMatchPayment}
          />
        )}

        {!loading && tab === 'stats' && (
          <StatsTab
            matches={matches}
            sessions={sessions}
            players={players}
            sessionPlayers={sessionPlayers}
          />
        )}
      </div>

      <PickleballModalHost
        activeModal={activeModal}
        matches={matches}
        players={players}
        sessions={sessions}
        sessionPlayers={sessionPlayers}
        onClose={() => setActiveModal(null)}
        onError={setError}
        onLogin={login}
        onSaved={refresh}
      />
    </div>
  )
}
