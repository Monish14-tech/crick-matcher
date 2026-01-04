"use client"

import { useEffect, useState, use } from "react"
import { Trophy, Users, Mail, Phone, ArrowLeft, Shield, User, Star } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import { SupabaseError } from "@/components/SupabaseError"
import Link from "next/link"

interface Team {
    id: string
    name: string
    captain_name: string
    contact_number: string
    logo_url?: string
}

interface Player {
    id: string
    name: string
    role: string
}

export default function TeamDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    if (!supabase) return <SupabaseError />

    const { id } = use(params)
    const [team, setTeam] = useState<Team | null>(null)
    const [players, setPlayers] = useState<Player[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchTeamDetails() {
            setLoading(true)

            // Fetch Team
            const { data: teamData, error: teamError } = await supabase
                .from('teams')
                .select('*')
                .eq('id', id)
                .single()

            if (teamError) {
                console.error("Error fetching team:", teamError)
                setLoading(false)
                return
            }

            // Fetch Players
            const { data: playersData, error: playersError } = await supabase
                .from('players')
                .select('*')
                .eq('team_id', id)

            if (playersError) {
                console.error("Error fetching players:", playersError)
            }

            setTeam(teamData)
            setPlayers(playersData || [])
            setLoading(false)
        }

        fetchTeamDetails()
    }, [id])

    if (loading) {
        return (
            <div className="max-w-7xl mx-auto px-4 py-20">
                <div className="animate-pulse space-y-8">
                    <div className="h-12 w-48 bg-muted rounded" />
                    <div className="h-64 bg-muted rounded-3xl" />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => <div key={i} className="h-32 bg-muted rounded-xl" />)}
                    </div>
                </div>
            </div>
        )
    }

    if (!team) {
        return (
            <div className="max-w-7xl mx-auto px-4 py-20 text-center space-y-6">
                <Shield className="h-20 w-20 mx-auto text-muted-foreground opacity-20" />
                <h1 className="text-3xl font-bold">Team Not Found</h1>
                <p className="text-muted-foreground">The team you are looking for does not exist or has been removed.</p>
                <Button asChild>
                    <Link href="/teams">Back to Teams</Link>
                </Button>
            </div>
        )
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-12">
            <Link href="/teams" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-8 transition-colors">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to All Teams
            </Link>

            {/* Team Header */}
            <div className="bg-slate-900 rounded-3xl p-8 md:p-12 text-white relative overflow-hidden mb-12 shadow-2xl">
                <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                    <div className="h-32 w-32 bg-white rounded-full flex items-center justify-center text-5xl font-black text-slate-900 shadow-xl border-4 border-slate-800">
                        {team.logo_url ? <img src={team.logo_url} alt={team.name} className="h-full w-full object-cover rounded-full" /> : team.name[0]}
                    </div>
                    <div className="text-center md:text-left space-y-4">
                        <div className="inline-flex items-center space-x-2 bg-white/10 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest border border-white/20">
                            <Trophy className="h-3 w-3 text-yellow-500" />
                            <span>Professional Squad</span>
                        </div>
                        <h1 className="text-4xl md:text-6xl font-black">{team.name}</h1>
                        <div className="flex flex-wrap justify-center md:justify-start gap-4 text-slate-300">
                            <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-primary" />
                                <span className="text-sm font-medium">Captain: <span className="text-white font-bold">{team.captain_name}</span></span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-primary" />
                                <span className="text-sm font-medium">{team.contact_number}</span>
                            </div>
                        </div>
                    </div>
                </div>
                {/* Decorative background trophy */}
                <Trophy className="absolute -bottom-10 -right-10 h-64 w-64 opacity-10 text-white pointer-events-none rotate-12" />
            </div>

            <div className="grid lg:grid-cols-3 gap-12">
                {/* Sidebar Info */}
                <div className="space-y-8">
                    <Card className="border-none shadow-lg bg-primary/5">
                        <CardHeader>
                            <CardTitle className="text-xl">Squad Stats</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <StatRow label="Total Players" value={players.length.toString()} />
                            <StatRow label="Batsmen" value={players.filter(p => p.role === 'Batsman').length.toString()} />
                            <StatRow label="Bowlers" value={players.filter(p => p.role === 'Bowler').length.toString()} />
                            <StatRow label="All-Rounders" value={players.filter(p => p.role === 'All-Rounder').length.toString()} />
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-lg overflow-hidden">
                        <div className="bg-slate-100 p-6 text-center">
                            <Star className="h-8 w-8 mx-auto text-yellow-500 mb-2 fill-yellow-500" />
                            <h3 className="font-bold">Team Contact</h3>
                            <p className="text-xs text-muted-foreground mt-1 text-center">Managed by {team.captain_name}</p>
                        </div>
                        <CardContent className="p-6 space-y-4">
                            <Button className="w-full" asChild>
                                <a href={`tel:${team.contact_number}`}>Call Now</a>
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Content: Player Roster */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="flex items-center justify-between">
                        <h2 className="text-3xl font-extrabold tracking-tight">Current Squad</h2>
                        <span className="bg-muted px-3 py-1 rounded-full text-xs font-bold">{players.length} Players</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {players.map((player) => (
                            <Card key={player.id} className="hover:border-primary transition-all group">
                                <CardContent className="p-6 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-bold group-hover:bg-primary group-hover:text-white transition-all">
                                            {player.name[0]}
                                        </div>
                                        <div>
                                            <p className="font-bold">{player.name}</p>
                                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{player.role}</p>
                                        </div>
                                    </div>
                                    <Shield className="h-4 w-4 text-muted-foreground opacity-20 group-hover:opacity-100 group-hover:text-primary transition-all" />
                                </CardContent>
                            </Card>
                        ))}

                        {players.length === 0 && (
                            <div className="col-span-full py-20 text-center border-2 border-dashed rounded-3xl">
                                <Users className="h-12 w-12 mx-auto mb-4 opacity-10" />
                                <p className="text-muted-foreground italic">No players added to this squad yet.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

function StatRow({ label, value }: { label: string, value: string }) {
    return (
        <div className="flex justify-between items-center py-2 border-b border-primary/10 last:border-0">
            <span className="text-sm font-medium text-muted-foreground">{label}</span>
            <span className="font-bold text-lg">{value}</span>
        </div>
    )
}
