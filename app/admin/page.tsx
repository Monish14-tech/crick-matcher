"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Trophy, Calendar, MapPin, Users, Activity, Plus, Settings, BarChart3, Wand2, Zap, ArrowRight, Star, Trash, LogOut, Shield, ChevronRight, LayoutDashboard, Database, Radio } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import { SupabaseError } from "@/components/SupabaseError"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

export default function AdminDashboard() {
    if (!supabase) return <SupabaseError />

    const [stats, setStats] = useState({
        teams: 0,
        matches: 0,
        grounds: 0,
        players: 0
    })
    const [recentMatches, setRecentMatches] = useState<any[]>([])
    const [teamsList, setTeamsList] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchData() {
            setLoading(true)
            const [
                { count: teamsCount, data: teamsData },
                { count: matchesCount },
                { count: groundsCount },
                { count: playersCount },
                { data: matchData }
            ] = await Promise.all([
                supabase.from('teams').select('*', { count: 'exact' }).order('created_at', { ascending: false }),
                supabase.from('matches').select('*', { count: 'exact', head: true }),
                supabase.from('grounds').select('*', { count: 'exact', head: true }),
                supabase.from('players').select('*', { count: 'exact', head: true }),
                supabase.from('matches').select('*, team_a:teams!team_a_id(name), team_b:teams!team_b_id(name)').order('created_at', { ascending: false }).limit(4)
            ])

            setStats({
                teams: teamsCount || 0,
                matches: matchesCount || 0,
                grounds: groundsCount || 0,
                players: playersCount || 0
            })
            setRecentMatches(matchData || [])
            setTeamsList(teamsData || [])
            setLoading(false)
        }

        fetchData()
    }, [])

    const handleDeleteMatch = async (id: string) => {
        if (!confirm("Are you sure you want to delete this match permanently?")) return
        const { error } = await supabase.from('matches').delete().eq('id', id)
        if (!error) {
            setRecentMatches(prev => prev.filter(m => m.id !== id))
            setStats(prev => ({ ...prev, matches: Math.max(0, prev.matches - 1) }))
        }
    }

    const handleDeleteTeam = async (id: string) => {
        if (!confirm("Warning: Deleting a team is permanent. Proceed?")) return
        const { error } = await supabase.from('teams').delete().eq('id', id)
        if (!error) {
            setTeamsList(prev => prev.filter(t => t.id !== id))
            setStats(prev => ({ ...prev, teams: Math.max(0, prev.teams - 1) }))
        }
    }

    const handleResetAllData = async () => {
        if (!confirm("CRITICAL WARNING: This will PERMANENTLY ERASE everything. Proceed?")) return
        setLoading(true)
        try {
            const tables = ['match_events', 'player_performances', 'match_scores', 'match_active_state', 'tournament_teams', 'matches', 'players', 'teams', 'tournaments', 'grounds']
            for (const table of tables) {
                await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000')
            }
            window.location.reload()
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-primary/30 antialiased overflow-x-hidden">
            {/* Command Header */}
            <div className="relative pt-16 sm:pt-20 md:pt-24 pb-8 sm:pb-10 md:pb-12 px-4 sm:px-6 overflow-hidden border-b border-white/5 bg-white/[0.02]">
                <div className="absolute top-0 right-0 w-[400px] sm:w-[600px] h-[400px] sm:h-[600px] bg-primary/5 rounded-full blur-[120px] -mr-64 -mt-32 opacity-50" />
                <div className="max-w-7xl mx-auto relative z-10">
                    <div className="flex flex-col gap-6 sm:gap-8">
                        <div>
                            <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-primary/20 flex items-center justify-center border border-primary/20">
                                    <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                                </div>
                                <span className="text-[9px] sm:text-xs font-black uppercase tracking-[0.3em] sm:tracking-[0.4em] text-slate-500">Secure Command Node</span>
                            </div>
                            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black italic uppercase tracking-tighter text-white leading-none">
                                Grid <span className="text-primary italic">Control</span>
                            </h1>
                        </div>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
                            <Button
                                variant="outline"
                                className="h-12 sm:h-14 rounded-xl bg-white/5 border-white/10 hover:bg-white/10 text-[10px] sm:text-xs font-black uppercase tracking-[0.15em] sm:tracking-[0.2em]"
                                onClick={() => supabase.auth.signOut()}
                            >
                                <LogOut className="h-3 w-3 sm:h-4 sm:w-4 mr-2 sm:mr-3" /> Terminate Session
                            </Button>
                            <Button
                                className="h-12 sm:h-14 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-500 text-[10px] sm:text-xs font-black uppercase tracking-[0.15em] sm:tracking-[0.2em]"
                                onClick={handleResetAllData}
                                disabled={loading}
                            >
                                <Trash className="h-3 w-3 sm:h-4 sm:w-4 mr-2 sm:mr-3" /> Purge System
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-12 space-y-20">
                {/* Tactical Metrics Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard title="Total Teams" value={stats.teams} icon={Users} loading={loading} />
                    <StatCard title="Active Matches" value={stats.matches} icon={Activity} loading={loading} highlight />
                    <StatCard title="Franchise Players" value={stats.players} icon={Database} loading={loading} />
                    <StatCard title="System Grounds" value={stats.grounds} icon={MapPin} loading={loading} />
                </div>

                {/* Operations Core */}
                <div className="space-y-10">
                    <div className="flex items-center gap-4">
                        <div className="h-px flex-1 bg-white/5" />
                        <h2 className="text-xs font-black uppercase tracking-[0.5em] text-slate-500">Operation Protocols</h2>
                        <div className="h-px flex-1 bg-white/5" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <ActionCard
                            title="Match Setup"
                            description="Initialize a new combat engagement."
                            icon={Plus}
                            link="/admin/matches/new"
                            theme="primary"
                        />
                        <ActionCard
                            title="Grand Arena"
                            description="Configure high-stakes league ladders."
                            icon={Trophy}
                            link="/admin/tournaments/new"
                            theme="primary"
                            highlight
                        />
                        <ActionCard
                            title="Squad Hub"
                            description="Audit franchise rosters and identities."
                            icon={Users}
                            link="/admin/teams"
                            theme="slate"
                        />
                    </div>
                </div>

                <div className="grid lg:grid-cols-3 gap-12">
                    {/* Live Stream / Recent Activity */}
                    <div className="lg:col-span-2 space-y-8">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Radio className="h-4 w-4 text-red-500 animate-pulse" />
                                <h2 className="text-xs font-black uppercase tracking-[0.4em] text-slate-500">Live Grid Feed</h2>
                            </div>
                            <Button variant="ghost" size="sm" className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-primary" asChild>
                                <Link href="/schedule">Audit All Fixtures <ChevronRight className="ml-2 h-4 w-4" /></Link>
                            </Button>
                        </div>

                        <div className="space-y-4">
                            {recentMatches.length > 0 ? recentMatches.map((match) => (
                                <motion.div
                                    key={match.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="group"
                                >
                                    <div className="glass-card-dark border-white/5 p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] hover:bg-white/[0.04] transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6">
                                        <div className="flex-1 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-8 w-full">
                                            <div className="text-center min-w-[100px] sm:min-w-[120px]">
                                                <div className="h-12 w-12 sm:h-14 sm:w-14 bg-white/5 rounded-xl sm:rounded-2xl flex items-center justify-center font-black text-xl sm:text-2xl italic uppercase tracking-tighter mx-auto mb-2 sm:mb-3 text-primary border border-white/5">
                                                    {match.team_a?.name?.[0]}
                                                </div>
                                                <p className="text-xs font-black uppercase text-slate-400 truncate tracking-tight">{match.team_a?.name}</p>
                                            </div>
                                            <div className="flex flex-col items-center gap-1 sm:gap-2 opacity-30">
                                                <div className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] sm:tracking-[0.4em]">VS</div>
                                                <div className="h-px w-8 sm:w-10 bg-white" />
                                            </div>
                                            <div className="text-center min-w-[100px] sm:min-w-[120px]">
                                                <div className="h-12 w-12 sm:h-14 sm:w-14 bg-white/5 rounded-xl sm:rounded-2xl flex items-center justify-center font-black text-xl sm:text-2xl italic uppercase tracking-tighter mx-auto mb-2 sm:mb-3 text-white border border-white/5">
                                                    {match.team_b?.name?.[0]}
                                                </div>
                                                <p className="text-xs font-black uppercase text-slate-400 truncate tracking-tight">{match.team_b?.name}</p>
                                            </div>
                                        </div>

                                        <div className="hidden md:block text-right">
                                            <div className="text-sm font-black uppercase tracking-widest text-primary mb-1">{match.overs_type} Series</div>
                                            <div className="text-xs font-black italic uppercase text-slate-500">{match.status}</div>
                                        </div>

                                        <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
                                            <Button size="sm" className="flex-1 sm:flex-none h-12 sm:h-14 px-6 sm:px-8 rounded-xl bg-primary hover:bg-primary/90 text-xs font-black uppercase tracking-widest shadow-[0_8px_24px_-4px_rgba(37,99,235,0.4)]" asChild>
                                                <Link href={`/admin/matches/${match.id}/score`}>Score Live</Link>
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl text-slate-600 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                                                onClick={() => handleDeleteMatch(match.id)}
                                            >
                                                <Trash className="h-5 w-5" />
                                            </Button>
                                        </div>
                                    </div>
                                </motion.div>
                            )) : (
                                <div className="text-center py-24 bg-white/[0.02] rounded-[3rem] border-2 border-dashed border-white/5">
                                    <h3 className="text-xl font-black italic uppercase text-slate-500 mb-6">No Active Engagements</h3>
                                    <Button className="h-12 px-8 rounded-xl bg-primary font-black uppercase tracking-widest text-[10px]" asChild>
                                        <Link href="/admin/matches/new">Initialize New Match</Link>
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sidebar: System Intelligence */}
                    <div className="space-y-8">
                        <Card className="bg-primary border-none rounded-[2.5rem] overflow-hidden relative shadow-2xl shadow-primary/30">
                            <CardContent className="p-10 space-y-8 relative z-10">
                                <Trophy className="h-14 w-14 text-white opacity-40 mb-2" />
                                <h3 className="text-4xl font-black italic uppercase tracking-tighter text-white leading-[0.9]">Intelligence <br />Fixture Engine</h3>
                                <p className="text-sm font-bold uppercase tracking-widest text-white/90 leading-relaxed">Automate professional tournament bracketology and franchise scheduling.</p>
                                <Button className="w-full h-16 rounded-2xl bg-white text-slate-950 hover:bg-slate-100 font-extrabold uppercase tracking-widest text-xs shadow-2xl" asChild>
                                    <Link href="/admin/tournaments/new">Launch Engine</Link>
                                </Button>
                            </CardContent>
                            <Star className="absolute -bottom-10 -right-10 h-48 w-48 text-white opacity-10 pointer-events-none rotate-12" />
                        </Card>

                        <div className="glass-card-dark border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
                            <div className="bg-white/5 px-8 py-5 border-b border-white/5 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Database className="h-4 w-4 text-primary" />
                                    <span className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">Franchise Node</span>
                                </div>
                                <span className="bg-primary/20 text-primary text-[10px] font-black px-2.5 py-1 rounded-full">{teamsList.length}</span>
                            </div>
                            <div className="p-4 max-h-[400px] overflow-y-auto custom-scrollbar">
                                {teamsList.length > 0 ? (
                                    <div className="space-y-2">
                                        {teamsList.map(team => (
                                            <div key={team.id} className="p-4 bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 rounded-2xl flex items-center justify-between transition-all group">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-8 w-8 bg-primary/10 rounded-lg flex items-center justify-center font-black text-xs text-primary border border-primary/20">
                                                        {team.name[0]}
                                                    </div>
                                                    <p className="font-black italic uppercase text-sm tracking-tight text-white group-hover:text-primary transition-colors">{team.name}</p>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-10 w-10 rounded-lg text-slate-600 hover:text-red-500 hover:bg-red-500/10"
                                                    onClick={() => handleDeleteTeam(team.id)}
                                                >
                                                    <Trash className="h-5 w-5" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-10 text-center opacity-20">
                                        <p className="text-[10px] font-black uppercase">No Roster Detected</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

function StatCard({ title, value, icon: Icon, loading, highlight }: any) {
    return (
        <motion.div whileHover={{ y: -5 }} transition={{ type: "spring", stiffness: 400, damping: 10 }}>
            <Card className={cn(
                "glass-card-dark border-white/5 p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden group",
                highlight && "border-primary/30"
            )}>
                <div className="relative z-10 flex flex-col justify-between h-full">
                    <div className="flex items-center justify-between mb-8">
                        <div className={cn(
                            "h-14 w-14 rounded-2xl flex items-center justify-center shadow-2xl transition-all",
                            highlight ? "bg-primary text-white shadow-primary/20" : "bg-white/5 text-slate-500 border border-white/10"
                        )}>
                            <Icon className="h-7 w-7" />
                        </div>
                        {highlight && <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />}
                    </div>
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.4em] text-slate-500 mb-1">{title}</p>
                        <h3 className="text-5xl font-black italic tracking-tighter text-white">
                            {loading ? "..." : value}
                        </h3>
                    </div>
                </div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
            </Card>
        </motion.div>
    )
}

function ActionCard({ title, description, icon: Icon, link, highlight, theme }: any) {
    return (
        <Link href={link}>
            <Card className={cn(
                "h-full p-8 rounded-[2.5rem] border shadow-xl hover:shadow-2xl transition-all group overflow-hidden relative",
                highlight
                    ? "bg-slate-900 border-primary/20 shadow-primary/10"
                    : "glass-card-dark border-white/5 hover:bg-white/[0.04]"
            )}>
                <div className="relative z-10 space-y-8">
                    <div className={cn(
                        "h-20 w-20 rounded-[1.5rem] flex items-center justify-center transition-all group-hover:scale-110 group-hover:rotate-3",
                        highlight ? "bg-primary text-white shadow-xl shadow-primary/30" : "bg-white/5 text-slate-400 border border-white/5"
                    )}>
                        <Icon className="h-10 w-10" />
                    </div>
                    <div>
                        <h3 className="text-3xl font-black italic uppercase tracking-tighter text-white group-hover:text-primary transition-colors">{title}</h3>
                        <p className="text-sm font-bold uppercase tracking-widest text-slate-500 mt-3 leading-relaxed">{description}</p>
                    </div>
                    <div className="flex items-center gap-2 text-primary opacity-0 group-hover:opacity-100 transition-opacity translate-x-[-10px] group-hover:translate-x-0">
                        <span className="text-[10px] font-black uppercase tracking-widest">Execute Profile</span>
                        <ChevronRight className="h-4 w-4" />
                    </div>
                </div>
                {highlight && <Star className="absolute -bottom-8 -right-8 h-32 w-32 text-white/5 rotate-12" />}
            </Card>
        </Link>
    )
}
