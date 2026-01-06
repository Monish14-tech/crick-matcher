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
    let winnerName = ""
    if (match.status === 'Completed') {
        const firstInnings = scores.find(s => s.is_first_innings)
        const secondInnings = scores.find(s => !s.is_first_innings)

        if (firstInnings && secondInnings) {
            const target = firstInnings.runs_scored + 1
            const battingTeamName = match.winner_id === match.team_a.id ? match.team_a.name : match.team_b.name
            const bowlingTeamName = match.winner_id === match.team_a.id ? match.team_b.name : match.team_a.name
            winnerName = match.winner_id === match.team_a.id ? match.team_a.name : match.team_b.name

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
        <div className="min-h-screen bg-slate-100/50">
            {/* Header Hero */}
            <div className="bg-slate-900 text-white py-16 px-4">
                <div className="max-w-6xl mx-auto">
                    <Link href="/schedule" className="text-[10px] font-black uppercase tracking-widest text-white/50 hover:text-primary mb-12 flex items-center gap-2">
                        <ArrowLeft className="h-3 w-3" /> BACK TO SCHEDULE
                    </Link>

                    <div className="flex flex-col md:flex-row justify-between items-center gap-12">
                        <div className="text-center md:text-left">
                            <h1 className="text-6xl md:text-9xl font-black italic tracking-tighter uppercase leading-none mb-4">
                                MATCH <span className="text-primary">CENTRE</span>
                            </h1>
                            <div className="flex flex-wrap justify-center md:justify-start gap-4">
                                <span className="px-4 py-1 bg-white/10 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10">{match.overs_type}</span>
                                <span className={cn("px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border", match.status === 'Live' ? "bg-red-500 border-red-500 animate-pulse" : "bg-white/10 border-white/10")}>{match.status}</span>
                            </div>
                        </div>

                        {match.status === 'Completed' && (
                            <div className="relative group">
                                <div className="absolute -inset-1 bg-gradient-to-r from-primary to-amber-500 rounded-[3rem] blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                                <Card className="relative bg-slate-900 border-2 border-primary/50 text-white p-8 rounded-[3rem] shadow-2xl flex flex-col items-center min-w-[320px]">
                                    <div className="h-16 w-16 bg-primary/20 rounded-full flex items-center justify-center mb-4">
                                        <Trophy className="h-8 w-8 text-primary" />
                                    </div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-2">Champion</p>
                                    <h2 className="text-4xl font-black italic uppercase leading-none mb-2">{winnerName}</h2>
                                    <p className="text-xs font-bold text-white/60 uppercase tracking-widest">{resultMessage}</p>
                                </Card>
                            </div>
                        )}
                    </div>
                </div>

                {/* Most Impactful Players (Post-Match) */}
                {match.status === 'Completed' && (() => {
                    const { topBatter, topBowler } = calculateImpactPlayers(events, players);
                    return (
                        <div className="max-w-6xl mx-auto px-4 -mt-32 mb-12 relative z-20">
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
            </div>

            {/* Ball by Ball Ticker (Live Feed) */}
            {match.status === 'Live' && <BallByBallTicker matchId={id} />}

            <div className="max-w-6xl mx-auto px-4 -mt-10 mb-20 relative z-10">
                {/* Result Summary Table (Structured) */}
                {match.status === 'Completed' && (
                    <Card className="rounded-[2.5rem] border-none shadow-xl overflow-hidden mb-8 bg-white">
                        <CardHeader className="bg-slate-50 p-6 border-b">
                            <CardTitle className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                <Swords className="h-4 w-4 text-primary" /> Match Result Structure
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <table className="w-full">
                                <thead className="bg-slate-50/50">
                                    <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        <th className="px-8 py-4 text-left">Team</th>
                                        <th className="px-8 py-4 text-center">Score</th>
                                        <th className="px-8 py-4 text-center">Overs</th>
                                        <th className="px-8 py-4 text-right">Result Role</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {[
                                        { team: match.team_a, score: teamAScore, winner: match.winner_id === match.team_a.id },
                                        { team: match.team_b, score: teamBScore, winner: match.winner_id === match.team_b.id }
                                    ].map((row, idx) => (
                                        <tr key={idx} className={cn("hover:bg-slate-50 transition-colors", row.winner && "bg-primary/5")}>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-3">
                                                    <div className={cn("h-3 w-3 rounded-full", row.winner ? "bg-primary" : "bg-slate-300")} />
                                                    <span className="font-black italic uppercase text-lg">{row.team.name}</span>
                                                    {row.winner && <CheckCircle2 className="h-4 w-4 text-primary" />}
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-center">
                                                <span className="text-2xl font-black">{row.score?.runs_scored || 0}/{row.score?.wickets_lost || 0}</span>
                                            </td>
                                            <td className="px-8 py-6 text-center text-slate-500 font-bold">
                                                {formatOvers(getBallsFromDecimal(row.score?.overs_played || 0))}
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <span className={cn("px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest", row.winner ? "bg-primary text-white" : "bg-slate-200 text-slate-500")}>
                                                    {row.winner ? "Winner" : "Runner Up"}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </CardContent>
                    </Card>
                )}

                {/* Live High-Level Scorecard (Visual) */}
                <div className="grid md:grid-cols-2 gap-8 mb-12">
                    <SummaryCard
                        team={match.team_a}
                        score={teamAScore}
                        isWinner={match.winner_id === match.team_a_id}
                        isLive={events[events.length - 1]?.innings_no === (teamAScore?.is_first_innings ? 1 : 2) && match.status === 'Live'}
                    />
                    <SummaryCard
                        team={match.team_b}
                        score={teamBScore}
                        isWinner={match.winner_id === match.team_b_id}
                        isLive={events[events.length - 1]?.innings_no === (teamBScore?.is_first_innings ? 1 : 2) && match.status === 'Live'}
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
                    <InningsScorecard inningsNo={1} team={match.team_a} events={events} players={players} scores={scores} />
                    <InningsScorecard inningsNo={2} team={match.team_b} events={events} players={players} scores={scores} />
                </div>
            </div>
        </div>
    )
}

function SummaryCard({ team, score, isLive, isWinner }: any) {
    const balls = getBallsFromDecimal(score?.overs_played || 0)
    return (
        <Card className={cn(
            "rounded-[3rem] border-none shadow-xl overflow-hidden p-10 transition-all relative group",
            isLive ? "bg-slate-900 text-white scale-105" : "bg-white",
            isWinner && !isLive && "border-2 border-primary/20 bg-gradient-to-br from-white to-primary/5"
        )}>
            {isWinner && (
                <div className="absolute top-0 right-10 bg-primary text-white px-6 py-2 rounded-b-2xl shadow-lg">
                    <Trophy className="h-5 w-5" />
                </div>
            )}
            <div className="flex justify-between items-center relative z-10">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-2">Competing Squad</p>
                    <h3 className="text-3xl font-black italic uppercase leading-none group-hover:text-primary transition-colors">{team.name}</h3>
                </div>
                <div className="text-right">
                    <p className="text-5xl font-black italic text-primary">{score?.runs_scored || 0}/{score?.wickets_lost || 0}</p>
                    <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest">{formatOvers(balls)} OVERS</p>
                </div>
            </div>
            {isLive && <div className="mt-8 flex items-center gap-2 text-[10px] font-black text-primary uppercase"><div className="h-2 w-2 bg-primary rounded-full animate-ping" /> Currently Batting</div>}
            {isWinner && !isLive && <div className="mt-8 flex items-center gap-2 text-[10px] font-black text-primary uppercase"><CheckCircle2 className="h-4 w-4" /> Match Winner</div>}
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
    const score = scores.find((s: any) => s.is_first_innings === (inningsNo === 1))

    if (inningsEvents.length === 0 && !score) return null

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
                    <p className="text-5xl font-black italic text-primary">{score?.runs_scored || 0}/{score?.wickets_lost || 0}</p>
                    <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest">{formatOvers(getBallsFromDecimal(score?.overs_played || 0))} OVERS</p>
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
            if (e.extra_type !== 'WIDE' && e.extra_type !== 'NO_BALL') bowlers[e.bowler_id].B += 1
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
