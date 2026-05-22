export type Player = { id: string; name: string; created_at: string }
export type Contribution = { id: string; player_id: string; amount: number; note: string | null; created_at: string }
export type Session = { id: string; date: string; total_cost: number; created_at: string }
export type SessionPlayer = { id: string; session_id: string; player_id: string; cost_share: number }
export type Match = {
  id: string
  session_id: string | null
  team1_player_ids: string[]
  team2_player_ids: string[]
  amount: number
  win_amount: number
  winner: 'team1' | 'team2'
  created_at: string
}
