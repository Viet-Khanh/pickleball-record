import type { Match, Contribution, SessionPlayer } from './types'

export function fmt(n: number) {
  return new Intl.NumberFormat('vi-VN').format(Math.round(n)) + 'đ'
}

export function fmtDate(s: string) {
  const d = new Date(s.length === 10 ? s + 'T00:00:00' : s)
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function toggleItem<T>(arr: T[], id: T): T[] {
  return arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id]
}

export function matchPenalties(pid: string, matches: Match[]) {
  return matches.reduce((s, m) => {
    const losing = m.winner === 'team1' ? m.team2_player_ids : m.team1_player_ids
    return losing.includes(pid) ? s + Number(m.amount) / losing.length : s
  }, 0)
}

export function matchEarnings(pid: string, matches: Match[]) {
  return matches.reduce((s, m) => {
    const winning = m.winner === 'team1' ? m.team1_player_ids : m.team2_player_ids
    return winning.includes(pid) ? s + Number(m.win_amount ?? 0) / winning.length : s
  }, 0)
}

export function getBalance(
  pid: string,
  contributions: Contribution[],
  sessionPlayers: SessionPlayer[],
  matches: Match[]
) {
  const totalIn = contributions
    .filter(c => c.player_id === pid)
    .reduce((s, c) => s + Number(c.amount), 0)
  const totalSessionOut = sessionPlayers
    .filter(sp => sp.player_id === pid)
    .reduce((s, sp) => s + Number(sp.cost_share), 0)
  return totalIn - totalSessionOut - matchPenalties(pid, matches) + matchEarnings(pid, matches)
}

function combinations(arr: number[], k: number): number[][] {
  if (k === 0) return [[]]
  if (arr.length < k) return []
  const [first, ...rest] = arr
  return [
    ...combinations(rest, k - 1).map(c => [first, ...c]),
    ...combinations(rest, k),
  ]
}

export function balancedSplit(playerIds: string[], matches: Match[]): [string[], string[]] {
  const shuffled = [...playerIds].sort(() => Math.random() - 0.5)
  const rates = shuffled.map(id => {
    const won = matches.filter(m =>
      (m.winner === 'team1' ? m.team1_player_ids : m.team2_player_ids).includes(id)
    ).length
    const lost = matches.filter(m =>
      (m.winner === 'team1' ? m.team2_player_ids : m.team1_player_ids).includes(id)
    ).length
    const total = won + lost
    // Small jitter so equal-strength players get randomised across calls
    return { id, rate: (total > 0 ? won / total : 0.5) + Math.random() * 0.001 }
  })

  const half = Math.floor(shuffled.length / 2)
  const indices = Array.from({ length: shuffled.length }, (_, i) => i)
  const combos = combinations(indices, half)

  let best = combos[0]
  let bestDiff = Infinity
  for (const combo of combos) {
    const t1 = combo.reduce((s, i) => s + rates[i].rate, 0)
    const t2 = rates.reduce((s, r, i) => (combo.includes(i) ? s : s + r.rate), 0)
    const diff = Math.abs(t1 - t2)
    if (diff < bestDiff) { bestDiff = diff; best = combo }
  }

  return [best.map(i => shuffled[i]), shuffled.filter((_, i) => !best.includes(i))]
}
