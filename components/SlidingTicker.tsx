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

            // 1. Fetch Live Matches with Scores
            const { data: liveData } = await supabase
                .from('matches')
                .select(`
          id,
          team_a:teams!team_a_id(name),
          team_b:teams!team_b_id(name),
          match_scores(
            team_id,
            runs_scored,
            wickets_lost,
            overs_played
          )
        `)
                .eq('status', 'Live')

            // 2. Fetch Upcoming Fixtures
            const { data: fixtureData } = await supabase
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

            const newItems: TickerItem[] = []

            // Process Live Matches
            if (liveData) {
                liveData.forEach((match: any) => {
                    const score = match.match_scores?.[0]
                        ? `${match.match_scores[0].runs_scored}/${match.match_scores[0].wickets_lost} (${match.match_scores[0].overs_played})`
                        : '0/0 (0.0)'

                    newItems.push({
                        id: match.id,
                        type: 'live',
                        text: `${match.team_a.name} vs ${match.team_b.name}`,
                        detail: score
                    })
                })
            }

            // Process Fixtures
            if (fixtureData) {
                fixtureData.forEach((match: any) => {
                    newItems.push({
                        id: match.id,
                        type: 'fixture',
                        text: `${match.team_a.name} vs ${match.team_b.name}`,
                        detail: new Date(match.match_date).toLocaleDateString()
                    })
                })
            }

            // Add Static News (since we don't have a news table yet)
            newItems.push(
                { id: 'news1', type: 'news', text: "Tournament Registration Open", detail: "Register your team now!" },
                { id: 'news2', type: 'news', text: "New Season Begins", detail: "Check the schedule for upcoming matches" }
            )

            setItems(newItems)
        }

        fetchData()

        const channel = supabase
            .channel('ticker-updates')
            .on(
                'postgres_changes',
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
                'postgres_changes',
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
        <div className="w-full bg-slate-900 border-b border-white/10 overflow-hidden relative z-50">
            <div className="flex whitespace-nowrap animate-marquee">
                {/* Render twice for seamless loop */}
                {[...items, ...items].map((item, i) => (
                    <div key={`${item.id}-${i}`} className="flex items-center mx-8 py-3 space-x-3 text-sm font-medium">
                        {item.type === 'live' && (
                            <span className="flex items-center space-x-2 text-white">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                </span>
                                <span className="text-red-400 font-bold uppercase tracking-wider">Live:</span>
                                <span className="text-slate-200">{item.text}</span>
                                <span className="text-yellow-400 font-mono font-bold">{item.detail}</span>
                            </span>
                        )}

                        {item.type === 'fixture' && (
                            <span className="flex items-center space-x-2 text-slate-400">
                                <Calendar className="h-4 w-4 text-blue-400" />
                                <span className="text-blue-400 font-bold uppercase tracking-wider">Fixture:</span>
                                <span className="text-slate-300">{item.text}</span>
                                <span className="text-slate-500">| {item.detail}</span>
                            </span>
                        )}

                        {item.type === 'news' && (
                            <span className="flex items-center space-x-2 text-slate-400">
                                <Trophy className="h-4 w-4 text-amber-400" />
                                <span className="text-amber-400 font-bold uppercase tracking-wider">News:</span>
                                <span className="text-slate-300">{item.text}</span>
                            </span>
                        )}

                        <div className="h-4 w-[1px] bg-white/10 ml-6" />
                    </div>
                ))}
            </div>
        </div>
    )
}
