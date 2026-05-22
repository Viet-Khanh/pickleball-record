import { AddPlayerModal } from '@/components/modals/AddPlayerModal'
import { ContributionModal } from '@/components/modals/ContributionModal'
import { EditSessionModal } from '@/components/modals/EditSessionModal'
import { FundExpenseModal } from '@/components/modals/FundExpenseModal'
import { LoginModal } from '@/components/modals/LoginModal'
import { MatchModal } from '@/components/modals/MatchModal'
import {
  MatchPaymentModal,
  type MatchPaymentDebtInput,
} from '@/components/modals/MatchPaymentModal'
import { SessionModal } from '@/components/modals/SessionModal'
import type { Match, Player, Session, SessionPlayer } from '@/lib/types'

export type ActiveModal =
  | { type: 'add-player' }
  | { type: 'contribution'; player: Player }
  | { type: 'session' }
  | { type: 'match' }
  | { type: 'fund-expense' }
  | {
      type: 'match-payment'
      player: Player
      debts: MatchPaymentDebtInput[]
      fundDue: number
      winnerDue: number
      winCredit: number
      required: number
      paid: number
      remaining: number
    }
  | { type: 'edit-session'; session: Session }
  | { type: 'login' }
  | null

type PickleballModalHostProps = {
  activeModal: ActiveModal
  matches: Match[]
  players: Player[]
  sessions: Session[]
  sessionPlayers: SessionPlayer[]
  onClose: () => void
  onError: (message: string) => void
  onLogin: (password: string) => boolean
  onSaved: () => void
}

export function PickleballModalHost({
  activeModal,
  matches,
  players,
  sessions,
  sessionPlayers,
  onClose,
  onError,
  onLogin,
  onSaved,
}: PickleballModalHostProps) {
  if (!activeModal) return null

  if (activeModal.type === 'add-player') {
    return <AddPlayerModal onClose={onClose} onError={onError} onSaved={onSaved} />
  }

  if (activeModal.type === 'contribution') {
    return (
      <ContributionModal
        player={activeModal.player}
        onClose={onClose}
        onError={onError}
        onSaved={onSaved}
      />
    )
  }

  if (activeModal.type === 'session') {
    return (
      <SessionModal
        players={players}
        onClose={onClose}
        onError={onError}
        onSaved={onSaved}
      />
    )
  }

  if (activeModal.type === 'match') {
    return (
      <MatchModal
        matches={matches}
        players={players}
        sessions={sessions}
        onClose={onClose}
        onError={onError}
        onSaved={onSaved}
      />
    )
  }

  if (activeModal.type === 'fund-expense') {
    return <FundExpenseModal onClose={onClose} onError={onError} onSaved={onSaved} />
  }

  if (activeModal.type === 'match-payment') {
    return (
      <MatchPaymentModal
        player={activeModal.player}
        debts={activeModal.debts}
        fundDue={activeModal.fundDue}
        winnerDue={activeModal.winnerDue}
        winCredit={activeModal.winCredit}
        required={activeModal.required}
        paid={activeModal.paid}
        remaining={activeModal.remaining}
        onClose={onClose}
        onError={onError}
        onSaved={onSaved}
      />
    )
  }

  if (activeModal.type === 'edit-session') {
    return (
      <EditSessionModal
        session={activeModal.session}
        players={players}
        sessionPlayers={sessionPlayers}
        onClose={onClose}
        onError={onError}
        onSaved={onSaved}
      />
    )
  }

  if (activeModal.type === 'login') {
    return <LoginModal onClose={onClose} onLogin={onLogin} />
  }

  return null
}
