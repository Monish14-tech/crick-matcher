"use client"

import { useEffect, useState, use } from "react"
import { Calendar, MapPin, Clock, ArrowLeft, Trophy, Users, Shield, Zap, TrendingUp, Activity, Target, History, ChevronRight, Award, BarChart3, PieChart, Swords, Flag, CheckCircle2, ChevronDown } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import { SupabaseError } from "@/components/SupabaseError"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { BallByBallTicker } from "@/components/BallByBallTicker"
import { motion, AnimatePresence } from "framer-motion"

// --- TYPES ---
interface Team {
    id: string
    name: string
    captain_name: string
    logo_url?: string
}

interface MatchScore {
    team_id: string
    runs_scored: number
    wickets_lost: number
    overs_played: number // This stores it as X.Y
    is_first_innings: boolean
}

interface Match {
    id: string
    match_date: string
    match_time: string
    overs_type: string
    status: string
    winner_id?: string
    toss_winner_id?: string
    team_a_id: string
    team_b_id: string
    team_a: Team
    team_b: Team
    ground: { name: string; location: string }
}

interface MatchEvent {
    id: string
    match_id: string
    innings_no: number
    batter_id: string
    bowler_id: string
    runs_batter: number
    runs_extras: number
    extra_type: string
    wicket_type?: string
    player_out_id?: string
    is_legal_ball: boolean
    created_at: string
}

interface Player {
    id: string
    name: string
    team_id: string
    role?: string
}

// --- UTILS ---
const formatOvers = (balls: number) => {
    return Math.floor(balls / 6) + "." + (balls % 6)
}

const getBallsFromDecimal = (decimal: number) => {
    const overInt = Math.floor(decimal)
    const ballInt = Math.round((decimal - overInt) * 10)
    return (overInt * 6) + ballInt
}

