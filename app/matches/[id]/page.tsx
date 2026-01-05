"use client"

import { useEffect, useState, use } from "react"
import { Calendar, MapPin, Clock, ArrowLeft, Trophy, Users, Shield, Zap, TrendingUp, Activity, Target, History, ChevronRight, Award, BarChart3, PieChart } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import { SupabaseError } from "@/components/SupabaseError"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface Team {
    id: string
    name: string
    captain_name: string
    logo_url?: string
}

interface Ground {
    id: string
    name: string
    location: string
}

interface MatchScore {
    team_id: string
    runs_scored: number
    wickets_lost: number
    overs_played: number
    is_first_innings: boolean
}

interface PlayerPerformance {
    player_id: string
    player_name: string
    team_id: string
    runs: number
    balls_faced: number
    fours: number
    sixes: number
    wickets: number
    runs_conceded: number
    overs_bowled: number
}

interface Match {
    id: string
    match_date: string
    match_time: string
    overs_type: string
    status: string
    winner_id?: string
    team_a: Team
    team_b: Team
    ground: Ground
}

export default function MatchDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    if (!supabase) return <SupabaseError />
    const { id } = use(params)

    const [match, setMatch] = useState<Match | null>(null)
    const [scores, setScores] = useState<MatchScore[]>([])
    const [playerPerformances, setPlayerPerformances] = useState<PlayerPerformance[]>([])
    const [events, setEvents] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    const fetchMatchDetails = async () => {
        setLoading(true)

        // Fetch match details
        const { data: matchData } = await supabase
            .from('matches')
            .select(`
                *,
                team_a:teams!team_a_id(id, name, captain_name, logo_url),
                team_b:teams!team_b_id(id, name, captain_name, logo_url),
                ground:grounds(id, name, location)
            `)
            .eq('id', id)
            .single()

        if (matchData) {
            setMatch(matchData)

            // Fetch scores
            const { data: scoresData } = await supabase
                .from('match_scores')
                .select('*')
                .eq('match_id', id)
            setScores(scoresData || [])

            // Fetch player performances with player names
            const { data: perfData } = await supabase
                .from('player_performances')
                .select(`
                    *,
                    player:players(name)
                `)
                .eq('match_id', id)

            const formattedPerf = perfData?.map((p: any) => ({
                ...p,
                player_name: p.player?.name || 'Unknown'
            })) || []
            setPlayerPerformances(formattedPerf)

            // Fetch match events
            const { data: eventsData } = await supabase
                .from('match_events')
                .select('*')
                .eq('match_id', id)
                .order('created_at', { ascending: false })
            setEvents(eventsData || [])
        }

        setLoading(false)
    }

    useEffect(() => {
        fetchMatchDetails()

        const channel = supabase
            .channel(`match-detail-${id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'match_scores',
                    filter: `match_id=eq.${id}`
                },
                () => fetchMatchDetails()
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'matches',
                    filter: `id=eq.${id}`
                },
                () => fetchMatchDetails()
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'match_events',
                    filter: `match_id=eq.${id}`
                },
                () => fetchMatchDetails()
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'player_performances',
                    filter: `match_id=eq.${id}`
                },
                () => fetchMatchDetails()
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [id])

    if (loading) return <div className="p-20 text-center font-bold animate-pulse text-primary italic">Loading Match Details...</div>
    if (!match) return <div className="p-20 text-center">Match not found.</div>

    const teamAScore = scores.find(s => s.team_id === match.team_a.id)
    const teamBScore = scores.find(s => s.team_id === match.team_b.id)

    // Determine Winner Logic (Robust Fallback)
    let winnerId = match.winner_id

    if (!winnerId && match.status === 'Completed' && teamAScore && teamBScore) {
        // Fallback calculation if winner_id wasn't saved
        if (teamAScore.runs_scored > teamBScore.runs_scored) winnerId = match.team_a.id
        else if (teamBScore.runs_scored > teamAScore.runs_scored) winnerId = match.team_b.id
        // Handle Tie or Super Over logic here if needed (defaults to null/draw)
    }

    const winnerTeam = winnerId === match.team_a.id ? match.team_a : winnerId === match.team_b.id ? match.team_b : null
    const loserTeam = winnerId === match.team_a.id ? match.team_b : winnerId === match.team_b.id ? match.team_a : null

    const winnerScore = winnerId === match.team_a.id ? teamAScore : teamBScore
    const loserScore = winnerId === match.team_a.id ? teamBScore : teamAScore

    const runDifference = winnerScore && loserScore ? winnerScore.runs_scored - loserScore.runs_scored : 0
    const wicketDifference = loserScore ? 10 - loserScore.wickets_lost : 0

    // Calculate match statistics
    const totalRuns = (teamAScore?.runs_scored || 0) + (teamBScore?.runs_scored || 0)
    const totalWickets = (teamAScore?.wickets_lost || 0) + (teamBScore?.wickets_lost || 0)
    const totalBalls = events.length
    const totalFours = events.filter(e => e.runs_batter === 4).length
    const totalSixes = events.filter(e => e.runs_batter === 6).length

    // Top performers
    const topBatsman = playerPerformances.sort((a, b) => b.runs - a.runs)[0]
    const topBowler = playerPerformances.sort((a, b) => b.wickets - a.wickets)[0]

    // Batting performances by team
    const teamABatters = playerPerformances.filter(p => p.team_id === match.team_a.id && p.balls_faced > 0).sort((a, b) => b.runs - a.runs)
    const teamBBatters = playerPerformances.filter(p => p.team_id === match.team_b.id && p.balls_faced > 0).sort((a, b) => b.runs - a.runs)

    // Bowling performances by team
    const teamABowlers = playerPerformances.filter(p => p.team_id === match.team_a.id && p.overs_bowled > 0).sort((a, b) => b.wickets - a.wickets)
    const teamBBowlers = playerPerformances.filter(p => p.team_id === match.team_b.id && p.overs_bowled > 0).sort((a, b) => b.wickets - a.wickets)

    const totalOvers = match.overs_type === 'T10' ? 10 : match.overs_type === 'T20' ? 20 : match.overs_type === '50 Overs' ? 50 : 20

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <Link href="/schedule" className="inline-flex items-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary mb-4">
                        <ArrowLeft className="mr-1 h-3 w-3" /> Back to Schedule
                    </Link>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-3xl md:text-5xl font-black italic tracking-tighter uppercase">Match <span className="text-primary">Details</span></h1>
                            <p className="text-sm text-muted-foreground mt-2 font-bold uppercase tracking-wider">{match.overs_type} • {match.status}</p>
                        </div>
                        {match.status === 'Completed' && winnerTeam && (
                            <div className="bg-primary/10 border-2 border-primary rounded-3xl px-8 py-4 text-center">
                                <Trophy className="h-8 w-8 text-primary mx-auto mb-2" />
                                <p className="text-xs font-black uppercase tracking-widest text-primary mb-1">Winner</p>
                                <p className="text-2xl font-black italic">{winnerTeam.name}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Match Result Card */}
                {match.status === 'Completed' && winnerTeam && loserTeam && (
                    <Card className="mb-8 border-none shadow-2xl rounded-[3rem] overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
                        <CardContent className="p-8 md:p-12">
                            <div className="grid md:grid-cols-3 gap-8 items-center">
                                {/* Winner */}
                                <div className="text-center">
                                    <div className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-full bg-primary/20 mb-4">
                                        <Trophy className="h-8 w-8 md:h-10 md:w-10 text-primary" />
                                    </div>
                                    <h3 className="text-2xl md:text-3xl font-black italic mb-2">{winnerTeam.name}</h3>
                                    <p className="text-4xl md:text-5xl font-black text-primary mb-2">
                                        {winnerScore?.runs_scored}/{winnerScore?.wickets_lost}
                                    </p>
                                    <p className="text-sm opacity-60 font-bold">({winnerScore?.overs_played} overs)</p>
                                </div>

                                {/* Result */}
                                <div className="text-center my-4 md:my-0">
                                    <Award className="h-12 w-12 md:h-16 md:w-16 text-primary mx-auto mb-4" />
                                    <p className="text-lg md:text-xl font-black uppercase tracking-wider mb-2">Won By</p>
                                    <p className="text-2xl md:text-3xl font-black italic text-primary">
                                        {winnerScore?.is_first_innings
                                            ? `${runDifference} Runs`
                                            : `${wicketDifference} Wickets`
                                        }
                                    </p>
                                </div>

                                {/* Loser */}
                                <div className="text-center opacity-60">
                                    <div className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-full bg-white/10 mb-4">
                                        <Shield className="h-8 w-8 md:h-10 md:w-10" />
                                    </div>
                                    <h3 className="text-2xl md:text-3xl font-black italic mb-2">{loserTeam.name}</h3>
                                    <p className="text-4xl md:text-5xl font-black mb-2">
                                        {loserScore?.runs_scored}/{loserScore?.wickets_lost}
                                    </p>
                                    <p className="text-sm font-bold">({loserScore?.overs_played} overs)</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Match Info */}
                <div className="grid md:grid-cols-3 gap-6 mb-8">
                    <Card className="rounded-[2rem] border-2 hover:border-primary/30 transition-all">
                        <CardContent className="p-6 flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                                <Calendar className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Date</p>
                                <p className="text-lg font-black">{new Date(match.match_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="rounded-[2rem] border-2 hover:border-primary/30 transition-all">
                        <CardContent className="p-6 flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                                <Clock className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Time</p>
                                <p className="text-lg font-black">{match.match_time}</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="rounded-[2rem] border-2 hover:border-primary/30 transition-all">
                        <CardContent className="p-6 flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                                <MapPin className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Venue</p>
                                <p className="text-lg font-black truncate">{match.ground.name}</p>
                                <p className="text-xs text-muted-foreground">{match.ground.location}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Match Statistics */}
                <Card className="mb-8 rounded-[3rem] border-none shadow-xl">
                    <CardHeader className="border-b bg-slate-50">
                        <div className="flex items-center gap-3">
                            <BarChart3 className="h-6 w-6 text-primary" />
                            <CardTitle className="text-2xl font-black italic">Match Statistics</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="p-8">
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                            <StatBox label="Total Runs" value={totalRuns.toString()} />
                            <StatBox label="Total Wickets" value={totalWickets.toString()} />
                            <StatBox label="Total Balls" value={totalBalls.toString()} />
                            <StatBox label="Fours" value={totalFours.toString()} />
                            <StatBox label="Sixes" value={totalSixes.toString()} />
                        </div>
                    </CardContent>
                </Card>

                {/* Scorecard */}
                <div className="grid md:grid-cols-2 gap-8 mb-8">
                    {/* Team A Scorecard */}
                    <Card className="rounded-[3rem] border-none shadow-xl overflow-hidden">
                        <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-500 text-white p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-2xl font-black italic">{match.team_a.name}</CardTitle>
                                    <p className="text-sm opacity-80 mt-1">{teamAScore?.is_first_innings ? '1st Innings' : '2nd Innings'}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-4xl font-black">{teamAScore?.runs_scored || 0}/{teamAScore?.wickets_lost || 0}</p>
                                    <p className="text-sm opacity-80">({teamAScore?.overs_played || 0} overs)</p>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6">
                            <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
                                <Users className="h-4 w-4" /> Batting Performance
                            </h4>
                            <div className="space-y-3">
                                {teamABatters.length > 0 ? teamABatters.map((player, idx) => (
                                    <BattingRow key={idx} player={player} isTopScorer={idx === 0} />
                                )) : (
                                    <p className="text-sm text-muted-foreground italic">No batting data available</p>
                                )}
                            </div>

                            <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-4 mt-8 flex items-center gap-2">
                                <Target className="h-4 w-4" /> Bowling Performance
                            </h4>
                            <div className="space-y-3">
                                {teamABowlers.length > 0 ? teamABowlers.map((player, idx) => (
                                    <BowlingRow key={idx} player={player} isTopBowler={idx === 0} />
                                )) : (
                                    <p className="text-sm text-muted-foreground italic">No bowling data available</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Team B Scorecard */}
                    <Card className="rounded-[3rem] border-none shadow-xl overflow-hidden">
                        <CardHeader className="bg-gradient-to-r from-red-600 to-red-500 text-white p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-2xl font-black italic">{match.team_b.name}</CardTitle>
                                    <p className="text-sm opacity-80 mt-1">{teamBScore?.is_first_innings ? '1st Innings' : '2nd Innings'}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-4xl font-black">{teamBScore?.runs_scored || 0}/{teamBScore?.wickets_lost || 0}</p>
                                    <p className="text-sm opacity-80">({teamBScore?.overs_played || 0} overs)</p>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6">
                            <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
                                <Users className="h-4 w-4" /> Batting Performance
                            </h4>
                            <div className="space-y-3">
                                {teamBBatters.length > 0 ? teamBBatters.map((player, idx) => (
                                    <BattingRow key={idx} player={player} isTopScorer={idx === 0} />
                                )) : (
                                    <p className="text-sm text-muted-foreground italic">No batting data available</p>
                                )}
                            </div>

                            <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-4 mt-8 flex items-center gap-2">
                                <Target className="h-4 w-4" /> Bowling Performance
                            </h4>
                            <div className="space-y-3">
                                {teamBBowlers.length > 0 ? teamBBowlers.map((player, idx) => (
                                    <BowlingRow key={idx} player={player} isTopBowler={idx === 0} />
                                )) : (
                                    <p className="text-sm text-muted-foreground italic">No bowling data available</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Player of the Match */}
                {topBatsman && topBowler && (
                    <Card className="mb-8 rounded-[3rem] border-none shadow-xl bg-gradient-to-br from-amber-50 to-orange-50">
                        <CardHeader className="border-b">
                            <div className="flex items-center gap-3">
                                <Award className="h-6 w-6 text-amber-600" />
                                <CardTitle className="text-2xl font-black italic">Star Performers</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="p-8">
                            <div className="grid md:grid-cols-2 gap-8">
                                <div className="text-center p-6 bg-white rounded-3xl shadow-lg">
                                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 mb-4">
                                        <Zap className="h-8 w-8 text-amber-600" />
                                    </div>
                                    <p className="text-xs font-black uppercase tracking-widest text-amber-600 mb-2">Top Batsman</p>
                                    <p className="text-2xl font-black italic mb-2">{topBatsman.player_name}</p>
                                    <p className="text-4xl font-black text-primary mb-1">{topBatsman.runs}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {topBatsman.balls_faced} balls • {topBatsman.fours} fours • {topBatsman.sixes} sixes
                                    </p>
                                    <p className="text-xs font-bold text-primary mt-2">
                                        SR: {topBatsman.balls_faced > 0 ? ((topBatsman.runs / topBatsman.balls_faced) * 100).toFixed(2) : '0.00'}
                                    </p>
                                </div>

                                <div className="text-center p-6 bg-white rounded-3xl shadow-lg">
                                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
                                        <Target className="h-8 w-8 text-red-600" />
                                    </div>
                                    <p className="text-xs font-black uppercase tracking-widest text-red-600 mb-2">Top Bowler</p>
                                    <p className="text-2xl font-black italic mb-2">{topBowler.player_name}</p>
                                    <p className="text-4xl font-black text-primary mb-1">{topBowler.wickets}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {topBowler.overs_bowled} overs • {topBowler.runs_conceded} runs
                                    </p>
                                    <p className="text-xs font-bold text-primary mt-2">
                                        Econ: {topBowler.overs_bowled > 0 ? (topBowler.runs_conceded / topBowler.overs_bowled).toFixed(2) : '0.00'}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    )
}

function StatBox({ label, value }: { label: string, value: string }) {
    return (
        <div className="text-center p-6 bg-slate-50 rounded-2xl hover:bg-primary/5 transition-all">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">{label}</p>
            <p className="text-3xl font-black italic text-primary">{value}</p>
        </div>
    )
}

function BattingRow({ player, isTopScorer }: { player: PlayerPerformance, isTopScorer: boolean }) {
    const strikeRate = player.balls_faced > 0 ? ((player.runs / player.balls_faced) * 100).toFixed(1) : '0.0'

    return (
        <div className={cn(
            "flex items-center justify-between p-4 rounded-2xl transition-all",
            isTopScorer ? "bg-primary/10 border-2 border-primary/20" : "bg-slate-50 hover:bg-slate-100"
        )}>
            <div className="flex-grow">
                <div className="flex items-center gap-2">
                    <p className="font-black text-sm">{player.player_name}</p>
                    {isTopScorer && <Award className="h-4 w-4 text-primary" />}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                    {player.balls_faced} balls • {player.fours} fours • {player.sixes} sixes
                </p>
            </div>
            <div className="text-right">
                <p className="text-2xl font-black text-primary">{player.runs}</p>
                <p className="text-[10px] font-bold text-muted-foreground">SR: {strikeRate}</p>
            </div>
        </div>
    )
}

function BowlingRow({ player, isTopBowler }: { player: PlayerPerformance, isTopBowler: boolean }) {
    const economy = player.overs_bowled > 0 ? (player.runs_conceded / player.overs_bowled).toFixed(2) : '0.00'

    return (
        <div className={cn(
            "flex items-center justify-between p-4 rounded-2xl transition-all",
            isTopBowler ? "bg-primary/10 border-2 border-primary/20" : "bg-slate-50 hover:bg-slate-100"
        )}>
            <div className="flex-grow">
                <div className="flex items-center gap-2">
                    <p className="font-black text-sm">{player.player_name}</p>
                    {isTopBowler && <Award className="h-4 w-4 text-primary" />}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                    {player.overs_bowled} overs • {player.runs_conceded} runs
                </p>
            </div>
            <div className="text-right">
                <p className="text-2xl font-black text-primary">{player.wickets}</p>
                <p className="text-[10px] font-bold text-muted-foreground">Econ: {economy}</p>
            </div>
        </div>
    )
}
