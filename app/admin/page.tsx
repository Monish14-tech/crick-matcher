"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Trophy, Calendar, MapPin, Users, Activity, Plus, Settings, BarChart3, Wand2, Zap, ArrowRight, Star, Trash, LogOut } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import { SupabaseError } from "@/components/SupabaseError"
import { cn } from "@/lib/utils"

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
        } else {
            console.error("Error deleting match:", error)
            alert("Failed to delete match. Check console for details.")
        }
    }

    const handleDeleteTeam = async (id: string) => {
        if (!confirm("Warning: Deleting a team is permanent. Proceed?")) return
        const { error } = await supabase.from('teams').delete().eq('id', id)
        if (!error) {
            setTeamsList(prev => prev.filter(t => t.id !== id))
            setStats(prev => ({ ...prev, teams: Math.max(0, prev.teams - 1) }))
        } else {
            alert("Error deleting team. Ensure they have no active matches.")
            console.error(error)
        }
    }

    const handleResetAllData = async () => {
        if (!confirm("CRITICAL WARNING: This will PERMANENTLY ERASE everything—Matches, Teams, Players, Grounds, and Scores. This action CANNOT be undone.\n\nAre you absolutely sure?")) return

        setLoading(true)
        try {
            console.log("Starting Full System Purge...")
            const tables = [
                'match_events', 'player_performances', 'match_scores',
                'match_active_state', 'tournament_teams', 'matches',
                'players', 'teams', 'tournaments', 'grounds'
            ]

            for (const table of tables) {
                const { error } = await supabase.from(table).delete().neq(table === 'match_active_state' ? 'match_id' : (table === 'tournament_teams' ? 'team_id' : 'id'), '00000000-0000-0000-0000-000000000000')
                if (error) {
                    console.error(`Error deleting from ${table}:`, error)
                    if (error.code !== '42P01') {
                        throw new Error(`Failed to delete from ${table}: ${error.message} (Code: ${error.code})`)
                    }
                }
            }

            alert("SUCCESS: System Purged. All data has been wiped.")
            window.location.reload()
        } catch (err: any) {
            console.error("Critical Reset Error:", err)
            alert("RESET FAILED: " + err.message)
        } finally {
            setLoading(false)
        }
    }


    return (
        <div className="max-w-7xl mx-auto px-4 py-12">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
                <div className="space-y-1">
                    <h1 className="text-4xl font-extrabold tracking-tight">Admin Portal</h1>
                    <p className="text-muted-foreground italic">Professional Cricket Ecosystem Management</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl text-red-600 hover:bg-red-50 hover:text-red-700 border-red-100"
                        onClick={() => supabase.auth.signOut()}
                    >
                        <LogOut className="mr-2 h-4 w-4" /> Sign Out
                    </Button>
                    <Button
                        variant="destructive"
                        size="sm"
                        className="rounded-xl shadow-lg shadow-red-500/20 gap-2 h-9"
                        onClick={handleResetAllData}
                        disabled={loading}
                    >
                        <Trash className="h-4 w-4" /> Reset Data
                    </Button>
                    <Button size="sm" className="rounded-xl shadow-lg shadow-primary/20">
                        <Plus className="mr-2 h-4 w-4" /> System Status
                    </Button>
                </div>
            </div>

            {/* Stats Grid */}
            < div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12" >
                <StatCard title="Total Teams" value={stats.teams} icon={Users} loading={loading} />
                <StatCard title="Live Matches" value={stats.matches} icon={Activity} loading={loading} highlight />
                <StatCard title="Players" value={stats.players} icon={BarChart3} loading={loading} />
            </div >

            {/* Management Actions */}
            < div className="mb-16" >
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                    <Wand2 className="h-6 w-6 text-primary" /> Management Actions
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <ActionCard
                        title="Schedule Match"
                        description="Fix a new fixture."
                        icon={Calendar}
                        link="/admin/matches/new"
                        color="bg-blue-500"
                    />
                    <ActionCard
                        title="Tournament Engine"
                        description="Auto-generate series fixtures."
                        icon={Trophy}
                        link="/admin/tournaments/new"
                        color="bg-amber-500"
                        highlight
                    />
                    <ActionCard
                        title="Team Roster"
                        description="View & Manage Squads."
                        icon={Users}
                        link="/admin/teams"
                        color="bg-indigo-500"
                    />
                </div>
            </div >

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                {/* Recent Activity */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold">Recent Match Activity</h2>
                        <Button variant="ghost" size="sm" asChild>
                            <Link href="/schedule" className="group">
                                View Full Schedule <ChevronRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </Button>
                    </div>

                    <div className="space-y-4">
                        {recentMatches.length > 0 ? recentMatches.map((match) => (
                            <Card key={match.id} className="overflow-hidden hover:shadow-xl transition-all border-none bg-card/50 backdrop-blur-sm group">
                                <CardContent className="p-0">
                                    <div className="flex items-center p-6">
                                        <div className="flex-1 flex items-center justify-between gap-8">
                                            <div className="text-center w-24">
                                                <div className="h-12 w-12 bg-slate-100 rounded-2xl mx-auto flex items-center justify-center font-bold mb-2 group-hover:bg-primary/10 transition-colors">
                                                    {match.team_a?.name?.[0]}
                                                </div>
                                                <p className="text-xs font-bold truncate">{match.team_a?.name}</p>
                                            </div>
                                            <div className="flex flex-col items-center">
                                                <div className="text-xs font-black italic opacity-20 uppercase tracking-widest mb-1">VERSUS</div>
                                                <div className="h-px w-12 bg-border" />
                                            </div>
                                            <div className="text-center w-24">
                                                <div className="h-12 w-12 bg-slate-100 rounded-2xl mx-auto flex items-center justify-center font-bold mb-2 group-hover:bg-primary/10 transition-colors">
                                                    {match.team_b?.name?.[0]}
                                                </div>
                                                <p className="text-xs font-bold truncate">{match.team_b?.name}</p>
                                            </div>
                                        </div>

                                        <div className="mx-8 h-12 w-px bg-border hidden sm:block" />

                                        <div className="hidden sm:block text-center w-32">
                                            <p className="text-[10px] uppercase font-black text-primary mb-1">{match.overs_type}</p>
                                            <p className="text-sm font-bold text-muted-foreground">{match.status}</p>
                                        </div>

                                        <div className="ml-4 flex gap-2">
                                            <Button size="sm" className="rounded-xl font-bold gap-2 px-4 h-10 shadow-lg" asChild>
                                                <Link href={`/admin/matches/${match.id}/score`}>
                                                    <Zap className="h-4 w-4 fill-current" /> Score
                                                </Link>
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                className="rounded-xl h-10 w-10 p-0 shadow-lg hover:bg-red-600"
                                                onClick={() => handleDeleteMatch(match.id)}
                                            >
                                                <Trash className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )) : (
                            <div className="p-20 text-center border-2 border-dashed rounded-[2rem] opacity-50 bg-muted/30">
                                <Calendar className="h-12 w-12 mx-auto mb-4" />
                                <p className="font-medium">No matches scheduled recently.</p>
                                <Button className="mt-6 rounded-xl font-bold" asChild>
                                    <Link href="/admin/matches/new">Schedule Match</Link>
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-8">
                    <Card className="bg-primary text-primary-foreground border-none overflow-hidden relative shadow-2xl shadow-primary/20">
                        <CardContent className="p-8 space-y-4 relative z-10">
                            <Trophy className="h-12 w-12 opacity-50 mb-2" />
                            <h3 className="text-2xl font-black leading-tight">Pro Series <br />Engine</h3>
                            <p className="text-sm opacity-80 leading-relaxed font-medium">Generate balanced round-robin fixtures for your tournament in one click.</p>
                            <Button variant="secondary" className="w-full font-bold h-12 rounded-xl" asChild>
                                <Link href="/admin/tournaments/new">Launch Engine</Link>
                            </Button>
                        </CardContent>
                        <Star className="absolute -bottom-10 -right-10 h-48 w-48 opacity-10 pointer-events-none rotate-12" />
                    </Card>

                    {/* Team Management */}
                    <Card className="border-none shadow-xl rounded-[2rem] overflow-hidden">
                        <CardHeader className="bg-slate-50 pb-6 border-b">
                            <CardTitle className="text-lg flex items-center justify-between">
                                <span className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> Manage Teams</span>
                                <span className="text-xs bg-slate-200 text-slate-600 px-2 py-1 rounded-full">{teamsList.length}</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 max-h-[400px] overflow-y-auto">
                            {teamsList.length > 0 ? (
                                <div className="divide-y divide-border">
                                    {teamsList.map(team => (
                                        <div key={team.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 bg-white border-2 border-slate-100 rounded-full flex items-center justify-center font-black text-xs text-primary shadow-sm">
                                                    {team.name[0]}
                                                </div>
                                                <p className="font-bold text-sm">{team.name}</p>
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-8 w-8 p-0 text-muted-foreground hover:text-red-600 hover:bg-red-50"
                                                onClick={() => handleDeleteTeam(team.id)}
                                            >
                                                <Trash className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-8 text-center text-sm text-muted-foreground opacity-50">
                                    No teams registered.
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-xl rounded-[2rem] overflow-hidden">
                        <CardHeader className="bg-slate-900 text-white pb-6">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Activity className="h-5 w-5 text-primary" /> System Stats
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y divide-border">
                                <div className="p-6 flex justify-between items-center hover:bg-muted/30 transition-colors">
                                    <span className="text-sm text-muted-foreground font-medium">Database Node</span>
                                    <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black uppercase">Online</span>
                                </div>
                                <div className="p-6 flex justify-between items-center hover:bg-muted/30 transition-colors">
                                    <span className="text-sm text-muted-foreground font-medium">Scoring API</span>
                                    <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black uppercase">Ready</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div >
    )
}

function StatCard({ title, value, icon: Icon, loading, highlight }: { title: string, value: number, icon: any, loading: boolean, highlight?: boolean }) {
    return (
        <Card className={cn("overflow-hidden relative border-none shadow-lg rounded-3xl transition-transform hover:-translate-y-1", highlight && "ring-2 ring-primary bg-primary/5")}>
            <CardContent className="p-8">
                <div className="flex items-center justify-between relative z-10">
                    <div className="space-y-2">
                        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">{title}</p>
                        <h3 className="text-4xl font-black italic">
                            {loading ? "..." : value}
                        </h3>
                    </div>
                    <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center shadow-inner", highlight ? "bg-primary text-white" : "bg-slate-100 text-slate-500")}>
                        <Icon className="h-7 w-7" />
                    </div>
                </div>
                <Icon className="absolute -bottom-6 -right-6 h-32 w-32 opacity-[0.03] text-slate-900 pointer-events-none" />
            </CardContent>
        </Card>
    )
}

function ActionCard({ title, description, icon: Icon, link, color, highlight }: { title: string, description: string, icon: any, link: string, color: string, highlight?: boolean }) {
    return (
        <Link href={link}>
            <Card className={cn("h-full border-none shadow-xl hover:shadow-2xl transition-all group rounded-[2rem] overflow-hidden", highlight && "bg-slate-900 text-white")}>
                <CardContent className="p-8 space-y-4">
                    <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-110 group-hover:rotate-3", color)}>
                        <Icon className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-xl font-black">{title}</h3>
                        <p className={cn("text-xs leading-relaxed font-medium", highlight ? "text-slate-400" : "text-muted-foreground")}>{description}</p>
                    </div>
                </CardContent>
            </Card>
        </Link>
    )
}

function ChevronRight(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="m9 18 6-6-6-6" />
        </svg>
    )
}
