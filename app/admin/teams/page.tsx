"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Users, Trash2, Phone, Shield, ArrowLeft, Plus, Search } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"

export default function AdminTeamsPage() {
    const [teams, setTeams] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")

    useEffect(() => {
        fetchTeams()
    }, [])

    async function fetchTeams() {
        setLoading(true)
        // Fetch teams with player count
        const { data, error } = await supabase
            .from('teams')
            .select('*, players(count)')
            .order('created_at', { ascending: false })

        if (error) {
            console.error("Error fetching teams:", error)
        } else {
            setTeams(data || [])
        }
        setLoading(false)
    }

    const handleDeleteTeam = async (id: string, name: string) => {
        if (!confirm(`ARE YOU SURE?\n\nDeleting "${name}" will permanently remove:\n- The Team Record\n- All Associated Players\n- Match History involving this team\n\nThis action cannot be undone.`)) {
            return
        }

        const { error } = await supabase.from('teams').delete().eq('id', id)

        if (error) {
            console.error("Delete failed:", error)
            alert("Delete Failed: " + (error.message || error.details || JSON.stringify(error)))
        } else {
            setTeams(prev => prev.filter(t => t.id !== id))
        }
    }

    const filteredTeams = teams.filter(t =>
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.captain_name?.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="max-w-7xl mx-auto px-4 py-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-2 mb-2">
                        <Button variant="ghost" size="icon" asChild className="-ml-2">
                            <Link href="/admin"><ArrowLeft className="h-6 w-6" /></Link>
                        </Button>
                        <h1 className="text-4xl font-extrabold tracking-tight">Team Roster</h1>
                    </div>
                    <p className="text-muted-foreground max-w-2xl pl-10">
                        Manage all registered squads. Delete invalid entries or view details.
                    </p>
                </div>
                <Button className="rounded-xl font-bold gap-2 shadow-lg shadow-primary/20" asChild>
                    <Link href="/teams/register">
                        <Plus className="h-4 w-4" /> Register New Team
                    </Link>
                </Button>
            </div>

            {/* Search */}
            <div className="mb-10 relative max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search teams by name or captain..."
                    className="pl-12 h-12 rounded-xl bg-slate-50 border-slate-200"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {/* Grid */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => <div key={i} className="h-64 bg-slate-100 animate-pulse rounded-3xl" />)}
                </div>
            ) : filteredTeams.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredTeams.map((team) => (
                        <Card key={team.id} className="group overflow-hidden border-none shadow-lg hover:shadow-2xl transition-all rounded-[2rem]">
                            <CardHeader className="bg-slate-900 text-white p-6 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-10 font-black text-9xl leading-none -mr-4 -mt-4 select-none">
                                    {team.name[0]}
                                </div>
                                <div className="relative z-10 flex justify-between items-start">
                                    <div>
                                        <CardTitle className="text-2xl font-black mb-1">{team.name}</CardTitle>
                                        <p className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                                            <Shield className="h-3 w-3" /> Captain: {team.captain_name}
                                        </p>
                                    </div>
                                    <div className="h-12 w-12 bg-white/10 rounded-2xl flex items-center justify-center font-bold text-lg backdrop-blur-sm">
                                        {team.name[0]}
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-6 space-y-4 bg-white">
                                <div className="flex items-center justify-between text-sm py-2 border-b">
                                    <span className="text-muted-foreground flex items-center gap-2">
                                        <Users className="h-4 w-4" /> Squad Size
                                    </span>
                                    <span className="font-bold">{team.players?.[0]?.count || 0} Players</span>
                                </div>
                                <div className="flex items-center justify-between text-sm py-2 border-b">
                                    <span className="text-muted-foreground flex items-center gap-2">
                                        <Phone className="h-4 w-4" /> Contact
                                    </span>
                                    <span className="font-mono font-medium">{team.contact_number}</span>
                                </div>
                            </CardContent>
                            <CardFooter className="p-4 bg-slate-50 flex gap-4">
                                <Button className="flex-1 font-bold rounded-xl" variant="outline" asChild>
                                    <Link href={`/teams/${team.id}`}>View Squad</Link>
                                </Button>
                                <Button
                                    className="flex-1 font-bold rounded-xl gap-2 hover:bg-red-600 hover:text-white transition-colors"
                                    variant="destructive"
                                    onClick={() => handleDeleteTeam(team.id, team.name)}
                                >
                                    <Trash2 className="h-4 w-4" /> Delete
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 bg-slate-50 rounded-[3rem] border-2 border-dashed">
                    <Users className="h-16 w-16 mx-auto mb-6 text-slate-300" />
                    <h3 className="text-xl font-bold text-slate-900 mb-2">No Teams Found</h3>
                    <p className="text-muted-foreground mb-6">Get started by registering your first squad.</p>
                    <Button asChild className="rounded-xl px-8">
                        <Link href="/teams/register">Register Team</Link>
                    </Button>
                </div>
            )}
        </div>
    )
}
