"use client"

import { useEffect, useState } from "react"
import { Users, Search, Filter, Phone, ExternalLink, Shield, ArrowRight, Swords } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SupabaseError } from "@/components/SupabaseError"
import { supabase } from "@/lib/supabase"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"

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
        <div className="min-h-screen bg-slate-950 text-slate-100 pb-32">
            {/* Immersive Cinematic Header */}
            <div className="relative pt-32 pb-24 px-4 overflow-hidden">
                <div className="absolute top-0 left-0 w-96 h-96 bg-primary/10 rounded-full blur-[120px] -ml-48 -mt-24 opacity-50" />
                <div className="max-w-7xl mx-auto relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-12">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-500">Global Franchise Hub</span>
                        </div>
                        <h1 className="text-5xl md:text-7xl font-black italic tracking-tighter uppercase leading-[0.85]">
                            Registered <br /><span className="text-gradient-primary">Squads</span>
                        </h1>
                        <p className="text-slate-400 text-sm font-bold max-w-md">Discover the elite collectives redefining regional cricket excellence.</p>
                    </div>

                    <div className="flex w-full md:w-auto gap-3">
                        <div className="relative flex-grow md:w-80 group">
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-primary transition-colors" />
                            <Input
                                placeholder="Search Franchises..."
                                className="h-16 pl-14 pr-6 rounded-2xl bg-white/5 border-white/5 text-white font-bold focus:border-primary/50 transition-all placeholder:text-slate-600 outline-none"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <Button className="h-16 w-16 rounded-2xl bg-white/5 hover:bg-white/10 border-white/5 transition-all">
                            <Filter className="h-5 w-5 text-slate-400" />
                        </Button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 relative z-10">
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                            <div key={i} className="h-80 bg-white/5 animate-pulse rounded-[2.5rem]" />
                        ))}
                    </div>
                ) : filteredTeams.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {filteredTeams.map((team, idx) => (
                            <motion.div
                                key={team.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: idx * 0.05 }}
                            >
                                <Card className="glass-card-dark border-white/5 overflow-hidden group hover:border-primary/50 transition-all duration-500 rounded-[2.5rem] relative">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-primary/10 transition-colors" />

                                    <div className="p-8 text-center space-y-6 relative z-10">
                                        <div className="relative inline-block">
                                            <div className="h-24 w-24 bg-white/5 rounded-3xl mx-auto flex items-center justify-center text-4xl font-black text-white italic border border-white/5 shadow-2xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                                                {team.name[0]}
                                            </div>
                                            <div className="absolute -bottom-2 -right-2 h-8 w-8 bg-primary rounded-xl flex items-center justify-center border-4 border-slate-900 shadow-xl group-hover:rotate-12 transition-all">
                                                <Shield className="h-4 w-4 text-white" />
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white group-hover:text-primary transition-colors truncate px-2">{team.name}</h3>
                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Captain / {team.captain_name}</p>
                                        </div>

                                        <div className="bg-white/2 rounded-2xl p-4 flex items-center justify-center gap-3 border border-white/5 group-hover:bg-white/5 transition-colors">
                                            <Phone className="h-3 w-3 text-primary" />
                                            <span className="text-[10px] font-black text-slate-400 tracking-widest">{team.contact_number}</span>
                                        </div>

                                        <Button className="w-full h-14 rounded-2xl bg-white/5 hover:bg-primary hover:text-white border border-white/5 transition-all duration-500" asChild>
                                            <Link href={`/teams/${team.id}`} className="flex items-center justify-center gap-2">
                                                <span className="font-black italic uppercase tracking-widest text-[9px]">View Squad</span>
                                                <ArrowRight className="h-3.5 w-3.5" />
                                            </Link>
                                        </Button>
                                    </div>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <div className="glass-card-dark border-white/5 p-32 text-center rounded-[4rem]">
                        <div className="h-24 w-24 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-8 border border-white/10">
                            <Users className="h-10 w-10 text-slate-700" />
                        </div>
                        <h3 className="text-3xl font-black italic uppercase italic text-white mb-2">Registry Empty</h3>
                        <p className="text-slate-500 font-bold max-w-sm mx-auto">No squads have joined the circuit yet. Be the first to establish your legacy.</p>
                        <Button className="mt-10 h-16 px-10 rounded-2xl font-black italic uppercase tracking-widest bg-primary hover:scale-105 transition-all" asChild>
                            <Link href="/teams/register">Register Franchise</Link>
                        </Button>
                    </div>
                )}
            </div>

            {/* Background Narrative Section (Placeholder for high-impact content) */}
            <div className="max-w-7xl mx-auto px-4 mt-32">
                <div className="glass-card-dark border-white/5 p-16 rounded-[3rem] overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-[500px] h-full bg-primary/5 -mr-48 skew-x-12" />
                    <div className="relative z-10 md:w-1/2 space-y-6">
                        <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center">
                            <Swords className="h-6 w-6 text-white" />
                        </div>
                        <h2 className="text-4xl font-black italic uppercase tracking-tighter text-white">Dominate the <span className="text-primary italic">Circuit</span></h2>
                        <p className="text-slate-400 font-bold leading-relaxed">Join 50+ elite squads currently competing for the ultimate championship. Registration offers full analytics tracking, player profiles, and direct match scheduling.</p>
                        <Button className="rounded-xl h-14 px-8 font-black uppercase italic tracking-widest" asChild>
                            <Link href="/teams/register">Begin Registration</Link>
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}

function SampleTeamCard({ name, captain }: { name: string, captain: string }) {
    return (
        <Card className="overflow-hidden border-border/50">
            <CardHeader className="text-center pb-2">
                <div className="h-16 w-16 bg-slate-100 rounded-full mx-auto flex items-center justify-center text-2xl font-bold text-slate-300 border-2 border-white shadow-sm">
                    {name[0]}
                </div>
                <CardTitle className="pt-4 text-lg">{name}</CardTitle>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Captain: {captain}</p>
            </CardHeader>
            <CardContent className="text-center py-4">
                <div className="h-2 w-24 bg-slate-100 mx-auto rounded-full" />
            </CardContent>
        </Card>
    )
}

