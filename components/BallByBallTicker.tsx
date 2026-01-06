"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { supabase } from "@/lib/supabase"
import { Activity } from "lucide-react"
import { cn } from "@/lib/utils"

interface MatchEvent {
    id: string
    over_no: number
    ball_no: number
    runs_batter: number
    runs_extras: number
    extra_type: string
    wicket_type: string
}

export function BallByBallTicker({ matchId }: { matchId: string }) {
    const [events, setEvents] = useState<MatchEvent[]>([])

    useEffect(() => {
        async function fetchEvents() {
            const { data } = await supabase
                .from('match_events')
                .select('*')
                .eq('match_id', matchId)
                .order('created_at', { ascending: false })
                .limit(15)

            if (data) setEvents(data.reverse())
        }

        fetchEvents()

        const channel = supabase
            .channel(`ball-ticker-${matchId}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'match_events', filter: `match_id=eq.${matchId}` },
                () => fetchEvents()
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [matchId])

    if (events.length === 0) return null

    return (
        <div className="w-full bg-slate-950/80 backdrop-blur-xl border-y border-white/5 py-4 overflow-hidden relative">
            <div className="max-w-6xl mx-auto px-4 flex items-center gap-6">
                <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full shrink-0">
                    <Activity className="h-3 w-3 text-primary animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary">Live Timeline</span>
                </div>

                <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-1">
                    <AnimatePresence mode="popLayout">
                        {events.map((event) => (
                            <motion.div
                                key={event.id}
                                initial={{ opacity: 0, scale: 0.8, x: 20 }}
                                animate={{ opacity: 1, scale: 1, x: 0 }}
                                exit={{ opacity: 0, scale: 0.8, x: -20 }}
                                className="flex flex-col items-center gap-1 shrink-0"
                            >
                                <div className={cn(
                                    "w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black border transition-all",
                                    event.wicket_type ? "bg-red-500 border-red-400 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)]" :
                                        (event.runs_batter === 4 || event.runs_batter === 6) ? "bg-primary border-primary/50 text-white shadow-[0_0_15px_rgba(59,130,246,0.4)]" :
                                            event.runs_batter === 0 && !event.extra_type ? "bg-slate-800 border-white/10 text-slate-400" :
                                                "bg-white/5 border-white/10 text-white"
                                )}>
                                    {event.wicket_type ? 'W' :
                                        (event.extra_type?.toLowerCase() === 'wide' || event.extra_type === 'WIDE') ? `${event.runs_extras}WD` :
                                            (event.extra_type?.toLowerCase() === 'no ball' || event.extra_type === 'NO_BALL') ? `${event.runs_batter + 1}NB` :
                                                event.runs_batter}
                                </div>
                                <span className="text-[8px] font-bold text-white/30 truncate w-10 text-center">
                                    {event.over_no}.{event.ball_no}
                                </span>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    )
}
