"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Trophy, Calendar, Users, MapPin, ArrowLeft, Loader2, Star, Zap } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface Tournament {
    id: string
    name: string
    status: string
    created_at: string
}

interface Team {
    id: string
    name: string
}

interface Match {
    id: string
    team_a: { name: string }
    team_b: { name: string }
    ground: { name: string }
    match_date: string
    match_time: string
    status: string
    overs_type: string
}

function TournamentContent() {
    const searchParams = useSearchParams()
    const id = searchParams.get("id")
    const [tournament, setTournament] = useState<Tournament | null>(null)
    const [teams, setTeams] = useState<Team[]>([])
    const [matches, setMatches] = useState<Match[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchData() {
            setLoading(true)
            console.log("FETCHING TOURNAMENT DATA. URL ID:", id)
            try {
                let tournamentId = id

                // If no ID, get the latest tournament
                if (!tournamentId) {
                    const { data: latest, error: lError } = await supabase
                        .from('tournaments')
                        .select('id')
                        .order('created_at', { ascending: false })
                        .limit(1)

                    if (lError) {
                        console.error("Latest Tournament Fetch Error:", lError)
                    }

                    if (latest && latest.length > 0) {
                        tournamentId = latest[0].id
                    }
                }

                if (!tournamentId) {
                    console.log("No tournament ID found, and no tournaments in database.")
                    setLoading(false)
                    return
                }

                console.log("Fetching data for Tournament ID:", tournamentId)

                // Fetch Tournament
                const { data: tData, error: tError } = await supabase
                    .from('tournaments')
                    .select('*')
                    .eq('id', tournamentId)
                    .single()

                if (tError) {
                    console.error("Tournament Fetch Error:", tError)
                }
                if (tData) setTournament(tData)

                // Fetch Teams
                const { data: ttData, error: ttError } = await supabase
                    .from('tournament_teams')
                    .select('team_id, teams(id, name)')
                    .eq('tournament_id', tournamentId)

                if (ttError) console.error("Teams Fetch Error:", ttError)
                if (ttData) {
                    // Filter out any null teams to prevent crashes
                    const validTeams = ttData
                        .map((item: any) => item.teams)
                        .filter((t: any) => t !== null)
                    setTeams(validTeams)
                    console.log(`Found ${validTeams.length} valid teams`)
                }

                // Fetch Matches with simpler joins for compatibility
                const { data: mData, error: mError } = await supabase
                    .from('matches')
                    .select(`
                        id,
                        match_date,
                        match_time,
                        status,
                        overs_type,
                        team_a:team_a_id(name),
                        team_b:team_b_id(name),
                        ground:ground_id(name)
                    `)
                    .eq('tournament_id', tournamentId)
                    .order('match_date', { ascending: true })

                if (mError) {
                    console.error("Match Fetch Error:", mError)
                    // If alias-based join fails, try a flat fetch
                    const { data: flatData } = await supabase
                        .from('matches')
                        .select('*, team_a:teams!team_a_id(name), team_b:teams!team_b_id(name), ground:grounds(name)')
                        .eq('tournament_id', tournamentId)
                    if (flatData) setMatches(flatData)
                } else if (mData) {
                    setMatches(mData)
                }

            } catch (error) {
                console.error("Unexpected Error in fetchData:", error)
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [id])

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center space-y-4">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                    <p className="text-muted-foreground font-medium">Loading Tournament Details...</p>
                </div>
            </div>
        )
    }

    if (!tournament) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <Card className="max-w-md w-full text-center p-8 space-y-6">
                    <Trophy className="h-16 w-16 text-muted-foreground mx-auto opacity-20" />
                    <div className="space-y-2">
                        <CardTitle className="text-2xl">No Tournament Found</CardTitle>
                        <CardDescription>We couldn't find any active or past tournaments.</CardDescription>
                    </div>
                    <Button asChild className="w-full rounded-xl">
                        <Link href="/admin/tournaments/new">Create Tournament</Link>
                    </Button>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto space-y-12">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                    <div className="space-y-4">
                        <Link href="/" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
                        </Link>
                        <div className="space-y-2">
                            <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest border border-primary/20">
                                <Star className="h-3 w-3 mr-2 fill-primary" /> Premier League
                            </div>
                            <h1 className="text-5xl font-black italic tracking-tight text-slate-900 leading-none">
                                {tournament.name}
                            </h1>
                            <p className="text-muted-foreground font-medium">Official Tournament Schedule & Standings</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <div className="px-6 py-3 bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Status</span>
                            <span className="text-lg font-black text-primary">{tournament.status}</span>
                        </div>
                        <div className="px-6 py-3 bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Teams</span>
                            <span className="text-lg font-black text-slate-900">{teams.length}</span>
                        </div>
                    </div>
                </div>

                <div className="grid lg:grid-cols-3 gap-12">
                    {/* Left Column: Teams & Info */}
                    <div className="space-y-8">
                        <Card className="border-none shadow-xl rounded-[2.5rem] overflow-hidden">
                            <CardHeader className="bg-slate-900 text-white p-8">
                                <CardTitle className="flex items-center gap-3">
                                    <Users className="h-6 w-6 text-primary" />
                                    Participating Squads
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6 space-y-4">
                                {teams.length > 0 ? teams.map((team) => (
                                    <div key={team.id} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-colors border-2 border-transparent hover:border-slate-100">
                                        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center font-black text-primary text-xl shadow-inner">
                                            {team.name[0]}
                                        </div>
                                        <div className="font-bold text-slate-800 text-lg">{team.name}</div>
                                    </div>
                                )) : (
                                    <div className="text-center py-8 opacity-50">
                                        <p className="text-sm font-bold">No teams registered for this tournament.</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="bg-primary text-primary-foreground border-none overflow-hidden relative shadow-2xl shadow-primary/20 rounded-[2.5rem]">
                            <CardContent className="p-8 space-y-4 relative z-10">
                                <Trophy className="h-12 w-12 opacity-50 mb-2" />
                                <h3 className="text-2xl font-black leading-tight">Win the Cup</h3>
                                <p className="text-sm opacity-80 leading-relaxed font-medium">All statistics and individual player performances are tracked live during the matches.</p>
                            </CardContent>
                            <Star className="absolute -bottom-10 -right-10 h-48 w-48 opacity-10 pointer-events-none rotate-12" />
                        </Card>
                    </div>

                    {/* Right Column: Fixtures */}
                    <div className="lg:col-span-2 space-y-8">
                        <div className="flex items-center justify-between">
                            <h2 className="text-3xl font-black italic tracking-tight flex items-center gap-3">
                                <Calendar className="h-8 w-8 text-primary" /> Match Fixtures
                            </h2>
                            <span className="px-4 py-1.5 rounded-full bg-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-widest">
                                {matches.length} Total Matches
                            </span>
                        </div>

                        <div className="space-y-6">
                            {matches.length > 0 ? matches.map((match) => (
                                <Card key={match.id} className="overflow-hidden hover:shadow-2xl transition-all border-none bg-white rounded-[2rem] group">
                                    <CardContent className="p-0">
                                        <div className="flex flex-col md:flex-row items-stretch">
                                            {/* Date Box */}
                                            <div className="md:w-32 bg-slate-100 flex flex-col items-center justify-center p-6 border-r border-slate-50 group-hover:bg-primary/5 transition-colors">
                                                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Date</span>
                                                <span className="text-lg font-black text-slate-900 leading-none">
                                                    {new Date(match.match_date).toLocaleDateString('en-US', { day: '2-digit', month: 'short' })}
                                                </span>
                                            </div>

                                            {/* Teams Box */}
                                            <div className="flex-1 p-8">
                                                <div className="flex items-center justify-between gap-8">
                                                    <div className="flex-1 text-center">
                                                        <div className="h-16 w-16 bg-slate-50 border-2 border-slate-100 rounded-2xl mx-auto flex items-center justify-center font-black text-2xl mb-3 shadow-sm group-hover:scale-110 group-hover:bg-white transition-all">
                                                            {match.team_a?.name?.[0] || 'A'}
                                                        </div>
                                                        <p className="font-black text-sm uppercase tracking-tight">{match.team_a?.name || 'Team A'}</p>
                                                    </div>

                                                    <div className="flex flex-col items-center">
                                                        <div className="text-[10px] font-black italic opacity-20 uppercase tracking-[0.3em] mb-2">VERSUS</div>
                                                        <div className="h-12 w-12 rounded-full border border-slate-200 flex items-center justify-center bg-white shadow-sm font-black text-xs text-primary italic">VS</div>
                                                    </div>

                                                    <div className="flex-1 text-center">
                                                        <div className="h-16 w-16 bg-slate-50 border-2 border-slate-100 rounded-2xl mx-auto flex items-center justify-center font-black text-2xl mb-3 shadow-sm group-hover:scale-110 group-hover:bg-white transition-all">
                                                            {match.team_b?.name?.[0] || 'B'}
                                                        </div>
                                                        <p className="font-black text-sm uppercase tracking-tight">{match.team_b?.name || 'Team B'}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Info Box */}
                                            <div className="md:w-48 bg-slate-100/50 p-8 border-l border-slate-50 flex flex-col justify-center items-center gap-4">
                                                <div className="text-center">
                                                    <p className="text-[10px] uppercase font-black text-primary mb-1 flex items-center justify-center gap-1">
                                                        <MapPin className="h-3 w-3" /> {match.ground?.name || 'Thondamuthur boys high school ground'}
                                                    </p>
                                                    <p className="text-xs font-bold text-muted-foreground">{match.match_time.slice(0, 5)} • {match.overs_type}</p>
                                                </div>
                                                <Button size="sm" className="w-full rounded-xl font-bold h-10 shadow-lg group-hover:scale-105 transition-transform" asChild>
                                                    <Link href={`/matches/${match.id}`}>
                                                        <Zap className="h-3.5 w-3.5 mr-2 fill-current" /> Live Score
                                                    </Link>
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )) : (
                                <div className="text-center p-12 bg-white rounded-3xl border-2 border-dashed border-slate-200 opacity-50">
                                    <Calendar className="h-12 w-12 mx-auto mb-4" />
                                    <p className="font-bold">No match fixtures scheduled for this tournament.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default function TournamentPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        }>
            <TournamentContent />
        </Suspense>
    )
}
