"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Activity, Calendar, Trophy, AlertCircle } from "lucide-react"

interface TickerItem {
    id: string
    type: 'live' | 'fixture' | 'news'
    text: string
    detail?: string
}

export function SlidingTicker() {
    const [items, setItems] = useState<TickerItem[]>([])

    useEffect(() => {
        async function fetchData() {
            if (!supabase) return

            try {
                // 1. Fetch Live Matches with Scores
                const { data: liveData, error: liveError } = await supabase
                    .from('matches')
                    .select(`
                        id,
                        team_a_id,
                        team_b_id,
                        team_a:teams!team_a_id(name),
                        team_b:teams!team_b_id(name)
                    `)
                    .eq('status', 'Live')

                if (liveError) console.error("Error fetching live matches:", liveError)

                // Fetch scores separately for better reliability
                let liveMatchesWithScores = []
                if (liveData && liveData.length > 0) {
                    const matchIds = liveData.map((m: any) => m.id)
                    const { data: scoresData } = await supabase
                        .from('match_scores')
                        .select('*')
                        .in('match_id', matchIds)

                    liveMatchesWithScores = liveData.map((match: any) => ({
                        ...match,
                        match_scores: scoresData?.filter((s: any) => s.match_id === match.id) || []
                    }))
                }

                // 2. Fetch Upcoming Fixtures
                const { data: fixtureData, error: fixtureError } = await supabase
                    .from('matches')
                    .select(`
                        id,
                        match_date,
                        match_time,
                        team_a:teams!team_a_id(name),
                        team_b:teams!team_b_id(name)
                    `)
                    .eq('status', 'Scheduled')
                    .order('match_date', { ascending: true })
                    .limit(5)

                if (fixtureError) console.error("Error fetching fixtures:", fixtureError)

                const newItems: TickerItem[] = []

                // Process Live Matches
                liveMatchesWithScores.forEach((match: any) => {
                    const score = match.match_scores && match.match_scores.length > 0
                        ? `${match.match_scores[0].runs_scored}/${match.match_scores[0].wickets_lost} (${match.match_scores[0].overs_played})`
                        : 'LIVE'

                    newItems.push({
                        id: match.id,
                        type: 'live',
                        text: `${match.team_a.name} vs ${match.team_b.name}`,
                        detail: score
                    })
                })

                // Process Fixtures
                if (fixtureData) {
                    fixtureData.forEach((match: any) => {
                        newItems.push({
                            id: match.id,
                            type: 'fixture',
                            text: `${match.team_a.name} vs ${match.team_b.name}`,
                            detail: new Date(match.match_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
                        })
                    })
                }

                // Add Static News
                newItems.push(
                    { id: 'news1', type: 'news', text: "Tournament Registration Open", detail: "Register your team now!" },
                    { id: 'news2', type: 'news', text: "New Season Begins", detail: "Check the schedule" }
                )

                setItems(newItems)
            } catch (error) {
                console.error("Critical error in ticker fetch:", error)
            }
        }

        fetchData()

        const channel = supabase
            .channel('ticker-updates')
            .on(
                'postgres_changes' as any,
                {
                    event: '*',
                    schema: 'public',
                    table: 'match_scores'
                },
                () => {
                    fetchData()
                }
            )
            .on(
                'postgres_changes' as any,
                {
                    event: '*',
                    schema: 'public',
                    table: 'matches'
                },
                () => {
                    fetchData()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    if (items.length === 0) return null

    return (
        <div className="w-full bg-slate-950 border-b border-white/5 overflow-hidden relative z-50 py-1">
            <div className="flex whitespace-nowrap animate-marquee items-center">
                {/* Render twice for seamless loop with -50% translate */}
                {[...items, ...items].map((item, i) => (
                    <div key={`${item.id}-${i}`} className="flex items-center mx-12 space-x-4 text-sm font-bold">
                        {item.type === 'live' && (
                            <div className="flex items-center space-x-3 bg-red-500/10 px-4 py-1.5 rounded-full border border-red-500/20">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                </span>
                                <span className="text-red-500 text-[10px] uppercase tracking-[0.2em] font-black">Live Feed</span>
                                <span className="text-slate-300 font-medium">{item.text}</span>
                                <span className="text-cyan-400 font-mono font-black drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">{item.detail}</span>
                            </div>
                        )}

                        {item.type === 'fixture' && (
                            <div className="flex items-center space-x-3 bg-blue-500/10 px-4 py-1.5 rounded-full border border-blue-500/20">
                                <Calendar className="h-3.5 w-3.5 text-blue-400" />
                                <span className="text-blue-400 text-[10px] uppercase tracking-[0.2em] font-black">Upcoming</span>
                                <span className="text-slate-300 font-medium">{item.text}</span>
                                <span className="text-slate-500 font-medium">| {item.detail}</span>
                            </div>
                        )}

                        {item.type === 'news' && (
                            <div className="flex items-center space-x-3 bg-amber-500/10 px-4 py-1.5 rounded-full border border-amber-500/20">
                                <Trophy className="h-3.5 w-3.5 text-amber-400" />
                                <span className="text-amber-400 text-[10px] uppercase tracking-[0.2em] font-black">Event</span>
                                <span className="text-slate-300 font-medium">{item.text}</span>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}
