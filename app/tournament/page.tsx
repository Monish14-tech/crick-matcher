"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Trophy, Calendar, Users, MapPin, ArrowLeft, Loader2, Star, Zap, Activity, Shield, Swords, ArrowRight, TrendingUp, BarChart3 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"

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
            try {
                let tournamentId = id
                if (!tournamentId) {
                    const { data: latest } = await supabase.from('tournaments').select('id').order('created_at', { ascending: false }).limit(1)
                    if (latest && latest.length > 0) tournamentId = latest[0].id
                }

                if (!tournamentId) {
                    setLoading(false)
                    return
                }

                const { data: tData } = await supabase.from('tournaments').select('*').eq('id', tournamentId).single()
                if (tData) {
                    setTournament(tData)
                    document.title = `${tData.name} | Tournament Center`;
                }

                const { data: ttData } = await supabase.from('tournament_teams').select('team_id, teams(id, name)').eq('tournament_id', tournamentId)
                if (ttData) {
                    const validTeams = ttData.map((item: any) => item.teams).filter((t: any) => t !== null)
                    setTeams(validTeams)
                }

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
                    const { data: flatData } = await supabase.from('matches').select('*, team_a:teams!team_a_id(name), team_b:teams!team_b_id(name), ground:grounds(name)').eq('tournament_id', tournamentId)
                    if (flatData) setMatches(flatData)
                } else if (mData) {
                    setMatches(mData)
                }
            } catch (error) {
                console.error(error)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [id])

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 text-slate-100 pb-32 animate-pulse">
                {/* Hero Skeleton */}
                <div className="pt-32 pb-48 px-4 max-w-7xl mx-auto space-y-12">
                    <div className="h-4 w-48 bg-white/5 rounded-full" />
                    <div className="space-y-6">
                        <div className="h-10 w-64 bg-white/10 rounded-xl" />
                        <div className="h-32 w-full max-w-3xl bg-white/10 rounded-3xl" />
                        <div className="h-6 w-72 bg-white/5 rounded-full" />
                    </div>
                </div>

                {/* Content Skeleton */}
                <div className="max-w-7xl mx-auto px-4 -mt-24 grid lg:grid-cols-12 gap-12">
                    <div className="lg:col-span-4 space-y-10">
                        <div className="h-[500px] bg-white/5 rounded-[3rem] border border-white/5" />
                        <div className="h-64 bg-white/5 rounded-[3rem] border border-white/5" />
                    </div>
                    <div className="lg:col-span-8 space-y-12">
                        <div className="flex flex-col gap-4">
                            <div className="h-2 w-20 bg-primary/20 rounded-full" />
                            <div className="h-12 w-96 bg-white/10 rounded-2xl" />
                        </div>
                        <div className="space-y-6">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-44 bg-white/5 rounded-[2.5rem] border border-white/5" />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    if (!tournament) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-4 text-center">
                <div className="h-24 w-24 bg-white/5 rounded-full flex items-center justify-center mb-8 border border-white/10">
                    <Trophy className="h-10 w-10 text-slate-700" />
                </div>
                <h1 className="text-4xl font-black italic uppercase text-white mb-2">Tournament <span className="text-primary italic">Not Found</span></h1>
                <p className="text-slate-500 font-bold max-w-sm mb-10 text-sm">No active campaigns discovered in this sector. Initiate a new league to begin tracking.</p>
                <Button asChild className="h-16 px-8 rounded-2xl font-black italic uppercase tracking-widest bg-primary hover:scale-105 transition-all outline-none border-none">
                    <Link href="/admin/tournaments/new">Initiate Campaign</Link>
                </Button>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 pb-32">
            {/* Immersive Cinematic Hero */}
            <div className="relative pt-32 pb-48 overflow-hidden">
                <div className="absolute top-0 right-0 w-[1000px] h-[1000px] bg-primary/10 rounded-full blur-[150px] -mr-96 -mt-96 opacity-50" />
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-[100px] -ml-48 -mb-24" />

                <div className="max-w-7xl mx-auto px-4 relative z-10">
                    <Link href="/" className="inline-flex items-center text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 hover:text-primary mb-12 transition-all group">
                        <ArrowLeft className="mr-2 h-3.5 w-3.5 group-hover:-translate-x-1 transition-transform" />
                        Main Interface / Operations
                    </Link>

                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-12">
                        <div className="space-y-6">
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="inline-flex items-center gap-2 bg-primary/20 text-primary px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-[0.3em] border border-primary/20"
                            >
                                <Star className="h-3.5 w-3.5 fill-primary" />
                                Elite Division League
                            </motion.div>
                            <h1 className="text-6xl md:text-8xl font-black italic uppercase tracking-tighter leading-[0.85] text-white">
                                {tournament.name}
                            </h1>
                            <p className="text-slate-400 font-bold text-sm tracking-widest uppercase flex items-center gap-3">
                                <Activity className="h-4 w-4 text-primary" />
                                Monitoring Match-Level Intelligence
                            </p>
                        </div>

                        <div className="flex gap-4">
                            <StatBadge label="Status" value={tournament.status} color="primary" />
                            <StatBadge label="Deployment" value={`${teams.length} Squads`} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 -mt-24 relative z-20">
                <div className="grid lg:grid-cols-12 gap-12">
                    {/* Left Panel: Participating Squads */}
                    <div className="lg:col-span-4 space-y-10">
                        <Card className="glass-card-dark border-white/5 p-8 rounded-[3rem] shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 h-40 w-40 bg-primary/5 rounded-full -mr-20 -mt-20 blur-3xl group-hover:bg-primary/10 transition-colors" />
                            <div className="relative z-10 space-y-8">
                                <div className="flex items-center justify-between border-b border-white/5 pb-6">
                                    <h3 className="text-[12px] font-black uppercase tracking-[0.4em] text-slate-400">Combatants</h3>
                                    <Users className="h-5 w-5 text-primary" />
                                </div>
                                <div className="space-y-4">
                                    {teams.length > 0 ? teams.map((team, idx) => (
                                        <motion.div
                                            key={team.id}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                        >
                                            <Link href={`/teams/${team.id}`} className="flex items-center gap-4 p-4 rounded-2xl bg-white/2 hover:bg-white/5 border border-transparent hover:border-white/5 transition-all group/team">
                                                <div className="h-14 w-14 rounded-2xl bg-white/5 flex items-center justify-center font-black text-2xl text-white italic group-hover/team:bg-primary group-hover/team:scale-110 transition-all shadow-inner">
                                                    {team.name[0]}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-black italic uppercase tracking-tighter text-white truncate text-lg">{team.name}</p>
                                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 group-hover/team:text-primary transition-colors">Official Squad Profile</p>
                                                </div>
                                                <ArrowRight className="h-4 w-4 text-slate-800 opacity-0 group-hover/team:opacity-100 group-hover/team:text-primary transition-all" />
                                            </Link>
                                        </motion.div>
                                    )) : (
                                        <div className="text-center py-12 bg-white/2 rounded-[2rem] border border-dashed border-white/5">
                                            <Shield className="h-10 w-10 mx-auto text-slate-800 mb-4" />
                                            <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">No Squads Joined</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Card>

                        <Card className="glass-card-dark border-white/5 p-12 rounded-[3rem] shadow-2xl relative overflow-hidden bg-gradient-to-br from-slate-900 to-indigo-900/40 group">
                            <div className="relative z-10 space-y-6">
                                <Trophy className="h-14 w-14 text-primary fill-primary/20 animate-float mb-4" />
                                <h3 className="text-3xl font-black italic tracking-tighter uppercase leading-none text-white">Championship <br />Tracking</h3>
                                <p className="text-slate-400 font-bold text-sm leading-relaxed">Advanced analytics monitor every delivery, ensuring integrity across entire league operations.</p>
                                <div className="pt-4 flex items-center gap-3 text-primary">
                                    <TrendingUp className="h-5 w-5" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em]">Live Data Stream</span>
                                </div>
                            </div>
                            <Star className="absolute -bottom-10 -right-10 h-64 w-64 opacity-10 text-white pointer-events-none rotate-12 group-hover:rotate-[20deg] transition-transform duration-1000" />
                        </Card>
                    </div>

                    {/* Right Panel: Campaign Fixtures */}
                    <div className="lg:col-span-8 space-y-12">
                        <div className="flex items-end justify-between px-4">
                            <div className="space-y-1">
                                <div className="h-1.5 w-16 bg-primary rounded-full mb-4" />
                                <h2 className="text-5xl font-black italic uppercase tracking-tighter text-white">Campaign <span className="text-primary italic">Fixtures</span></h2>
                                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Execution Timeline / {matches.length} Engagements</p>
                            </div>
                            <div className="hidden md:flex items-center gap-3">
                                <Button className="h-12 w-12 rounded-xl bg-white/5 border border-white/10 p-0">
                                    <BarChart3 className="h-5 w-5 text-slate-500" />
                                </Button>
                                <Button className="h-12 px-6 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-slate-300">
                                    All Operations
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-6">
                            {matches.length > 0 ? matches.map((match, idx) => (
                                <motion.div
                                    key={match.id}
                                    initial={{ opacity: 0, y: 30 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                >
                                    <Card className="glass-card-dark border-white/5 overflow-hidden group hover:border-primary/50 transition-all duration-500 rounded-[2.5rem] bg-gradient-to-r from-slate-900/60 to-slate-950">
                                        <div className="flex flex-col md:flex-row items-stretch min-h-[160px]">
                                            {/* Tactical Date Identifier */}
                                            <div className="md:w-36 bg-white/2 flex flex-col items-center justify-center p-8 border-b md:border-b-0 md:border-r border-white/5 group-hover:bg-primary/5 transition-all">
                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2 leading-none">Schedule</span>
                                                <span className="text-4xl font-black text-white italic tracking-tighter leading-none group-hover:scale-110 transition-transform">
                                                    {new Date(match.match_date).toLocaleDateString('en-US', { day: '2-digit' })}
                                                </span>
                                                <span className="text-[10px] font-black text-primary uppercase tracking-widest mt-1">
                                                    {new Date(match.match_date).toLocaleDateString('en-US', { month: 'short' })}
                                                </span>
                                            </div>

                                            {/* Combat Area */}
                                            <div className="flex-1 p-10 flex items-center justify-center">
                                                <div className="w-full flex items-center justify-between gap-12">
                                                    <div className="flex-1 text-right space-y-3">
                                                        <p className="font-black italic uppercase tracking-tighter text-white text-xl md:text-2xl truncate group-hover:text-primary transition-colors">{match.team_a?.name || 'A'}</p>
                                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-600">Offensive Unit</p>
                                                    </div>

                                                    <div className="shrink-0 flex flex-col items-center justify-center">
                                                        <div className="h-1 w-12 bg-white/5 rounded-full mb-4 md:hidden" />
                                                        <div className="h-14 w-14 rounded-2xl border border-white/5 flex items-center justify-center bg-white/2 shadow-[0_0_20px_rgba(37,99,235,0.1)] font-black text-sm text-primary italic rotate-45 group-hover:rotate-[135deg] transition-all duration-700">
                                                            <div className="-rotate-45 group-hover:-rotate-[135deg] transition-all duration-700">VS</div>
                                                        </div>
                                                        <div className="h-1 w-12 bg-white/5 rounded-full mt-4 md:hidden" />
                                                    </div>

                                                    <div className="flex-1 text-left space-y-3">
                                                        <p className="font-black italic uppercase tracking-tighter text-white text-xl md:text-2xl truncate group-hover:text-primary transition-colors">{match.team_b?.name || 'B'}</p>
                                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-600">Defensive Unit</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Operational Intel */}
                                            <div className="md:w-60 bg-white/2 p-10 flex flex-col justify-center items-center gap-6 border-t md:border-t-0 md:border-l border-white/5 group-hover:bg-primary/2 transition-all">
                                                <div className="text-center space-y-2">
                                                    <div className="flex items-center justify-center gap-2 text-[10px] uppercase font-black text-slate-400">
                                                        <MapPin className="h-3.5 w-3.5 text-primary" />
                                                        <span className="truncate max-w-[120px]">{match.ground?.name || 'Grand Arena'}</span>
                                                    </div>
                                                    <div className="flex items-center justify-center gap-2 text-[10px] uppercase font-black text-slate-500">
                                                        <Swords className="h-3.5 w-3.5" />
                                                        <span>{match.match_time.slice(0, 5)} • {match.overs_type}</span>
                                                    </div>
                                                </div>

                                                <div className={cn(
                                                    "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-[0.2em] mb-2",
                                                    match.status === 'Live' ? 'bg-red-500/10 text-red-500 border border-red-500/20 animate-pulse' :
                                                        match.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                                                            'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                                                )}>
                                                    {match.status}
                                                </div>

                                                <Button className="w-full h-12 rounded-xl bg-white/5 group-hover:bg-primary group-hover:text-white border border-white/5 transition-all duration-500 shadow-xl" asChild>
                                                    <Link href={`/matches/${match.id}`} className="flex items-center justify-center gap-2">
                                                        <Zap className="h-3.5 w-3.5 fill-current" />
                                                        <span className="font-black italic uppercase tracking-widest text-[10px]">Match Center</span>
                                                    </Link>
                                                </Button>
                                            </div>
                                        </div>
                                    </Card>
                                </motion.div>
                            )) : (
                                <div className="text-center py-40 bg-white/2 rounded-[4rem] border-2 border-dashed border-white/5">
                                    <div className="h-20 w-20 bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-white/10">
                                        <Calendar className="h-10 w-10 text-slate-800" />
                                    </div>
                                    <h3 className="text-3xl font-black italic uppercase italic text-slate-400">Schedule Clear</h3>
                                    <p className="text-slate-600 font-bold max-w-sm mx-auto text-sm mt-2 uppercase tracking-widest">No engagements have been logged in the mission calendar.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

function StatBadge({ label, value, color = "slate" }: { label: string, value: string, color?: "primary" | "slate" }) {
    return (
        <div className={cn(
            "px-6 py-4 rounded-3xl border shadow-2xl flex flex-col items-center min-w-[120px] transition-all hover:scale-105",
            color === "primary" ? "bg-primary/10 border-primary/20" : "bg-white/5 border-white/10"
        )}>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{label}</span>
            <span className={cn(
                "text-xl font-black italic uppercase tracking-tighter leading-none",
                color === "primary" ? "text-primary" : "text-white"
            )}>{value}</span>
        </div>
    )
}

export default function TournamentPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-6">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-slate-500 font-black uppercase tracking-[0.3em] text-[10px]">Synchronizing Arena...</p>
            </div>
        }>
            <TournamentContent />
        </Suspense>
    )
}