export default function MatchDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    if (!supabase) return <SupabaseError />
    const { id } = use(params)

    const [match, setMatch] = useState<Match | null>(null)
    const [scores, setScores] = useState<MatchScore[]>([])
    const [events, setEvents] = useState<MatchEvent[]>([])
    const [players, setPlayers] = useState<Player[]>([])
    const [activeState, setActiveState] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    const fetchData = async (isInitial = false) => {
        if (isInitial) setLoading(true)
        try {
            const { data: m } = await supabase.from('matches').select('*, team_a:teams!team_a_id(*), team_b:teams!team_b_id(*), ground:grounds(*)').eq('id', id).single()
            if (m) setMatch(m)

            const { data: s } = await supabase.from('match_scores').select('*').eq('match_id', id)
            setScores(s || [])

            const { data: e } = await supabase.from('match_events').select('*').eq('match_id', id).order('created_at', { ascending: true })
            setEvents(e || [])

            const { data: p } = await supabase.from('players').select('*').in('team_id', [m?.team_a_id, m?.team_b_id])
            setPlayers(p || [])

            const { data: ast } = await supabase.from('match_active_state').select('*').eq('match_id', id).single()
            setActiveState(ast || null)
        } catch (err) { console.error(err) }
        setLoading(false)
    }

    useEffect(() => {
        fetchData(true)
        const matchChannel = supabase.channel(`match-updates-${id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'matches', filter: `id=eq.${id}` }, () => fetchData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'match_scores', filter: `match_id=eq.${id}` }, () => fetchData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'match_events', filter: `match_id=eq.${id}` }, () => fetchData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'match_active_state', filter: `match_id=eq.${id}` }, () => fetchData())
            .subscribe()

        const interval = setInterval(() => fetchData(), 2000)
        return () => {
            supabase.removeChannel(matchChannel)
            clearInterval(interval)
        }
    }, [id])

    if (loading || !match) return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-6">
            <div className="relative w-24 h-24">
                <div className="absolute inset-0 border-4 border-primary/20 rounded-full" />
                <div className="absolute inset-0 border-4 border-primary rounded-full border-t-transparent animate-spin" />
                <Trophy className="absolute inset-0 m-auto h-8 w-8 text-primary animate-pulse" />
            </div>
            <p className="text-sm font-black uppercase tracking-[0.4em] text-slate-500 animate-pulse">Syncing Arena...</p>
        </div>
    )

    const firstInningsScore = scores.find(s => s.is_first_innings)
    const currentTarget = firstInningsScore ? firstInningsScore.runs_scored + 1 : null
    const currentInningsNo = activeState?.innings_no || (events.length > 0 ? events[events.length - 1].innings_no : 1)
    const currentInningsEvents = events.filter(e => e.innings_no === currentInningsNo)

    const oversCap = parseInt(match.overs_type.match(/(\d+)/)?.[0] || "20")
    const maxMatchBalls = oversCap * 6
    const liveRuns = currentInningsEvents.reduce((sum, e) => sum + (e.runs_batter || 0) + (e.runs_extras || 0), 0)
    const liveWickets = currentInningsEvents.filter(e => e.wicket_type).length
    const rawLiveBalls = currentInningsEvents.filter(e => !['NO_BALL', 'No Ball', 'WIDE', 'Wide'].includes(e.extra_type)).length
    const liveBalls = Math.min(rawLiveBalls, maxMatchBalls)
    const liveOvers = Math.floor(liveBalls / 6) + (liveBalls % 6) / 10

    const getTeamScore = (teamId: string): MatchScore | undefined => {
        const dbScore = scores.find(s => s.team_id === teamId)
        if (match.status === 'Live' && activeState?.batting_team_id === teamId) {
            return {
                team_id: teamId,
                runs_scored: liveRuns,
                wickets_lost: liveWickets,
                overs_played: liveOvers,
                is_first_innings: dbScore?.is_first_innings ?? (activeState.innings_no === 1)
            }
        }
        return dbScore
    }

    const teamAScore = getTeamScore(match.team_a.id)
    const teamBScore = getTeamScore(match.team_b.id)

    let resultMessage = ""
    let winnerName = ""
    if (match.status === 'Completed') {
        const firstInnings = scores.find(s => s.is_first_innings)
        const secondInnings = scores.find(s => !s.is_first_innings)
        if (!match.winner_id && firstInnings && secondInnings) {
            if (firstInnings.runs_scored > secondInnings.runs_scored) (match as any).winner_id = firstInnings.team_id
            else if (secondInnings.runs_scored > firstInnings.runs_scored) (match as any).winner_id = secondInnings.team_id
        }

        if (firstInnings && secondInnings && match.winner_id) {
            const winnerTeam = match.winner_id === match.team_a_id ? match.team_a : match.team_b
            winnerName = winnerTeam.name
            const winnerBattedFirst = (firstInnings.team_id === match.winner_id)
            if (winnerBattedFirst) {
                const runMargin = firstInnings.runs_scored - secondInnings.runs_scored
                resultMessage = `${winnerName} won by ${runMargin} runs`
            } else {
                const winningTeamPlayers = players.filter(p => p.team_id === match.winner_id)
                const totalWicketsAvailable = Math.max(10, winningTeamPlayers.length > 0 ? winningTeamPlayers.length - 1 : 10)
                const wicketsRemaining = totalWicketsAvailable - secondInnings.wickets_lost
                resultMessage = `${winnerName} won by ${wicketsRemaining} wickets`
            }
        } else if (firstInnings && secondInnings && !match.winner_id) {
            winnerName = "TIED"
            resultMessage = "Scores Level"
        }
    } else if (match.status === 'Live') {
        resultMessage = `Innings ${currentInningsNo} in Progress`
    } else {
        resultMessage = "Ready for Toss"
    }

    const getTeamStats = (teamId: string) => {
        const teamScore = scores.find(s => s.team_id === teamId)
        const teamEvents = events.filter(e => {
            const batter = players.find(p => p.id === e.batter_id)
            return batter?.team_id === teamId
        })
        const runs = teamScore?.runs_scored || 0
        const wickets = teamScore?.wickets_lost || 0
        const fours = teamEvents.filter(e => e.runs_batter === 4).length
        const sixes = teamEvents.filter(e => e.runs_batter === 6).length
        const balls = getBallsFromDecimal(teamScore?.overs_played || 0)
        const runRate = balls > 0 ? (runs / (balls / 6)).toFixed(2) : "0.00"
        return { runs, wickets, boundaries: fours + sixes, runRate, fours, sixes }
    }

    const teamAStats = getTeamStats(match.team_a.id)
    const teamBStats = getTeamStats(match.team_b.id)

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-primary/30 antialiased overflow-x-hidden">
            {/* Cinematic Hero Section */}
            <div className="relative pt-20 sm:pt-24 md:pt-32 pb-32 sm:pb-40 md:pb-48 px-4 sm:px-6 overflow-hidden">
                {/* Dynamic Background Elements */}
                <div className="absolute top-0 right-0 w-[300px] sm:w-[400px] md:w-[500px] h-[300px] sm:h-[400px] md:h-[500px] bg-primary/10 rounded-full blur-[120px] -mr-64 -mt-32" />
                <div className="absolute bottom-0 left-0 w-[300px] sm:w-[400px] md:w-[500px] h-[300px] sm:h-[400px] md:h-[500px] bg-indigo-500/10 rounded-full blur-[120px] -ml-64 -mb-32" />

                <div className="max-w-7xl mx-auto relative z-10">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                    >
                        <Link href="/schedule" className="group text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] sm:tracking-[0.4em] text-slate-500 hover:text-white transition-all flex items-center gap-2 sm:gap-3 mb-8 sm:mb-12">
                            <div className="h-5 w-5 sm:h-6 sm:w-6 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-primary transition-all">
                                <ArrowLeft className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                            </div>
                            Exit to Schedule
                        </Link>
                    </motion.div>

                    <div className="grid lg:grid-cols-[1fr_400px] gap-8 sm:gap-10 md:gap-12 items-center">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-center lg:text-left"
                        >
                            <div className="flex items-center justify-center lg:justify-start gap-2 sm:gap-3 mb-4 sm:mb-6">
                                <span className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-primary animate-pulse shadow-[0_0_15px_theme(colors.primary)]" />
                                <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.4em] sm:tracking-[0.5em] text-slate-400">Match Centre Live</span>
                            </div>
                            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-8xl font-black italic tracking-tighter uppercase leading-[0.85] mb-6 sm:mb-8">
                                <span className="text-white drop-shadow-2xl">Precision</span> <br />
                                <span className="text-gradient-primary">Intelligence</span>
                            </h1>
                            <div className="flex flex-wrap justify-center lg:justify-start gap-3 sm:gap-4">
                                <div className="px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 md:py-3 bg-white/5 backdrop-blur-xl rounded-xl sm:rounded-2xl border border-white/10 flex items-center gap-2 sm:gap-3 group hover:border-primary/50 transition-all">
                                    <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                                    <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider sm:tracking-widest text-slate-200">{(match as any).overs_type} PRO SERIES</span>
                                </div>
                                <div className="px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 md:py-3 bg-white/5 backdrop-blur-xl rounded-xl sm:rounded-2xl border border-white/10 flex items-center gap-2 sm:gap-3">
                                    <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                                    <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider sm:tracking-widest text-slate-200">{match.ground?.name || "The Arena"}</span>
                                </div>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 40 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                        >
                            <Card className="glass-card border-white/10 p-6 sm:p-8 md:p-10 rounded-2xl sm:rounded-3xl md:rounded-[3rem] shadow-2xl relative overflow-hidden group">
                                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                                {match.status === 'Completed' ? (
                                    <div className="text-center relative z-10">
                                        <div className="h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 bg-primary/20 rounded-2xl sm:rounded-3xl flex items-center justify-center mx-auto mb-4 sm:mb-6 border border-primary/20">
                                            <Trophy className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-primary" />
                                        </div>
                                        <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] sm:tracking-[0.4em] text-primary mb-1 sm:mb-2">Final Verdict</p>
                                        <h2 className="text-3xl sm:text-4xl font-black italic uppercase tracking-tighter text-white mb-2 sm:mb-3">{winnerName}</h2>
                                        <p className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-widest leading-relaxed px-2 sm:px-4">{resultMessage}</p>
                                    </div>
                                ) : (
                                    <div className="space-y-6 sm:space-y-8 md:space-y-10 relative z-10">
                                        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 sm:gap-8">
                                            <div className="text-center flex-1">
                                                <p className="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 sm:mb-3 truncate">{match.team_a.name}</p>
                                                <p className="text-4xl sm:text-5xl font-black italic tracking-tighter text-white">{teamAScore?.runs_scored || 0}<span className="text-xl sm:text-2xl text-slate-700 mx-1">/</span>{teamAScore?.wickets_lost || 0}</p>
                                            </div>
                                            <div className="h-px w-6 sm:w-8 bg-white/5" />
                                            <div className="text-center flex-1">
                                                <p className="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 sm:mb-3 truncate">{match.team_b.name}</p>
                                                <p className="text-4xl sm:text-5xl font-black italic tracking-tighter text-white">{teamBScore?.runs_scored || 0}<span className="text-xl sm:text-2xl text-slate-700 mx-1">/</span>{teamBScore?.wickets_lost || 0}</p>
                                            </div>
                                        </div>

                                        {match.status === 'Live' && (
                                            <div className="space-y-3 pt-4 border-t border-white/5">
                                                <div className="flex justify-between items-end">
                                                    <span className="text-[9px] font-black uppercase text-primary tracking-widest">{match.team_a.name.slice(0, 3)} Win Prob</span>
                                                    <span className="text-xl font-black italic text-white tracking-tighter">64%</span>
                                                </div>
                                                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden flex">
                                                    <div className="h-full bg-primary" style={{ width: '64%' }} />
                                                    <div className="h-full bg-slate-800" style={{ width: '36%' }} />
                                                </div>
                                            </div>
                                        )}

                                        <div className="pt-6 text-center">
                                            <p className="text-[10px] font-black text-primary uppercase tracking-[0.4em] mb-1">Current State</p>
                                            <p className="text-xs font-black text-slate-400 tracking-widest">{resultMessage}</p>
                                        </div>
                                    </div>
                                )}
                            </Card>
                        </motion.div>
                    </div>
                </div>
            </div>

            {/* Most Impactful Players (Post-Match Overlay) */}
            {(match as any).status === 'Completed' && (() => {
                const { topBatter, topBowler } = calculateImpactPlayers(events, players);
                return (
                    <div className="max-w-7xl mx-auto px-4 -mt-24 mb-24 relative z-20">
                        <div className="grid md:grid-cols-2 gap-6">
                            {topBatter && (
                                <ImpactPlayerCardPremium
                                    player={topBatter}
                                    type="Dominant Batter"
                                    icon={<Zap className="h-6 w-6 text-primary" />}
                                    theme="primary"
                                />
                            )}
                            {topBowler && (
                                <ImpactPlayerCardPremium
                                    player={topBowler}
                                    type="Elite Bowler"
                                    icon={<Target className="h-6 w-6 text-emerald-400" />}
                                    theme="emerald"
                                />
                            )}
                        </div>
                    </div>
                );
            })()}

            {/* Ball by Ball Ticker (Broadcasting Feed) */}
            {(match as any).status === 'Live' && (
                <div className="max-w-7xl mx-auto px-4 -mt-12 mb-16 relative z-30">
                    <div className="glass-card-dark border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl">
                        <div className="bg-white/5 px-8 py-3 border-b border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Activity className="h-4 w-4 text-primary animate-pulse" />
                                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Broadcasting Feed</span>
                            </div>
                            <Link href={`/matches/${id}/logs`} className="text-[9px] font-black uppercase tracking-widest text-primary hover:text-white transition-all flex items-center gap-2 group">
                                View Full History <ChevronRight className="h-3 w-3 group-hover:translate-x-1 transition-all" />
                            </Link>
                        </div>
                        <BallByBallTicker matchId={id} />
                    </div>
                </div>
            )}

            <div className="max-w-7xl mx-auto px-4 space-y-24 pb-32">
                {/* Result Summary Table (Pro Sports Layout) */}
                {(match as any).status === 'Completed' && (
                    <div className="space-y-8">
                        <div className="flex items-center gap-4">
                            <div className="h-px flex-1 bg-white/5" />
                            <Link href={`/matches/${id}/logs`} className="flex items-center gap-3 group">
                                <h2 className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-500 group-hover:text-primary transition-colors">Battle Summary & Logs</h2>
                                <ChevronRight className="h-3 w-3 text-slate-500 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                            </Link>
                            <div className="h-px flex-1 bg-white/5" />
                        </div>

                        <Card className="glass-card-dark border-white/5 shadow-2xl rounded-[3rem] overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-white/5 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 border-b border-white/5">
                                            <th className="px-10 py-6 text-left">Franchise</th>
                                            <th className="px-10 py-6 text-center">Scoreboard</th>
                                            <th className="px-10 py-6 text-center">Resources Used</th>
                                            <th className="px-10 py-6 text-right">Placement</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/2">
                                        {[
                                            { team: (match as any).team_a, score: teamAScore, isWin: (match as any).winner_id === (match as any).team_a.id },
                                            { team: (match as any).team_b, score: teamBScore, isWin: (match as any).winner_id === (match as any).team_b.id }
                                        ].map((row, idx) => (
                                            <tr key={idx} className={cn("group transition-all", row.isWin && "bg-primary/5")}>
                                                <td className="px-10 py-10">
                                                    <div className="flex items-center gap-6">
                                                        <div className={cn("h-12 w-1.5 rounded-full", row.isWin ? "bg-primary shadow-[0_0_15px_theme(colors.primary)]" : "bg-slate-800")} />
                                                        <span className="text-3xl font-black italic uppercase tracking-tighter text-white group-hover:text-primary transition-colors">{row.team.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-10 py-10 text-center">
                                                    <span className="text-4xl font-black text-white italic tracking-tighter">
                                                        {row.score?.runs_scored || 0}<span className="text-xl text-slate-700 mx-1">/</span>{row.score?.wickets_lost || 0}
                                                    </span>
                                                </td>
                                                <td className="px-10 py-10 text-center">
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-lg font-black text-slate-300 font-mono italic">{formatOvers(getBallsFromDecimal(row.score?.overs_played || 0))}</span>
                                                        <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest mt-1">Overs</span>
                                                    </div>
                                                </td>
                                                <td className="px-10 py-10 text-right">
                                                    <div className={cn(
                                                        "inline-flex items-center gap-3 px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] border transition-all",
                                                        row.isWin
                                                            ? "bg-primary/20 border-primary text-primary shadow-[0_0_20px_rgba(37,99,235,0.3)]"
                                                            : "bg-white/5 border-white/10 text-slate-500"
                                                    )}>
                                                        {row.isWin ? <Trophy className="h-4 w-4" /> : <Award className="h-4 w-4" />}
                                                        {row.isWin ? "Champion" : "Runner Up"}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </div>
                )}

                {/* Performance Analytics Dashboard */}
                <div className="grid lg:grid-cols-2 gap-12">
                    <TeamDashboard
                        team={(match as any).team_a}
                        score={teamAScore}
                        stats={teamAStats}
                        isWinner={(match as any).winner_id === match.team_a_id}
                        isLive={activeState?.batting_team_id === match.team_a_id && match.status === 'Live'}
                        target={(!teamAScore?.is_first_innings && currentTarget) ? currentTarget : null}
                    />
                    <TeamDashboard
                        team={(match as any).team_b}
                        score={teamBScore}
                        stats={teamBStats}
                        isWinner={(match as any).winner_id === match.team_b_id}
                        isLive={activeState?.batting_team_id === match.team_b_id && match.status === 'Live'}
                        target={(!teamBScore?.is_first_innings && currentTarget) ? currentTarget : null}
                    />
                </div>

                {/* Detailed Performance Sections */}
                <div className="space-y-16">
                    <InningsScorecard inningsNo={1} team={(match as any).team_a} events={events} players={players} />
                    <InningsScorecard inningsNo={2} team={(match as any).team_b} events={events} players={players} />
                </div>
            </div>
        </div>
    )
}

function TeamDashboard({ team, score, stats, isWinner, isLive, target }: {
    team: Team,
    score: MatchScore | undefined,
    stats: { runs: number, wickets: number, boundaries: number, runRate: string, fours: number, sixes: number },
    isWinner: boolean,
    isLive: boolean,
    target: number | null
}) {
    return (
        <Card className={cn(
            "glass-card-dark border-white/5 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden group",
            isLive && "border-primary/50 shadow-primary/20 scale-[1.02]"
        )}>
            {isWinner && (
                <div className="absolute top-0 right-10 bg-primary text-white px-6 py-2 rounded-b-2xl shadow-xl z-20">
                    <Trophy className="h-4 w-4" />
                </div>
            )}

            <div className="relative z-10 space-y-10">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary mb-2">Competing Franchise</p>
                        <h3 className="text-4xl font-black italic uppercase tracking-tighter text-white">{team.name}</h3>
                    </div>
                    <div className="text-right">
                        <p className="text-5xl font-black italic tracking-tighter text-white">
                            {score?.runs_scored || 0}<span className="text-2xl text-slate-700 mx-1">/</span>{score?.wickets_lost || 0}
                        </p>
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">
                            {formatOvers(getBallsFromDecimal(score?.overs_played || 0))} Overs
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <StatBoxPremium label="Total Runs" value={stats.runs} icon={<Zap className="h-4 w-4 text-primary" />} />
                    <StatBoxPremium label="Run Rate" value={stats.runRate} icon={<Activity className="h-4 w-4 text-primary" />} />
                    <StatBoxPremium label="Boundaries" value={stats.boundaries} icon={<Swords className="h-4 w-4 text-primary" />} />
                    <StatBoxPremium label="Wickets" value={stats.wickets} icon={<Award className="h-4 w-4 text-primary" />} />
                </div>

                {isLive && target && (
                    <div className="bg-primary/10 border border-primary/20 p-5 rounded-2xl flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary">Target to Chase</span>
                        <span className="text-xl font-black italic text-white tracking-tighter">{target} Runs</span>
                    </div>
                )}
            </div>
        </Card>
    )
}

function StatBoxPremium({ label, value, icon }: { label: string, value: string | number, icon: React.ReactNode }) {
    return (
        <div className="bg-white/5 border border-white/5 p-5 rounded-2xl group hover:border-primary/50 transition-all">
            <div className="flex items-center gap-3 mb-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    {icon}
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">{label}</span>
            </div>
            <p className="text-2xl font-black italic text-white tracking-tighter">{value}</p>
        </div>
    )
}

function ImpactPlayerCardPremium({ player, type, icon, theme }: { player: any, type: string, icon: React.ReactNode, theme: 'primary' | 'emerald' }) {
    return (
        <div className="glass-card-dark border-white/5 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
            <div className={cn(
                "absolute top-0 right-0 w-32 h-32 rounded-full -mr-16 -mt-16 blur-3xl opacity-20",
                theme === 'primary' ? "bg-primary" : "bg-emerald-400"
            )} />
            <div className="flex items-center gap-6 relative z-10">
                <div className="h-20 w-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center">
                    {icon}
                </div>
                <div>
                    <p className={cn(
                        "text-[10px] font-black uppercase tracking-[0.4em] mb-1",
                        theme === 'primary' ? "text-primary" : "text-emerald-400"
                    )}>{type}</p>
                    <h3 className="text-3xl font-black italic uppercase tracking-tighter text-white mb-2">{player.name}</h3>
                    <p className="text-lg font-black italic text-slate-500">
                        {theme === 'primary'
                            ? `${player.R} Runs (${player.B} Balls)`
                            : `${player.W} Wickets (${player.R} Runs)`}
                    </p>
                </div>
            </div>
        </div>
    )
}

function InningsScorecard({ inningsNo, team, events, players }: { inningsNo: number, team: Team, events: MatchEvent[], players: Player[] }) {
    const inningsEvents = events.filter((e: any) => e.innings_no === inningsNo)
    const runs = inningsEvents.reduce((sum: number, e: any) => sum + (e.runs_batter || 0) + (e.runs_extras || 0), 0)
    const wickets = inningsEvents.filter((e: any) => e.wicket_type).length
    const balls = inningsEvents.filter((e: any) => !['NO_BALL', 'No Ball', 'WIDE', 'Wide'].includes(e.extra_type)).length

    if (inningsEvents.length === 0) return null

    const batterStats: any = {}
    inningsEvents.forEach((e: any) => {
        if (!e.batter_id) return
        if (!batterStats[e.batter_id]) {
            batterStats[e.batter_id] = { name: players.find((p: any) => p.id === e.batter_id)?.name, R: 0, B: 0, fours: 0, sixes: 0, status: "not out" }
        }
        if (e.extra_type !== "WIDE" && e.extra_type !== "BYE" && e.extra_type !== "LEG_BYE") {
            if (!e.extra_type || e.extra_type === "RUN" || e.extra_type === "NO_BALL") {
                batterStats[e.batter_id].B += 1
            }
        }
        if (isFinite(e.runs_batter)) batterStats[e.batter_id].R += e.runs_batter
        if (e.runs_batter === 4) batterStats[e.batter_id].fours += 1
        if (e.runs_batter === 6) batterStats[e.batter_id].sixes += 1
        if (e.wicket_type && e.player_out_id === e.batter_id) batterStats[e.batter_id].status = "out"
    })

    const bowlerStats: any = {}
    inningsEvents.forEach((e: any) => {
        if (!e.bowler_id) return
        if (!bowlerStats[e.bowler_id]) {
            bowlerStats[e.bowler_id] = { name: players.find((p: any) => p.id === e.bowler_id)?.name, B: 0, R: 0, W: 0 }
        }
        if (!['WIDE', 'Wide', 'NO_BALL', 'No Ball'].includes(e.extra_type)) {
            bowlerStats[e.bowler_id].B += 1
        }
        bowlerStats[e.bowler_id].R += (e.runs_batter + (['WIDE', 'Wide', 'NO_BALL', 'No Ball'].includes(e.extra_type) ? e.runs_extras : 0))
        if (e.wicket_type) bowlerStats[e.bowler_id].W += 1
    })

    const fow: any[] = []
    let currentScore = 0
    let currentWickets = 0
    inningsEvents.forEach((e: any) => {
        currentScore += (e.runs_batter + e.runs_extras)
        if (e.wicket_type) {
            currentWickets++
            fow.push({ score: currentScore, wicket: currentWickets, player: players.find((p: any) => p.id === e.player_out_id)?.name })
        }
    })

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between px-4">
                <div className="flex items-center gap-6">
                    <div className="h-16 w-1 rounded-full bg-primary" />
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 mb-1">Innings {inningsNo} Statistics</p>
                        <h2 className="text-4xl font-black italic uppercase tracking-tighter text-white">{team.name}</h2>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-5xl font-black italic tracking-tighter text-white">
                        {runs}<span className="text-2xl text-slate-700 mx-1">/</span>{wickets}
                    </div>
                </div>
            </div>

            <Card className="glass-card-dark border-white/5 rounded-[3rem] overflow-hidden shadow-2xl">
                <div className="p-10 space-y-16">
                    {/* Batting Scorecard */}
                    <div className="space-y-8">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-3">
                            <Zap className="h-4 w-4" /> Batting Intelligence
                        </h4>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 border-b border-white/5">
                                        <th className="pb-6 text-left">Batter</th>
                                        <th className="pb-6 text-center">Runs</th>
                                        <th className="pb-6 text-center">Balls</th>
                                        <th className="pb-6 text-center">4s</th>
                                        <th className="pb-6 text-center">6s</th>
                                        <th className="pb-6 text-right">S/R</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/2">
                                    {(Object.values(batterStats) as any[]).map((b: { name: string; R: number; B: number; fours: number; sixes: number; status: string }, idx: number) => (
                                        <tr key={idx} className="group hover:bg-white/2 transition-colors">
                                            <td className="py-8">
                                                <div className="flex items-center gap-4">
                                                    <div className={cn("h-4 w-1 rounded-full", b.status === "out" ? "bg-red-500" : "bg-emerald-500")} />
                                                    <span className="font-black text-white text-xl tracking-tight italic uppercase">{b.name}</span>
                                                    {b.status === "out" && <span className="text-[9px] font-black uppercase bg-red-500/10 text-red-400 px-2 py-0.5 rounded">Out</span>}
                                                </div>
                                            </td>
                                            <td className="py-8 text-center text-2xl font-black text-primary italic tracking-tighter">{b.R}</td>
                                            <td className="py-8 text-center text-sm font-bold text-slate-400 font-mono">{b.B}</td>
                                            <td className="py-8 text-center text-sm font-bold text-slate-400 font-mono">{b.fours}</td>
                                            <td className="py-8 text-center text-sm font-bold text-slate-400 font-mono">{b.sixes}</td>
                                            <td className="py-8 text-right font-black text-xs text-slate-300 font-mono">{(b.B > 0 ? (b.R / b.B) * 100 : 0).toFixed(1)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Bowling Analytics */}
                    <div className="space-y-8">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400 flex items-center gap-3">
                            <Target className="h-4 w-4" /> Execution (Bowling)
                        </h4>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 border-b border-white/5">
                                        <th className="pb-6 text-left">Bowler</th>
                                        <th className="pb-6 text-center">Overs</th>
                                        <th className="pb-6 text-center">Runs</th>
                                        <th className="pb-6 text-center">Wickets</th>
                                        <th className="pb-6 text-right">Econ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/2">
                                    {(Object.values(bowlerStats) as any[]).map((b: { name: string; B: number; R: number; W: number }, idx: number) => {
                                        const economy = b.B > 0 ? (b.R / (b.B / 6)).toFixed(2) : "0.00"
                                        return (
                                            <tr key={idx} className="group hover:bg-white/2 transition-colors">
                                                <td className="py-8 font-black text-white text-xl tracking-tight italic uppercase">{b.name}</td>
                                                <td className="py-8 text-center font-bold text-slate-400 text-sm font-mono">{formatOvers(b.B)}</td>
                                                <td className="py-8 text-center font-black text-white text-2xl italic tracking-tighter">{b.R}</td>
                                                <td className="py-8 text-center font-black text-emerald-400 text-4xl italic tracking-tighter">{b.W}</td>
                                                <td className="py-8 text-right font-black text-xs text-slate-300 font-mono">{economy}</td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Fall of Wickets Timeline */}
                    {fow.length > 0 && (
                        <div className="space-y-8 pt-12 border-t border-white/5">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">Timeline: Fall of Wickets</h4>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6">
                                {fow.map((f, i) => (
                                    <div key={i} className="bg-white/2 p-6 rounded-3xl border border-white/5 group hover:border-primary/30 transition-all text-center">
                                        <p className="text-2xl font-black text-primary italic tracking-tighter">{f.wicket}-{f.score}</p>
                                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest truncate mt-2">{f.player}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    )
}

function calculateImpactPlayers(events: MatchEvent[], players: Player[]) {
    const batters: Record<string, { name: string; R: number; B: number }> = {}
    const bowlers: Record<string, { name: string; W: number; R: number; B: number }> = {}

    events.forEach((e: MatchEvent) => {
        if (e.batter_id) {
            if (!batters[e.batter_id]) batters[e.batter_id] = { name: players.find(p => p.id === e.batter_id)?.name || "Unknown", R: 0, B: 0 }
            if (e.extra_type !== 'WIDE') {
                batters[e.batter_id].R += (e.runs_batter || 0)
                batters[e.batter_id].B += 1
            }
        }
        if (e.bowler_id) {
            if (!bowlers[e.bowler_id]) bowlers[e.bowler_id] = { name: players.find(p => p.id === e.bowler_id)?.name || "Unknown", W: 0, R: 0, B: 0 }
            if (e.wicket_type) bowlers[e.bowler_id].W += 1
            bowlers[e.bowler_id].R += (e.runs_batter + (['WIDE', 'Wide', 'NO_BALL', 'No Ball'].includes(e.extra_type) ? (e.runs_extras || 0) : 0))
            if (!['NO_BALL', 'No Ball', 'WIDE', 'Wide'].includes(e.extra_type)) bowlers[e.bowler_id].B += 1
        }
    })

    const topBatter = Object.values(batters).sort((a, b) => b.R - a.R)[0]
    const topBowler = Object.values(bowlers).sort((a, b) => b.W - a.W || a.R - b.R)[0]
    return { topBatter, topBowler }
}
