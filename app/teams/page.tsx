"use client"

import { useEffect, useState } from "react"
import { Users, Search, Filter, Mail, Phone, ExternalLink } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SupabaseError } from "@/components/SupabaseError"
import { supabase } from "@/lib/supabase"
import Link from "next/link"

interface Team {
    id: string
    name: string
    captain_name: string
    contact_number: string
    logo_url?: string
}

export default function TeamsPage() {
    const [teams, setTeams] = useState<Team[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")

    useEffect(() => {
        async function fetchTeams() {
            if (!supabase) {
                setLoading(false)
                return
            }
            const { data, error } = await supabase
                .from('teams')
                .select('*')
                .order('name', { ascending: true })

            if (error) console.error(error)
            else setTeams(data || [])
            setLoading(false)
        }
        fetchTeams()
    }, [])

    const filteredTeams = teams.filter(t =>
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.captain_name?.toLowerCase().includes(search.toLowerCase())
    )

    if (!supabase) return <SupabaseError />

    return (
        <div className="max-w-7xl mx-auto px-4 py-12">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
                <div className="space-y-2">
                    <h1 className="text-4xl font-extrabold tracking-tight">Registered Teams</h1>
                    <p className="text-muted-foreground">Browse all the professional squads competing in our circuit.</p>
                </div>

                <div className="flex w-full md:w-auto gap-2">
                    <div className="relative flex-grow md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search teams or captains..."
                            className="pl-10"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <Button variant="outline" size="icon">
                        <Filter className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map(i => <div key={i} className="h-64 bg-muted animate-pulse rounded-2xl" />)}
                </div>
            ) : filteredTeams.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {filteredTeams.map((team) => (
                        <Card key={team.id} className="overflow-hidden hover:shadow-lg transition-all group border-border/50">
                            <CardHeader className="text-center pb-2">
                                <div className="h-20 w-20 bg-slate-100 rounded-full mx-auto flex items-center justify-center text-3xl font-bold text-primary border-4 border-white shadow-md">
                                    {team.name[0]}
                                </div>
                                <CardTitle className="pt-4 text-xl">{team.name}</CardTitle>
                                <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Captain: {team.captain_name}</p>
                            </CardHeader>
                            <CardContent className="text-center space-y-4 pt-4">
                                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                                    <Phone className="h-3 w-3" />
                                    <span>{team.contact_number}</span>
                                </div>
                            </CardContent>
                            <CardFooter className="bg-slate-50 border-t border-border/50 p-2">
                                <Button variant="ghost" className="w-full text-xs font-bold" asChild>
                                    <Link href={`/teams/${team.id}`}>View Squad <ExternalLink className="ml-1 h-3 w-3" /></Link>
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 border-2 border-dashed rounded-3xl">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p className="text-muted-foreground">No teams found. Be the first to register!</p>
                    <Button className="mt-4" asChild>
                        <Link href="/teams/register">Register Now</Link>
                    </Button>
                </div>
            )}
        </div>
    )
}

