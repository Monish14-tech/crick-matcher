"use client"

import { useEffect, useState } from "react"
import { Calendar, MapPin, Search, Filter, ChevronRight, Trophy, Clock } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabase"
import { SupabaseError } from "@/components/SupabaseError"
import Link from "next/link"

interface Match {
    id: string
    match_date: string
    match_time: string
    overs_type: string
    status: string
    team_a: { name: string, logo_url?: string }
    team_b: { name: string, logo_url?: string }
    ground: { name: string, location: string }
}

export default function SchedulePage() {
    if (!supabase) return <SupabaseError />
    const [matches, setMatches] = useState<Match[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")

    useEffect(() => {
        async function fetchMatches() {
            const { data, error } = await supabase
                .from('matches')
                .select(`
          *,
          team_a:teams!team_a_id(name, logo_url),
          team_b:teams!team_b_id(name, logo_url),
          ground:grounds(name, location)
        `)
                .order('match_date', { ascending: true })

            if (error) {
                console.error("Error fetching matches:", error)
            } else {
                setMatches(data || [])
            }
            setLoading(false)
        }

        fetchMatches()
    }, [])

    const filteredMatches = matches.filter(m =>
        m.team_a?.name.toLowerCase().includes(search.toLowerCase()) ||
        m.team_b?.name.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="max-w-7xl mx-auto px-4 py-12">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
                <div className="space-y-2">
                    <h1 className="text-4xl font-extrabold tracking-tight">Match Schedule</h1>
                    <p className="text-muted-foreground">Stay updated with all upcoming fixtures and tournaments.</p>
                </div>

                <div className="flex w-full md:w-auto gap-2">
                    <div className="relative flex-grow md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search teams..."
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {[1, 2, 3].map(i => <div key={i} className="h-64 bg-muted animate-pulse rounded-2xl" />)}
                </div>
            ) : filteredMatches.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filteredMatches.map((match) => (
                        <Card key={match.id} className="overflow-hidden hover:border-primary/50 transition-all group border-border/50">
                            <div className="bg-muted px-4 py-2 flex justify-between items-center">
                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{match.overs_type}</span>
                                <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${match.status === 'Live' ? 'bg-red-100 text-red-600 animate-pulse' :
                                    match.status === 'Completed' ? 'bg-slate-100 text-slate-600' : 'bg-blue-100 text-blue-600'
                                    }`}>
                                    {match.status}
                                </div>
                            </div>
                            <CardContent className="p-6">
                                <div className="flex justify-between items-center mb-8">
                                    <div className="text-center space-y-2 flex-1">
                                        <div className="h-14 w-14 rounded-full bg-slate-100 mx-auto flex items-center justify-center text-xl font-bold text-slate-400 border border-border">
                                            {match.team_a?.name?.[0]}
                                        </div>
                                        <p className="font-bold text-sm truncate max-w-[100px]">{match.team_a?.name}</p>
                                    </div>
                                    <div className="px-4 text-xs font-black italic text-muted-foreground">VS</div>
                                    <div className="text-center space-y-2 flex-1">
                                        <div className="h-14 w-14 rounded-full bg-slate-100 mx-auto flex items-center justify-center text-xl font-bold text-slate-400 border border-border">
                                            {match.team_b?.name?.[0]}
                                        </div>
                                        <p className="font-bold text-sm truncate max-w-[100px]">{match.team_b?.name}</p>
                                    </div>
                                </div>

                                <div className="space-y-3 pt-4 border-t border-border/50">
                                    <div className="flex items-center text-sm text-muted-foreground gap-2">
                                        <Calendar className="h-4 w-4 text-primary" />
                                        <span>{match.match_date ? new Date(match.match_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'TBD'}</span>
                                    </div>
                                    <div className="flex items-center text-sm text-muted-foreground gap-2">
                                        <Clock className="h-4 w-4 text-primary" />
                                        <span>{match.match_time ? match.match_time.slice(0, 5) : '00:00'}</span>
                                    </div>
                                    <div className="flex items-center text-sm text-muted-foreground gap-2">
                                        <MapPin className="h-4 w-4 text-primary" />
                                        <span className="truncate">{match.ground?.name || "Thondamuthur boys high school ground"}</span>
                                    </div>
                                </div>
                            </CardContent>
                            <div className="p-4 bg-slate-50 border-t border-border/50">
                                <Button variant="ghost" className="w-full text-xs font-bold uppercase group-hover:bg-primary group-hover:text-primary-foreground transition-all" asChild>
                                    <Link href={`/matches/${match.id}`}>Match Details</Link>
                                </Button>
                            </div>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card className="p-20 text-center border-dashed">
                    <Calendar className="h-16 w-16 mx-auto mb-6 text-muted-foreground opacity-20" />
                    <h3 className="text-xl font-bold">No matches found</h3>
                    <p className="text-muted-foreground mt-2">Adjust your search or check back later for new fixtures.</p>
                    <Button className="mt-6" asChild>
                        <Link href="/admin/matches/new">Schedule Match (Admin)</Link>
                    </Button>
                </Card>
            )}
        </div>
    )
}
