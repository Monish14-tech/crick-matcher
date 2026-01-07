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
    const [events, setEvents] = useState<any[]>([])
    const [players, setPlayers] = useState<any[]>([])
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

        // Real-time subscriptions for immediate updates across all relevant tables
        const matchChannel = supabase.channel(`match-updates-${id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'matches', filter: `id=eq.${id}` }, () => fetchData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'match_scores', filter: `match_id=eq.${id}` }, () => fetchData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'match_events', filter: `match_id=eq.${id}` }, () => fetchData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'match_active_state', filter: `match_id=eq.${id}` }, () => fetchData())
            .subscribe()

        // Auto-refresh interval (0.5 seconds) as requested for live score tracking (failsafe)
        const interval = setInterval(() => {
            fetchData()
        }, 500)

        return () => {
            supabase.removeChannel(matchChannel)
            clearInterval(interval)
        }
    }, [id])

    if (loading || !match) return <div className="p-20 text-center font-black animate-pulse text-primary italic underline uppercase tracking-tighter text-4xl">Syncing Match Core...</div>

    const firstInningsScore = scores.find(s => s.is_first_innings)
    const currentTarget = firstInningsScore ? firstInningsScore.runs_scored + 1 : null

    // Calculate Live Totals from Events (Sync Fix)
    const currentInningsNo = activeState?.innings_no || (events.length > 0 ? events[events.length - 1].innings_no : 1)
    const currentInningsEvents = events.filter(e => e.innings_no === currentInningsNo)

    const oversCap = parseInt(match.overs_type.match(/(\d+)/)?.[0] || "20")
    const maxMatchBalls = oversCap * 6

    const liveRuns = currentInningsEvents.reduce((sum, e) => sum + (e.runs_batter || 0) + (e.runs_extras || 0), 0)
    const liveWickets = currentInningsEvents.filter(e => e.wicket_type).length
    const rawLiveBalls = currentInningsEvents.filter(e => !['NO_BALL', 'No Ball'].includes(e.extra_type)).length
    const liveBalls = Math.min(rawLiveBalls, maxMatchBalls)
    const liveOvers = Math.floor(liveBalls / 6) + (liveBalls % 6) / 10

    // Dynamic Scores (Merging calculated live data with DB scores)
    const getTeamScore = (teamId: string) => {
        const dbScore = scores.find(s => s.team_id === teamId)
        if (match.status === 'Live' && activeState?.batting_team_id === teamId) {
            return {
                ...dbScore,
                runs_scored: liveRuns,
                wickets_lost: liveWickets,
                overs_played: liveOvers,
                team_id: teamId
            }
        }
        return dbScore
    }

    const teamAScore = getTeamScore(match.team_a.id)
    const teamBScore = getTeamScore(match.team_b.id)

    // Result Calculation (Standardized by User Rule 5)
    let resultMessage = ""
    let winnerName = ""
    if (match.status === 'Completed') {
        const firstInnings = scores.find(s => s.is_first_innings)
        const secondInnings = scores.find(s => !s.is_first_innings)

        if (firstInnings && secondInnings && match.winner_id) {
            const target = firstInnings.runs_scored + 1

            // Determine which team won
            const winnerTeam = match.winner_id === match.team_a_id ? match.team_a : match.team_b
            winnerName = winnerTeam.name

            // Determine if winner batted first or second
            const winnerBattedFirst = (firstInnings.team_id === match.winner_id)

            if (winnerBattedFirst) {
                // Winner batted first, so they won by runs
                const runMargin = firstInnings.runs_scored - secondInnings.runs_scored
                resultMessage = `${winnerName} won by ${runMargin} runs`
            } else {
                // Winner batted second, so they won by wickets
                const winningTeamPlayers = players.filter(p => p.team_id === match.winner_id)
                const totalWicketsAvailable = Math.max(1, winningTeamPlayers.length > 0 ? winningTeamPlayers.length - 1 : 10) // Default to 10 if players not loaded
                const wicketsRemaining = totalWicketsAvailable - secondInnings.wickets_lost
                resultMessage = `${winnerName} won by ${wicketsRemaining} wickets`
            }
        } else if (firstInnings && secondInnings && !match.winner_id) {
            resultMessage = "Match Tied"
        }
    } else if (match.status === 'Live') {
        const liveInnings = currentInningsNo
        resultMessage = `Innings ${liveInnings} in Progress`
    } else {
        resultMessage = "Match Scheduled"
    }

    const totalRuns = scores.reduce((sum, s) => sum + s.runs_scored, 0)
    const totalWickets = scores.reduce((sum, s) => sum + s.wickets_lost, 0)
    const totalFours = events.filter(e => e.runs_batter === 4).length
    const totalSixes = events.filter(e => e.runs_batter === 6).length

    return (
        <div className="min-h-screen bg-slate-100/50 pb-24">
            {/* Header Hero */}
            <div className="bg-slate-900 text-white pt-24 pb-32 px-4 relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(59,130,246,0.1),transparent)] pointer-events-none" />
                <div className="max-w-6xl mx-auto relative z-10">
                    <Link href="/schedule" className="text-[10px] font-black uppercase tracking-widest text-white/50 hover:text-primary mb-16 flex items-center gap-2">
                        <ArrowLeft className="h-3 w-3" /> BACK TO SCHEDULE
                    </Link>

                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        <div className="text-center lg:text-left">
                            <h1 className="text-5xl md:text-7xl font-black italic tracking-tighter uppercase leading-[0.8] mb-10">
                                MATCH <br /><span className="text-primary">CENTRE</span>
                            </h1>
                            <div className="flex flex-wrap justify-center lg:justify-start gap-4">
                                <span className="px-6 py-2.5 bg-white/5 backdrop-blur-md rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] border border-white/10 flex items-center gap-2">
                                    <Clock className="h-3.5 w-3.5 text-primary" /> {(match as any).overs_type}
                                </span>
                                <span className={cn(
                                    "px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border shadow-lg transition-all",
                                    (match as any).status === 'Live' ? "bg-red-500 border-red-500 animate-pulse text-white" : "bg-white/5 border-white/10 text-white/70"
                                )}>
                                    {(match as any).status}
                                </span>
                            </div>
                        </div>

                        <div className="flex justify-center lg:justify-end w-full">
                            {(match as any).status === 'Completed' ? (
                                <div className="relative group">
                                    <div className="absolute -inset-1 bg-gradient-to-r from-primary to-amber-500 rounded-[3rem] blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                                    <Card className="relative bg-slate-900 border-2 border-primary/50 text-white p-8 rounded-[3rem] shadow-2xl flex flex-col items-center min-w-[320px]">
                                        <div className="h-16 w-16 bg-primary/20 rounded-full flex items-center justify-center mb-4">
                                            <Trophy className="h-8 w-8 text-primary" />
                                        </div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-2">Champion</p>
                                        <h2 className="text-4xl font-black italic uppercase leading-none mb-2 text-center">{winnerName}</h2>
                                        <p className="text-xs font-bold text-white/60 uppercase tracking-widest">{resultMessage}</p>
                                    </Card>
                                </div>
                            ) : (
                                <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-10 rounded-[3rem] w-full max-w-lg shadow-2xl">
                                    <div className="flex items-center justify-between gap-8">
                                        <div className="text-center flex-1">
                                            <p className="text-[10px] font-black text-white/40 uppercase mb-2 truncate">{(match as any).team_a.name}</p>
                                            <p className="text-4xl font-black italic text-primary">{teamAScore?.runs_scored || 0}/{teamAScore?.wickets_lost || 0}</p>
                                        </div>
                                        <div className="h-12 w-px bg-white/10" />
                                        <div className="text-center flex-1">
                                            <p className="text-[10px] font-black text-white/40 uppercase mb-2 truncate">{(match as any).team_b.name}</p>
                                            <p className="text-4xl font-black italic text-primary">{teamBScore?.runs_scored || 0}/{teamBScore?.wickets_lost || 0}</p>
                                        </div>
                                    </div>
                                    <div className="mt-6 text-center">
                                        <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">{resultMessage}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Most Impactful Players (Post-Match) - Positioned with negative margin for overlap effect */}
            {(match as any).status === 'Completed' && (() => {
                const { topBatter, topBowler } = calculateImpactPlayers(events, players);
                return (
                    <div className="max-w-6xl mx-auto px-4 -mt-16 mb-12 relative z-20">
                        <div className="grid md:grid-cols-2 gap-8">
                            {topBatter ? (
                                <ImpactPlayerCard
                                    player={topBatter}
                                    type="Batter"
                                    icon={<Zap className="h-6 w-6 text-primary" />}
                                />
                            ) : null}
                            {topBowler ? (
                                <ImpactPlayerCard
                                    player={topBowler}
                                    type="Bowler"
                                    icon={<Target className="h-6 w-6 text-red-500" />}
                                />
                            ) : null}
                        </div>
                    </div>
                );
            })()}

            {/* Ball by Ball Ticker (Live Feed) */}
            {(match as any).status === 'Live' && (
                <div className="bg-white border-y border-slate-200 shadow-sm relative z-30">
                    <BallByBallTicker matchId={id} />
                </div>
            )}

            <div className="max-w-6xl mx-auto px-4 py-24 relative z-10">
                {/* Result Summary Table (Structured) */}
                {(match as any).status === 'Completed' && (
                    <Card className="rounded-[2.5rem] border-2 border-slate-900 shadow-2xl overflow-hidden mb-12 bg-gradient-to-br from-slate-50 to-white">
                        <CardHeader className="bg-gradient-to-r from-slate-900 to-slate-800 p-8 border-b-4 border-primary">
                            <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-3 text-white">
                                <Swords className="h-6 w-6 text-primary" /> Match Summary Breakdown
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[600px]">
                                    <thead className="bg-slate-900">
                                        <tr className="text-xs font-black uppercase tracking-widest text-white border-b-2 border-primary">
                                            <th className="px-8 py-5 text-left">Team</th>
                                            <th className="px-8 py-5 text-center">Total Score</th>
                                            <th className="px-8 py-5 text-center">Overs</th>
                                            <th className="px-8 py-5 text-right">Match Role</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {[
                                            { team: (match as any).team_a, score: teamAScore, isWin: (match as any).winner_id === (match as any).team_a.id },
                                            { team: (match as any).team_b, score: teamBScore, isWin: (match as any).winner_id === (match as any).team_b.id }
                                        ].map((row, idx) => (
                                            <tr key={idx} className={cn("hover:bg-slate-100 transition-all duration-200", row.isWin && "bg-gradient-to-r from-primary/10 to-primary/5 border-l-4 border-primary")}>
                                                <td className="px-8 py-8">
                                                    <div className="flex items-center gap-4">
                                                        <div className={cn("h-8 w-2 rounded-full shadow-lg", row.isWin ? "bg-gradient-to-b from-primary to-primary/70" : "bg-slate-400")} />
                                                        <span className="font-black italic uppercase text-2xl text-slate-900 leading-none tracking-tight">{row.team.name}</span>
                                                        {row.isWin && <CheckCircle2 className="h-6 w-6 text-primary fill-primary/20 animate-pulse" />}
                                                    </div>
                                                </td>
                                                <td className="px-8 py-8 text-center">
                                                    <span className="text-4xl font-black italic text-slate-900">{row.score?.runs_scored || 0}<span className="text-xl opacity-40 mx-2 font-bold">/</span>{row.score?.wickets_lost || 0}</span>
                                                </td>
                                                <td className="px-8 py-8 text-center text-slate-700 font-black font-mono text-lg">
                                                    {formatOvers(getBallsFromDecimal(row.score?.overs_played || 0))}
                                                </td>
                                                <td className="px-8 py-8 text-right">
                                                    <span className={cn(
                                                        "px-8 py-4 rounded-2xl text-sm font-black uppercase tracking-widest inline-flex items-center gap-3 shadow-2xl border-3 transition-all",
                                                        row.isWin
                                                            ? "bg-gradient-to-r from-green-500 via-emerald-500 to-green-600 border-green-400 text-white shadow-green-500/50 scale-110 animate-pulse"
                                                            : "bg-gradient-to-r from-slate-600 to-slate-700 border-slate-500 text-white shadow-slate-500/40"
                                                    )}>
                                                        {row.isWin ? <Trophy className="h-5 w-5 animate-bounce" /> : <Award className="h-5 w-5" />}
                                                        {row.isWin ? "🏆 WINNER" : "RUNNER UP"}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Live High-Level Scorecard (Visual) */}
                <div className="grid md:grid-cols-2 gap-10 mb-12">
                    <SummaryCard
                        team={(match as any).team_a}
                        score={teamAScore}
                        isWinner={(match as any).winner_id === (match as any).team_a.id}
                        isLive={activeState?.batting_team_id === (match as any).team_a.id && (match as any).status === 'Live'}
                        matchStatus={(match as any).status}
                        targetScore={(!teamAScore?.is_first_innings && currentTarget) ? currentTarget : null}
                    />
                    <SummaryCard
                        team={(match as any).team_b}
                        score={teamBScore}
                        isWinner={(match as any).winner_id === (match as any).team_b.id}
                        isLive={activeState?.batting_team_id === (match as any).team_b.id && (match as any).status === 'Live'}
                        matchStatus={(match as any).status}
                        targetScore={(!teamBScore?.is_first_innings && currentTarget) ? currentTarget : null}
                    />
                </div>

                {/* Match Stats Strip */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
                    <StatBox label="Total Runs" value={totalRuns} icon={<Zap className="h-4 w-4 text-amber-500" />} />
                    <StatBox label="Wickets" value={totalWickets} icon={<Award className="h-4 w-4 text-red-500" />} />
                    <StatBox label="Boundaries" value={totalFours + totalSixes} icon={<PieChart className="h-4 w-4 text-blue-500" />} />
                    <StatBox label="Run Rate" value={(teamAScore ? (teamAScore.runs_scored / (getBallsFromDecimal(teamAScore.overs_played) / 6 || 1)) : 0).toFixed(2)} icon={<Activity className="h-4 w-4 text-green-500" />} />
                </div>

                {/* Detailed Performance Sections */}
                <div className="space-y-16">
                    <InningsScorecard inningsNo={1} team={(match as any).team_a} events={events} players={players} scores={scores} />
                    <InningsScorecard inningsNo={2} team={(match as any).team_b} events={events} players={players} scores={scores} />
                </div>
            </div>
        </div>
    )
}

function SummaryCard({ team, score, isLive, isWinner, matchStatus, targetScore }: any) {
    const balls = getBallsFromDecimal(score?.overs_played || 0)
    const hasBatted = !!score
    const isUpcoming = matchStatus === 'Live' && !isLive && !hasBatted

    return (
        <Card className={cn(
            "rounded-[3rem] border-3 shadow-2xl overflow-hidden p-12 transition-all relative group",
            isLive ? "bg-gradient-to-br from-slate-900 to-slate-800 text-white scale-105 shadow-primary/30 border-primary" : "bg-white border-slate-300",
            isWinner && !isLive && "border-4 border-primary bg-gradient-to-br from-white via-primary/5 to-primary/10"
        )}>
            {isWinner && (
                <div className="absolute top-0 right-10 bg-gradient-to-r from-primary to-primary/80 text-white px-8 py-3 rounded-b-3xl shadow-xl animate-bounce">
                    <Trophy className="h-6 w-6" />
                </div>
            )}

            <div className="flex flex-col md:flex-row justify-between items-center gap-8 relative z-10">
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-primary mb-3 opacity-90">Competing Team</p>
                    <h3 className={cn(
                        "text-3xl md:text-5xl font-black italic uppercase leading-tight truncate transition-colors",
                        isLive ? "text-white" : "text-slate-900 group-hover:text-primary"
                    )}>{team.name}</h3>

                    <div className="mt-5 flex items-center gap-4">
                        <div className={cn(
                            "h-2 w-16 rounded-full shadow-md",
                            isLive ? "bg-primary animate-pulse" : (hasBatted ? "bg-green-500" : "bg-slate-300")
                        )} />
                        <span className="text-xs font-black uppercase opacity-60">
                            {isLive ? "Currently Batting" : (hasBatted ? "Innings Completed" : "Yet to Bat")}
                        </span>
                    </div>
                </div>

                <div className="text-center md:text-right shrink-0">
                    {isUpcoming ? (
                        <div className="space-y-2">
                            <p className="text-3xl font-black italic text-slate-400">WAITING</p>
                            <p className="text-xs font-bold opacity-40 uppercase tracking-[0.2em]">INNINGS 2</p>
                        </div>
                    ) : (
                        <>
                            <p className={cn(
                                "text-6xl md:text-7xl font-black italic leading-none mb-2",
                                isLive ? "text-primary" : "text-slate-900"
                            )}>
                                {score?.runs_scored || 0}<span className="text-4xl opacity-50 mx-2">/</span>{score?.wickets_lost || 0}
                            </p>
                            <p className="text-xs font-bold opacity-60 uppercase tracking-[0.2em]">
                                {formatOvers(balls)} OVERS PLAYED
                            </p>
                            {isLive && targetScore && (
                                <p className="text-xs font-black text-primary mt-3 uppercase tracking-widest">
                                    Target: {targetScore}
                                </p>
                            )}
                        </>
                    )}
                </div>
            </div>

            {isLive && (
                <div className="mt-10 flex items-center gap-4">
                    <div className="bg-primary/20 text-primary px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 border-2 border-primary/30">
                        <div className="h-2 w-2 bg-primary rounded-full animate-ping" />
                        Live Score Tracking
                    </div>
                    {targetScore && (
                        <div className="bg-white/5 border-2 border-white/20 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest">
                            Need {targetScore - (score?.runs_scored || 0)} more
                        </div>
                    )}
                </div>
            )}

            {isWinner && !isLive && (
                <div className="mt-10 bg-gradient-to-r from-green-500 via-emerald-500 to-green-600 text-white px-8 py-4 rounded-2xl text-base font-black uppercase tracking-widest w-fit flex items-center gap-4 shadow-2xl shadow-green-500/50 border-3 border-green-400 animate-pulse">
                    <Trophy className="h-6 w-6 animate-bounce" /> 🏆 MATCH WINNER
                </div>
            )}
        </Card>
    )
}

function StatBox({ label, value, icon }: any) {
    return (
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200 text-center hover:border-primary/50 transition-colors group">
            <div className="h-10 w-10 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/10 transition-colors">
                {icon}
            </div>
            <p className="text-[10px] font-black uppercase text-slate-400 mb-1 tracking-widest">{label}</p>
            <p className="text-4xl font-black italic text-slate-900">{value}</p>
        </div>
    )
}

function InningsScorecard({ inningsNo, team, events, players, scores }: any) {
    const inningsEvents = events.filter((e: any) => e.innings_no === inningsNo)

    const runs = inningsEvents.reduce((sum: number, e: any) => sum + (e.runs_batter || 0) + (e.runs_extras || 0), 0)
    const wickets = inningsEvents.filter((e: any) => e.wicket_type).length
    const balls = inningsEvents.filter((e: any) => !['NO_BALL', 'No Ball'].includes(e.extra_type)).length

    if (inningsEvents.length === 0) return null

    // Batter Stats Engine (Rule 7)
    const batterStats: any = {}
    inningsEvents.forEach((e: any) => {
        if (!e.batter_id) return
        if (!batterStats[e.batter_id]) {
            batterStats[e.batter_id] = { name: players.find((p: any) => p.id === e.batter_id)?.name, R: 0, B: 0, fours: 0, sixes: 0, status: "not out" }
        }

        if (e.extra_type !== "WIDE" && e.extra_type !== "BYE" && e.extra_type !== "LEG_BYE") {
            if (!e.extra_type || e.extra_type === "RUN") {
                batterStats[e.batter_id].B += 1
            }
        }

        if (isFinite(e.runs_batter)) batterStats[e.batter_id].R += e.runs_batter
        if (e.runs_batter === 4) batterStats[e.batter_id].fours += 1
        if (e.runs_batter === 6) batterStats[e.batter_id].sixes += 1

        if (e.wicket_type && e.player_out_id === e.batter_id) {
            batterStats[e.batter_id].status = "out"
        }
    })

    // Bowler Stats Engine (Rule 7)
    const bowlerStats: any = {}
    inningsEvents.forEach((e: any) => {
        if (!e.bowler_id) return
        if (!bowlerStats[e.bowler_id]) {
            bowlerStats[e.bowler_id] = { name: players.find((p: any) => p.id === e.bowler_id)?.name, O: 0, B: 0, R: 0, W: 0 }
        }

        if (!e.extra_type || ['BYE', 'LEG_BYE', 'Bye', 'Leg Bye', 'WIDE', 'Wide'].includes(e.extra_type) || e.wicket_type) {
            if (e.extra_type !== "NO_BALL" && e.extra_type !== "No Ball") {
                bowlerStats[e.bowler_id].B += 1
            }
        }

        bowlerStats[e.bowler_id].R += (e.runs_batter + (e.extra_type === "WIDE" || e.extra_type === "NO_BALL" ? e.runs_extras : 0))
        if (e.wicket_type) bowlerStats[e.bowler_id].W += 1
    })

    // Fall of Wickets
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
        <Card className="rounded-[3.5rem] border-none shadow-2xl overflow-hidden bg-white">
            <CardHeader className="bg-slate-900 text-white p-10 flex flex-row justify-between items-center">
                <div className="flex items-center gap-6">
                    <div className="h-16 w-16 bg-white/10 rounded-3xl flex items-center justify-center font-black text-2xl italic text-primary border border-white/10">
                        {team.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-1">Innings {inningsNo}</p>
                        <CardTitle className="text-4xl font-black italic uppercase leading-none">{team.name}</CardTitle>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-5xl font-black italic text-primary">{runs}/{wickets}</p>
                    <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest">{formatOvers(balls)} OVERS</p>
                </div>
            </CardHeader>
            <CardContent className="p-10 space-y-16">
                {/* Batting Scorecard */}
                <div className="space-y-6">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                        <div className="h-1 w-8 bg-primary rounded-full" /> Batting Performance
                    </h4>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="text-[10px] font-black uppercase tracking-widest opacity-30 border-b border-slate-100">
                                <tr>
                                    <th className="pb-4 text-left">Batter</th>
                                    <th className="pb-4 text-center">R</th>
                                    <th className="pb-4 text-center">B</th>
                                    <th className="pb-4 text-center">4s</th>
                                    <th className="pb-4 text-center">6s</th>
                                    <th className="pb-4 text-center">SR</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {Object.values(batterStats).map((b: any, idx) => (
                                    <tr key={idx} className="group hover:bg-slate-50/50 transition-colors">
                                        <td className="py-6">
                                            <div className="flex items-center gap-3">
                                                <div className={cn("h-4 w-1 rounded-full", b.status === "out" ? "bg-red-500" : "bg-green-500")} />
                                                <span className="font-black text-slate-900 tracking-tight text-lg">{b.name}</span>
                                                <span className={cn("text-[9px] font-black uppercase px-2 py-0.5 rounded", b.status === "out" ? "bg-red-50 text-red-500" : "bg-green-50 text-green-500")}>{b.status}</span>
                                            </div>
                                        </td>
                                        <td className="py-6 text-center font-black text-primary text-2xl">{b.R}</td>
                                        <td className="py-6 text-center text-sm font-bold text-slate-400">{b.B}</td>
                                        <td className="py-6 text-center text-sm font-bold text-slate-400">{b.fours}</td>
                                        <td className="py-6 text-center text-sm font-bold text-slate-400">{b.sixes}</td>
                                        <td className="py-6 text-center font-black text-xs bg-slate-50/30 rounded-r-xl">{(b.B > 0 ? (b.R / b.B) * 100 : 0).toFixed(1)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Bowling Figures */}
                <div className="space-y-6">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                        <div className="h-1 w-8 bg-red-500 rounded-full" /> Bowling Statistics
                    </h4>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="text-[10px] font-black uppercase tracking-widest opacity-30 border-b border-slate-100">
                                <tr>
                                    <th className="pb-4 text-left">Bowler</th>
                                    <th className="pb-4 text-center">O</th>
                                    <th className="pb-4 text-center">R</th>
                                    <th className="pb-4 text-center">W</th>
                                    <th className="pb-4 text-center">Econ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {Object.values(bowlerStats).map((b: any, idx) => {
                                    const economy = b.B > 0 ? (b.R / (b.B / 6)).toFixed(2) : "0.00"
                                    return (
                                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="py-6 font-black text-lg text-slate-800">{b.name}</td>
                                            <td className="py-6 text-center font-bold text-slate-400 text-sm">{formatOvers(b.B)}</td>
                                            <td className="py-6 text-center font-black text-slate-900 text-xl">{b.R}</td>
                                            <td className="py-6 text-center font-black text-red-500 text-3xl">{b.W}</td>
                                            <td className="py-6 text-center font-black text-xs bg-red-50/30 rounded-r-xl">{economy}</td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Fall of Wickets */}
                {fow.length > 0 && (
                    <div className="space-y-6 pt-10 border-t border-slate-100">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Match Timeline: Fall of Wickets</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
                            {fow.map((f, i) => (
                                <div key={i} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 group hover:border-primary/30 transition-colors">
                                    <div className="flex flex-col gap-1 text-center">
                                        <p className="text-xl font-black text-primary italic uppercase leading-none">{f.wicket}-{f.score}</p>
                                        <p className="text-[9px] font-black text-slate-400 uppercase truncate mt-2">{f.player}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

interface ImpactBatter {
    name: string;
    R: number;
    B: number;
}

interface ImpactBowler {
    name: string;
    W: number;
    R: number;
    B: number;
}

function calculateImpactPlayers(events: any[], players: any[]): { topBatter?: ImpactBatter, topBowler?: ImpactBowler } {
    const batters: Record<string, ImpactBatter> = {}
    const bowlers: Record<string, ImpactBowler> = {}

    events.forEach(e => {
        // Batting
        if (e.batter_id) {
            if (!batters[e.batter_id]) {
                batters[e.batter_id] = { name: players.find(p => p.id === e.batter_id)?.name || "Unknown", R: 0, B: 0 }
            }
            if (e.extra_type !== 'WIDE') {
                batters[e.batter_id].R += (e.runs_batter || 0)
                batters[e.batter_id].B += 1
            }
        }

        // Bowling
        if (e.bowler_id) {
            if (!bowlers[e.bowler_id]) {
                bowlers[e.bowler_id] = { name: players.find(p => p.id === e.bowler_id)?.name || "Unknown", W: 0, R: 0, B: 0 }
            }
            if (e.wicket_type) bowlers[e.bowler_id].W += 1
            bowlers[e.bowler_id].R += (e.runs_batter + (e.extra_type === 'WIDE' || e.extra_type === 'NO_BALL' ? (e.runs_extras || 0) : 0))
            if (e.extra_type !== 'NO_BALL' && e.extra_type !== 'No Ball') bowlers[e.bowler_id].B += 1
        }
    })

    const topBatter = Object.values(batters)
        .sort((a, b) => {
            if (b.R !== a.R) return b.R - a.R
            const srA = a.B > 0 ? (a.R / a.B) * 100 : 0
            const srB = b.B > 0 ? (b.R / b.B) * 100 : 0
            return srB - srA
        })[0]

    const topBowler = Object.values(bowlers)
        .sort((a, b) => {
            if (b.W !== a.W) return b.W - a.W
            const econA = a.B > 0 ? (a.R / (a.B / 6)) : 0
            const econB = b.B > 0 ? (b.R / (b.B / 6)) : 0
            return econA - econB // Lower economy is better
        })[0]

    return { topBatter, topBowler }
}

interface ImpactPlayerCardProps {
    player: ImpactBatter | ImpactBowler;
    type: "Batter" | "Bowler";
    icon: React.ReactNode;
}

function ImpactPlayerCard({ player, type, icon }: ImpactPlayerCardProps) {
    const stat = type === "Batter"
        ? `${(player as ImpactBatter).R} Runs (${(player as ImpactBatter).B} Balls)`
        : `${(player as ImpactBowler).W} Wickets (${(player as ImpactBowler).R} Runs)`

    return (
        <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden bg-slate-900 text-white relative group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -mr-16 -mt-16 blur-3xl opacity-20" />
            <CardContent className="p-8 flex items-center gap-6 relative z-10">
                <div className="h-20 w-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center">
                    {icon}
                </div>
                <div>
                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-1">Impact {type}</p>
                    <h3 className="text-3xl font-black italic uppercase leading-none mb-2">{player.name}</h3>
                    <p className="text-xl font-black italic text-white/40">{stat}</p>
                </div>
            </CardContent>
        </Card>
    )
}
