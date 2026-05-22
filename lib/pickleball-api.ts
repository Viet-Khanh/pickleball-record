import { db } from '@/lib/supabase'
import type {
  Contribution,
  FundExpense,
  Match,
  MatchPayment,
  Player,
  Session,
  SessionPlayer,
} from '@/lib/types'

export type PickleballData = {
  players: Player[]
  contributions: Contribution[]
  sessions: Session[]
  sessionPlayers: SessionPlayer[]
  matches: Match[]
  fundExpenses: FundExpense[]
  matchPayments: MatchPayment[]
}

export type PickleballDataResult = PickleballData & {
  errorMessage: string
}

export type CreateMatchInput = {
  sessionId: string | null
  team1PlayerIds: string[]
  team2PlayerIds: string[]
  amount: number
  winAmount: number
  winner: Match['winner']
}

export type CreateFundExpenseInput = {
  amount: number
  note: string
  spentAt: string
}

export type CreateMatchPaymentInput = {
  matchId: string
  playerId: string
  amount: number
  paidAt: string
  note: string | null
}

export function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Đã xảy ra lỗi'
}

export async function fetchPickleballData(): Promise<PickleballDataResult> {
  const [
    players,
    contributions,
    sessions,
    sessionPlayers,
    matches,
    fundExpenses,
    matchPayments,
  ] = await Promise.all([
    db().from('players').select('*').order('name'),
    db().from('fund_contributions').select('*').order('created_at', { ascending: false }),
    db().from('sessions').select('*').order('date', { ascending: false }),
    db().from('session_players').select('*'),
    db().from('matches').select('*').order('created_at', { ascending: false }),
    db().from('fund_expenses').select('*').order('spent_at', { ascending: false }),
    db().from('match_payments').select('*').order('paid_at', { ascending: false }),
  ])

  const firstError = [
    players,
    contributions,
    sessions,
    sessionPlayers,
    matches,
    fundExpenses,
    matchPayments,
  ].find(response => response.error)?.error

  return {
    players: players.data ?? [],
    contributions: contributions.data ?? [],
    sessions: sessions.data ?? [],
    sessionPlayers: sessionPlayers.data ?? [],
    matches: matches.data ?? [],
    fundExpenses: fundExpenses.data ?? [],
    matchPayments: matchPayments.data ?? [],
    errorMessage: firstError ? 'Lỗi kết nối: ' + firstError.message : '',
  }
}

export async function createPlayer(name: string) {
  const { error } = await db().from('players').insert({ name })
  if (error) throw new Error(error.message)
}

export async function createContribution(playerId: string, amount: number, note: string | null) {
  const { error } = await db().from('fund_contributions').insert({
    player_id: playerId,
    amount,
    note,
  })
  if (error) throw new Error(error.message)
}

export async function createSession(date: string, totalCost: number, playerIds: string[]) {
  const costShare = totalCost / playerIds.length
  const { data: session, error: createError } = await db()
    .from('sessions')
    .insert({ date, total_cost: totalCost })
    .select()
    .single()

  if (createError || !session) {
    throw new Error(createError?.message ?? 'Lỗi tạo buổi')
  }

  const { error: playerError } = await db().from('session_players').insert(
    playerIds.map(playerId => ({
      session_id: session.id,
      player_id: playerId,
      cost_share: costShare,
    }))
  )

  if (playerError) throw new Error(playerError.message)
}

export async function createMatch(input: CreateMatchInput) {
  const { error } = await db().from('matches').insert({
    session_id: input.sessionId,
    team1_player_ids: input.team1PlayerIds,
    team2_player_ids: input.team2PlayerIds,
    amount: input.amount,
    win_amount: input.winAmount,
    winner: input.winner,
  })

  if (error) throw new Error(error.message)
}

export async function deleteMatch(id: string) {
  const { error } = await db().from('matches').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function updateSessionCost(sessionId: string, totalCost: number, attendeeCount: number) {
  const { error: sessionError } = await db()
    .from('sessions')
    .update({ total_cost: totalCost })
    .eq('id', sessionId)

  if (sessionError) throw new Error(sessionError.message)

  if (attendeeCount === 0) return

  const { error: playerError } = await db()
    .from('session_players')
    .update({ cost_share: totalCost / attendeeCount })
    .eq('session_id', sessionId)

  if (playerError) throw new Error(playerError.message)
}

export async function createFundExpense(input: CreateFundExpenseInput) {
  const { error } = await db().from('fund_expenses').insert({
    amount: input.amount,
    note: input.note,
    spent_at: input.spentAt,
  })

  if (error) throw new Error(error.message)
}

export async function deleteFundExpense(id: string) {
  const { error } = await db().from('fund_expenses').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function createMatchPayment(input: CreateMatchPaymentInput) {
  const { error } = await db().from('match_payments').insert({
    match_id: input.matchId,
    player_id: input.playerId,
    amount: input.amount,
    paid_at: input.paidAt,
    note: input.note,
  })

  if (error) throw new Error(error.message)
}

export async function deleteMatchPayment(id: string) {
  const { error } = await db().from('match_payments').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
