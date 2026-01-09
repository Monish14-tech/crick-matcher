"use client"

import { useEffect, useState, use, useMemo } from "react"
import { ArrowLeft, History, Zap, Target, Award, Filter, ChevronDown, Activity, Shield, Swords, Info, AlertCircle } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import { SupabaseError } from "@/components/SupabaseError"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"

// --- TYPES ---
interface Team {
    id: string
    name: string
    logo_url?: string
}

interface Match {
    id: string
    status: string
    team_a: Team
    team_b: Team
}

interface MatchEvent {
    id: string
    innings_no: number
    batter_id: string
    bowler_id: string
    runs_batter: number
    runs_extras: number
    extra_type: string
    wicket_type?: string
    is_legal_ball: boolean
    created_at: string
}

interface Player {
    id: string
    name: string
    team_id: string
}

export default function MatchLogsPage({ params }: { params: Promise<{ id: string }> }) {
    if (!supabase) return <SupabaseError />
    const { id } = use(params)

    const [match, setMatch] = useState<Match | null>(null)
    const [events, setEvents] = useState<MatchEvent[]>([])
    const [players, setPlayers] = useState<Player[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<'all' | 'wickets' | 'boundaries' | 'extras'>('all')
    const [selectedInnings, setSelectedInnings] = useState<1 | 2>(1)

    const fetchData = async () => {
        try {
            const { data: m } = await supabase.from('matches').select('*, team_a:teams!team_a_id(*), team_b:teams!team_b_id(*)').eq('id', id).single()
            if (m) setMatch(m)

            const { data: e } = await supabase.from('match_events').select('*').eq('match_id', id).order('created_at', { ascending: true })
            setEvents(e || [])

            const { data: p } = await supabase.from('players').select('*').in('team_id', [m?.team_a_id, m?.team_b_id])
            setPlayers(p || [])
        } catch (err) { console.error(err) }
        setLoading(false)
    }

    useEffect(() => {
        fetchData()
        const interval = setInterval(fetchData, 5000)
        return () => clearInterval(interval)
    }, [id])

    const filteredEvents = useMemo(() => {
        let list = events.filter(e => e.innings_no === selectedInnings)
        if (filter === 'wickets') list = list.filter(e => e.wicket_type)
        if (filter === 'boundaries') list = list.filter(e => e.runs_batter === 4 || e.runs_batter === 6)
        if (filter === 'extras') list = list.filter(e => e.runs_extras > 0)
        return list.reverse() // Newest first
    }, [events, filter, selectedInnings])

    // Grouping by Over
    const groupedEvents = useMemo(() => {
        const groups: { over: number; events: MatchEvent[] }[] = []
        let currentBalls = 0
        let currentOverEvents: MatchEvent[] = []

        // We need to iterate from start to calculate overs correctly
        const sortedInningsEvents = events
            .filter(e => e.innings_no === selectedInnings)
            .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

        sortedInningsEvents.forEach(e => {
            currentOverEvents.push(e)
            if (e.is_legal_ball) {
                currentBalls++
                if (currentBalls % 6 === 0) {
                    groups.push({ over: Math.floor(currentBalls / 6), events: [...currentOverEvents].reverse() })
                    currentOverEvents = []
                }
            }
        })

        if (currentOverEvents.length > 0) {
            groups.push({ over: Math.floor(currentBalls / 6) + 1, events: [...currentOverEvents].reverse() })
        }

        // Apply filters to grouped content
        return groups.map(g => ({
            ...g,
            events: g.events.filter(e => {
                if (filter === 'all') return true
                if (filter === 'wickets') return e.wicket_type
                if (filter === 'boundaries') return e.runs_batter === 4 || e.runs_batter === 6
                if (filter === 'extras') return e.runs_extras > 0
                return true
            })
        })).filter(g => g.events.length > 0).reverse() // Show newest overs first
    }, [events, selectedInnings, filter])

    const getPlayerName = (id: string) => players.find(p => p.id === id)?.name || "Unknown"

    if (loading) return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
            <Activity className="h-10 w-10 text-primary animate-spin" />
        </div>
    )

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-primary/30 antialiased">
            {/* Header */}
            <div className="fixed top-0 w-full z-50 bg-slate-950/80 backdrop-blur-2xl border-b border-white/5 py-4 px-6">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <Link href={`/matches/${id}`} className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center hover:bg-primary transition-all">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                        <div>
                            <h1 className="text-xl font-black italic uppercase tracking-tighter text-white">Match Logs</h1>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Arena Intelligence Stream</p>
                        </div>
                    </div>
                    <div className="hidden md:flex items-center gap-2">
                        <Button
                            variant={selectedInnings === 1 ? "default" : "ghost"}
                            onClick={() => setSelectedInnings(1)}
                            className="h-9 rounded-lg text-[10px] font-black uppercase px-4"
                        >Innings 1</Button>
                        <Button
                            variant={selectedInnings === 2 ? "default" : "ghost"}
                            onClick={() => setSelectedInnings(2)}
                            className="h-9 rounded-lg text-[10px] font-black uppercase px-4"
                        >Innings 2</Button>
                    </div>
                </div>
            </div>

            <div className="pt-32 pb-20 px-4">
                <div className="max-w-3xl mx-auto space-y-8">
                    {/* Filters */}
                    <div className="flex flex-wrap gap-2">
                        {(['all', 'wickets', 'boundaries', 'extras'] as const).map((f) => (
                            <Button
                                key={f}
                                onClick={() => setFilter(f)}
                                variant={filter === f ? "default" : "ghost"}
                                className={cn(
                                    "h-10 rounded-xl px-6 text-[10px] font-black uppercase tracking-widest border border-white/5",
                                    filter === f ? "bg-primary text-white" : "text-slate-500 hover:text-white"
                                )}
                            >
                                {f}
                            </Button>
                        ))}
                    </div>

                    {/* Log Stream */}
                    <div className="space-y-12">
                        {groupedEvents.length > 0 ? groupedEvents.map((group, gIdx) => (
                            <div key={gIdx} className="relative">
                                {/* Over Header */}
                                <div className="sticky top-24 z-30 mb-6">
                                    <div className="inline-flex items-center gap-4 px-6 py-2 bg-slate-900/90 backdrop-blur-md rounded-full border border-white/10 shadow-xl">
                                        <div className="h-2 w-2 rounded-full bg-primary" />
                                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white">Over {group.over}</span>
                                    </div>
                                </div>

                                {/* Events in this Over */}
                                <div className="space-y-4 ml-6 border-l-2 border-white/5 pl-8">
                                    {group.events.map((event, eIdx) => (
                                        <motion.div
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            key={event.id}
                                            className="relative"
                                        >
                                            {/* Connector dot */}
                                            <div className="absolute -left-[35px] top-1/2 -translate-y-1/2 h-3.5 w-3.5 rounded-full border-2 border-slate-950 bg-slate-800" />

                                            <Card className={cn(
                                                "p-6 rounded-3xl border shadow-lg transition-all hover:scale-[1.01]",
                                                event.wicket_type ? "bg-red-500/10 border-red-500/20" :
                                                    (event.runs_batter === 4 || event.runs_batter === 6) ? "bg-emerald-500/10 border-emerald-500/20" :
                                                        "glass-card-dark border-white/5"
                                            )}>
                                                <div className="flex items-center justify-between gap-6">
                                                    <div className="flex items-center gap-6">
                                                        <div className={cn(
                                                            "h-14 w-14 rounded-2xl flex items-center justify-center text-2xl font-black italic tracking-tighter shrink-0",
                                                            event.wicket_type ? "bg-red-500 text-white" :
                                                                event.runs_batter === 6 ? "bg-indigo-600 text-white shadow-[0_0_20px_rgba(79,70,229,0.4)]" :
                                                                    event.runs_batter === 4 ? "bg-primary text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]" :
                                                                        "bg-white/5 text-slate-400"
                                                        )}>
                                                            {event.wicket_type ? "W" : (event.runs_batter + event.runs_extras)}
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Batter:</span>
                                                                <span className="text-sm font-black italic text-white uppercase">{getPlayerName(event.batter_id)}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Bowler:</span>
                                                                <span className="text-xs font-bold text-slate-400">{getPlayerName(event.bowler_id)}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="text-right">
                                                        {event.wicket_type && (
                                                            <span className="inline-flex items-center gap-2 px-3 py-1 bg-red-500/20 text-red-400 rounded-lg text-[9px] font-black uppercase tracking-widest border border-red-500/20 mb-2">
                                                                <Target className="h-3 w-3" /> {event.wicket_type}
                                                            </span>
                                                        )}
                                                        {event.extra_type && event.extra_type !== 'RUN' && (
                                                            <span className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 text-amber-400 rounded-lg text-[9px] font-black uppercase tracking-widest border border-amber-500/20 mb-2">
                                                                <AlertCircle className="h-3 w-3" /> {event.extra_type} (+{event.runs_extras})
                                                            </span>
                                                        )}
                                                        <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">
                                                            {new Date(event.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                                        </p>
                                                    </div>
                                                </div>
                                            </Card>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        )) : (
                            <div className="py-32 text-center border-2 border-dashed border-white/5 rounded-[3rem]">
                                <History className="h-12 w-12 text-slate-800 mx-auto mb-4" />
                                <p className="text-slate-500 font-black italic uppercase tracking-widest">No events recorded in this stream</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
