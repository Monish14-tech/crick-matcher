"use client"

import { useEffect, useState } from "react"
import { Calendar, MapPin, Search, Filter, ChevronRight, Trophy, Clock, Swords, ArrowRight } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabase"
import { SupabaseError } from "@/components/SupabaseError"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"

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
            setLoading(true)
            const { data, error } = await supabase
                .from('matches')
                .select(`
                    *,
                    team_a:teams!team_a_id(name, logo_url),
                    team_b:teams!team_b_id(name, logo_url),
                    ground:grounds(name, location)
                `)
                .order('match_date', { ascending: true })

            if (error) console.error("Error fetching matches:", error)
            else setMatches(data || [])
            setLoading(false)
        }
        fetchMatches()
    }, [])

    const filteredMatches = matches.filter(m =>
        m.team_a?.name.toLowerCase().includes(search.toLowerCase()) ||
        m.team_b?.name.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 pb-32">
            {/* Immersive Header */}
            <div className="relative pt-32 pb-24 px-4 overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-[120px] -mr-48 -mt-24" />
                <div className="max-w-7xl mx-auto relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-12">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_10px_theme(colors.primary)]" />
                            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-500">Arena Fixtures</span>
                        </div>
                        <h1 className="text-5xl md:text-7xl font-black italic tracking-tighter uppercase leading-[0.85]">
                            Match <br /><span className="text-gradient-primary">Schedule</span>
                        </h1>
                        <p className="text-slate-400 text-sm font-bold max-w-md">Syncing world-class competition across all grounds.</p>
                    </div>

                    <div className="flex w-full md:w-auto gap-3">
                        <div className="relative flex-grow md:w-80 group">
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-primary transition-colors" />
                            <Input
                                placeholder="Search Teams..."
                                className="h-16 pl-14 pr-6 rounded-2xl bg-white/5 border-white/5 text-white font-bold focus:border-primary/50 transition-all placeholder:text-slate-600 outline-none"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <Button className="h-16 w-16 rounded-2xl bg-white/5 hover:bg-white/10 border-white/5">
                            <Filter className="h-5 w-5 text-slate-400" />
                        </Button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 relative z-10">
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="h-80 bg-white/5 animate-pulse rounded-[2.5rem]" />
                        ))}
                    </div>
                ) : filteredMatches.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredMatches.map((match, idx) => (
                            <motion.div
                                key={match.id}
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                            >
                                <Card className="glass-card-dark border-white/5 overflow-hidden group hover:border-primary/50 transition-all duration-500 rounded-[2.5rem]">
                                    <div className="px-6 py-4 bg-white/2 flex justify-between items-center border-b border-white/5 group-hover:bg-primary/5 transition-colors">
                                        <div className="flex items-center gap-2">
                                            <Trophy className="h-3 w-3 text-primary" />
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{match.overs_type} Series</span>
                                        </div>
                                        <div className={cn(
                                            "px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest",
                                            match.status === 'Live' ? 'bg-red-500 text-white animate-pulse' :
                                                match.status === 'Completed' ? 'bg-slate-800 text-slate-400' : 'bg-primary/20 text-primary border border-primary/20'
                                        )}>
                                            {match.status}
                                        </div>
                                    </div>
                                    <CardContent className="p-8">
                                        <div className="flex justify-between items-center mb-10">
                                            <div className="text-center space-y-3 flex-1 flex flex-col items-center">
                                                <div className="h-20 w-20 rounded-3xl bg-white/5 flex items-center justify-center text-3xl font-black text-white italic border border-white/5 shadow-2xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                                                    {match.team_a?.name?.[0]}
                                                </div>
                                                <p className="font-extrabold text-xs uppercase tracking-tighter truncate max-w-[120px] text-slate-200">{match.team_a?.name}</p>
                                            </div>
                                            <div className="px-6">
                                                <Swords className="h-6 w-6 text-slate-800 group-hover:text-primary/50 transition-colors" />
                                            </div>
                                            <div className="text-center space-y-3 flex-1 flex flex-col items-center">
                                                <div className="h-20 w-20 rounded-3xl bg-white/5 flex items-center justify-center text-3xl font-black text-white italic border border-white/5 shadow-2xl group-hover:scale-110 group-hover:-rotate-6 transition-all duration-500">
                                                    {match.team_b?.name?.[0]}
                                                </div>
                                                <p className="font-extrabold text-xs uppercase tracking-tighter truncate max-w-[120px] text-slate-200">{match.team_b?.name}</p>
                                            </div>
                                        </div>

                                        <div className="space-y-4 py-6 border-t border-white/5">
                                            <div className="flex items-center text-xs font-bold text-slate-400 gap-3">
                                                <div className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center">
                                                    <Calendar className="h-4 w-4 text-primary" />
                                                </div>
                                                <span>{match.match_date ? new Date(match.match_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' }) : 'DATE TBD'}</span>
                                            </div>
                                            <div className="flex items-center text-xs font-bold text-slate-400 gap-3">
                                                <div className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center">
                                                    <Clock className="h-4 w-4 text-primary" />
                                                </div>
                                                <span>{match.match_time ? match.match_time.slice(0, 5) : '00:00'} HOURS</span>
                                            </div>
                                            <div className="flex items-center text-xs font-bold text-slate-400 gap-3">
                                                <div className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center">
                                                    <MapPin className="h-4 w-4 text-primary" />
                                                </div>
                                                <span className="truncate uppercase">{match.ground?.name || "The Pro Arena"}</span>
                                            </div>
                                        </div>

                                        <Button
                                            className="w-full h-14 mt-6 rounded-2xl bg-white/5 hover:bg-primary hover:text-white border border-white/5 transition-all duration-500 group-hover:shadow-[0_10px_30px_rgba(37,99,235,0.2)]"
                                            asChild
                                        >
                                            <Link href={`/matches/${match.id}`} className="flex items-center justify-center gap-2">
                                                <span className="font-black italic uppercase tracking-widest text-[10px]">Match Center</span>
                                                <ArrowRight className="h-3.5 w-3.5" />
                                            </Link>
                                        </Button>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <div className="glass-card-dark border-white/5 p-32 text-center rounded-[4rem]">
                        <div className="h-24 w-24 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-8 border border-white/10">
                            <Calendar className="h-10 w-10 text-slate-700" />
                        </div>
                        <h3 className="text-3xl font-black italic uppercase italic text-white mb-2">No Battle Scheduled</h3>
                        <p className="text-slate-500 font-bold max-w-sm mx-auto">The arena is currently silent. Check back soon for the next clash of titans.</p>
                        <Button className="mt-10 h-16 px-10 rounded-2xl font-black italic uppercase tracking-widest bg-primary hover:scale-105 transition-all" asChild>
                            <Link href="/admin/matches/new">Schedule New Battle</Link>
                        </Button>
                    </div>
                )}
            </div>
        </div>
    )
}
