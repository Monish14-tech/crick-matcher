"use client"

import { useEffect, useState, use } from "react"
import { Calendar, MapPin, Clock, ArrowLeft, Trophy, Users, Shield, Zap, TrendingUp, Activity, Target, History, ChevronRight, Award, BarChart3, PieChart, Swords, Flag } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import { SupabaseError } from "@/components/SupabaseError"
import Link from "next/link"
import { cn } from "@/lib/utils"

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
    const [loading, setLoading] = useState(true)

    const fetchData = async () => {
        setLoading(true)
        try {
            const { data: m } = await supabase.from('matches').select('*, team_a:teams!team_a_id(*), team_b:teams!team_b_id(*), ground:grounds(*)').eq('id', id).single()
            if (m) setMatch(m)

            const { data: s } = await supabase.from('match_scores').select('*').eq('match_id', id)
            setScores(s || [])

            const { data: e } = await supabase.from('match_events').select('*').eq('match_id', id).order('created_at', { ascending: true })
            setEvents(e || [])

            const { data: p } = await supabase.from('players').select('*').in('team_id', [m?.team_a_id, m?.team_b_id])
            setPlayers(p || [])
        } catch (err) { console.error(err) }
        setLoading(false)
    }

    useEffect(() => {
        fetchData()
        const channel = supabase.channel(`match-${id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'match_events', filter: `match_id=eq.${id}` }, () => fetchData()).subscribe()
        return () => { supabase.removeChannel(channel) }
    }, [id])

    if (loading || !match) return <div className="p-20 text-center font-black animate-pulse text-primary italic underline uppercase tracking-tighter text-4xl">Syncing Match Core...</div>

    const teamAScore = scores.find(s => s.team_id === match.team_a.id)
    const teamBScore = scores.find(s => s.team_id === match.team_b.id)

    // Result Calculation (Standardized by User Rule 5)
    let resultMessage = ""
    if (match.status === 'Completed') {
        const firstInnings = scores.find(s => s.is_first_innings)
        const secondInnings = scores.find(s => !s.is_first_innings)

        if (firstInnings && secondInnings) {
            const target = firstInnings.runs_scored + 1
            const battingTeamName = match.winner_id === match.team_a.id ? match.team_a.name : match.team_b.name
            const bowlingTeamName = match.winner_id === match.team_a.id ? match.team_b.name : match.team_a.name

            if (secondInnings.runs_scored >= target) {
                resultMessage = `${battingTeamName} won by ${10 - secondInnings.wickets_lost} wickets`
            } else if (secondInnings.runs_scored < firstInnings.runs_scored) {
                resultMessage = `${match.winner_id === match.team_a.id ? match.team_a.name : match.team_b.name} won by ${firstInnings.runs_scored - secondInnings.runs_scored} runs`
            } else {
                resultMessage = "Match Tied"
            }
        }
    } else if (match.status === 'Live') {
        const liveInnings = events[events.length - 1]?.innings_no || 1
        resultMessage = `Innings ${liveInnings} in Progress`
    } else {
        resultMessage = "Match Scheduled"
    }

    const totalRuns = scores.reduce((sum, s) => sum + s.runs_scored, 0)
    const totalWickets = scores.reduce((sum, s) => sum + s.wickets_lost, 0)
    const totalFours = events.filter(e => e.runs_batter === 4).length
    const totalSixes = events.filter(e => e.runs_batter === 6).length

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="max-w-6xl mx-auto px-4 py-12">
                <Link href="/schedule" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary mb-8 flex items-center gap-2">
                    <ArrowLeft className="h-3 w-3" /> BACK TO SCHEDULE
                </Link>

                <div className="flex flex-col md:flex-row justify-between items-start gap-8 mb-12">
                    <div>
                        <h1 className="text-5xl md:text-8xl font-black italic tracking-tighter uppercase leading-none">MATCH <span className="text-primary italic">CENTRE</span></h1>
                        <p className="text-sm font-bold text-muted-foreground mt-4 uppercase tracking-widest flex items-center gap-2">
                            <Activity className="h-4 w-4 text-primary" /> {match.overs_type} • {match.status}
                        </p>
                    </div>
                    {match.status === 'Completed' && (
                        <div className="bg-primary text-white p-10 rounded-[3rem] shadow-2xl shadow-primary/30 text-center border-b-8 border-primary-dark">
                            <Trophy className="h-12 w-12 mx-auto mb-2" />
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">Final Result</p>
                            <p className="text-3xl font-black italic leading-tight uppercase">{resultMessage}</p>
                        </div>
                    )}
                </div>

                {/* Score Summary Grid */}
                <div className="grid md:grid-cols-2 gap-8 mb-12">
                    <SummaryCard team={match.team_a} score={teamAScore} isLive={events[events.length - 1]?.innings_no === (teamAScore?.is_first_innings ? 1 : 2) && match.status === 'Live'} />
                    <SummaryCard team={match.team_b} score={teamBScore} isLive={events[events.length - 1]?.innings_no === (teamBScore?.is_first_innings ? 1 : 2) && match.status === 'Live'} />
                </div>

                {/* Match Stats Strip */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
                    <StatBox label="Total Runs" value={totalRuns} />
                    <StatBox label="Wickets" value={totalWickets} />
                    <StatBox label="Boundaries" value={totalFours + totalSixes} />
                    <StatBox label="Run Rate" value={(teamAScore ? (teamAScore.runs_scored / (getBallsFromDecimal(teamAScore.overs_played) / 6 || 1)) : 0).toFixed(2)} />
                </div>

                {/* Detailed Performance Sections */}
                <div className="space-y-12">
                    <section className="space-y-8">
                        <InningsScorecard inningsNo={1} team={match.team_a} events={events} players={players} scores={scores} />
                        <InningsScorecard inningsNo={2} team={match.team_b} events={events} players={players} scores={scores} />
                    </section>
                </div>
            </div>
        </div>
    )
}

function SummaryCard({ team, score, isLive }: any) {
    const balls = getBallsFromDecimal(score?.overs_played || 0)
    return (
        <Card className={cn("rounded-[3rem] border-none shadow-xl overflow-hidden p-10 transition-all", isLive ? "bg-slate-900 text-white scale-105" : "bg-white")}>
            <div className="flex justify-between items-center">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-2">Competing Squad</p>
                    <h3 className="text-3xl font-black italic uppercase leading-none">{team.name}</h3>
                </div>
                <div className="text-right">
                    <p className="text-5xl font-black italic text-primary">{score?.runs_scored || 0}/{score?.wickets_lost || 0}</p>
                    <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest">{formatOvers(balls)} OVERS</p>
                </div>
            </div>
            {isLive && <div className="mt-6 flex items-center gap-2 text-[10px] font-black text-primary uppercase"><div className="h-2 w-2 bg-primary rounded-full animate-ping" /> Currently Batting</div>}
        </Card>
    )
}

function StatBox({ label, value }: any) {
    return (
        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 text-center">
            <p className="text-[10px] font-black uppercase text-muted-foreground mb-1 tracking-widest">{label}</p>
            <p className="text-4xl font-black italic text-slate-900">{value}</p>
        </div>
    )
}

function InningsScorecard({ inningsNo, team, events, players, scores }: any) {
    const inningsEvents = events.filter((e: any) => e.innings_no === inningsNo)
    const score = scores.find((s: any) => s.is_first_innings === (inningsNo === 1))

    if (inningsEvents.length === 0 && !score) return null

    // Batter Stats Engine (Rule 7)
    const batterStats: any = {}
    inningsEvents.forEach((e: any) => {
        if (!e.batter_id) return
        if (!batterStats[e.batter_id]) {
            batterStats[e.batter_id] = { name: players.find((p: any) => p.id === e.batter_id)?.name, R: 0, B: 0, fours: 0, sixes: 0, status: "not out" }
        }

        // Rule 3.1 & 3.3
        if (e.extra_type !== "WIDE" && e.extra_type !== "BYE" && e.extra_type !== "LEG_BYE") {
            // Note: Rule 3.4 says BYE/LEG_BYE don't increment striker balls
            // Rule 3.3 says NO_BALL doesn't increment balls count either? 
            // Wait, looking closely at User Rule 3.1, 3.5, 3.4, 3.3...
            // "striker.balls += 1" ONLY in RUN (3.1) and WICKET (3.5).
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

        // Rule: increment ball if RUN, BYE, LEG_BYE, WICKET (Snippet 3.1, 3.4, 3.5)
        if (!e.extra_type || e.extra_type === "BYE" || e.extra_type === "LEG_BYE" || e.wicket_type) {
            if (e.extra_type !== "WIDE" && e.extra_type !== "NO_BALL") {
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
        <Card className="rounded-[3rem] border-none shadow-2xl overflow-hidden bg-white">
            <CardHeader className="bg-slate-900 text-white p-8 flex flex-row justify-between items-center">
                <div>
                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-1">Innings {inningsNo}</p>
                    <CardTitle className="text-3xl font-black italic uppercase leading-none">{team.name}</CardTitle>
                </div>
                <div className="text-right">
                    <p className="text-4xl font-black italic text-primary">{score?.runs_scored || 0}/{score?.wickets_lost || 0}</p>
                    <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest">{formatOvers(getBallsFromDecimal(score?.overs_played || 0))} OVERS</p>
                </div>
            </CardHeader>
            <CardContent className="p-8 space-y-12">
                {/* Batting Scorecard */}
                <div className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2"><div className="h-1 w-4 bg-primary rounded-full" /> Batting Scorecard</h4>
                    <table className="w-full">
                        <thead className="text-[10px] font-black uppercase tracking-widest opacity-30 border-b">
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
                                <tr key={idx} className="group hover:bg-slate-50/50">
                                    <td className="py-4">
                                        <p className="font-black text-slate-800">{b.name} <span className={cn("text-[9px] font-bold uppercase ml-2", b.status === "out" ? "text-red-500" : "text-green-500")}>{b.status}</span></p>
                                    </td>
                                    <td className="py-4 text-center font-black text-primary text-xl">{b.R}</td>
                                    <td className="py-4 text-center text-xs font-bold text-slate-400">{b.B}</td>
                                    <td className="py-4 text-center text-xs font-bold text-slate-400">{b.fours}</td>
                                    <td className="py-4 text-center text-xs font-bold text-slate-400">{b.sixes}</td>
                                    <td className="py-4 text-center font-black text-[10px]">{(b.B > 0 ? (b.R / b.B) * 100 : 0).toFixed(1)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Bowling Figures */}
                <div className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2"><div className="h-1 w-4 bg-red-500 rounded-full" /> Bowling Figures</h4>
                    <table className="w-full">
                        <thead className="text-[10px] font-black uppercase tracking-widest opacity-30 border-b">
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
                                const overs = Math.floor(b.B / 6) + (b.B % 6) / 10
                                const economy = overs > 0 ? (b.R / (b.B / 6)).toFixed(2) : "0.00"
                                return (
                                    <tr key={idx}>
                                        <td className="py-4 font-black">{b.name}</td>
                                        <td className="py-4 text-center font-bold text-slate-400">{formatOvers(b.B)}</td>
                                        <td className="py-4 text-center font-black text-slate-800">{b.R}</td>
                                        <td className="py-4 text-center font-black text-red-500 text-xl">{b.W}</td>
                                        <td className="py-4 text-center text-xs font-black">{economy}</td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Fall of Wickets */}
                {fow.length > 0 && (
                    <div className="space-y-4 pt-8 border-t border-slate-100">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Fall of Wickets</h4>
                        <div className="flex flex-wrap gap-3">
                            {fow.map((f, i) => (
                                <div key={i} className="bg-slate-50 px-4 py-2 rounded-xl text-[10px] font-bold border border-slate-100">
                                    <span className="text-primary font-black">{f.wicket}-{f.score}</span> ({f.player})
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
