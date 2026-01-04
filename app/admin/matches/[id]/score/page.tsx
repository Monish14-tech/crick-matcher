"use client"

import { useEffect, useState, use } from "react"
import { useRouter } from "next/navigation"
import { Trophy, Users, Shield, Save, ArrowLeft, Plus, Minus, Zap, User, Target, ChevronDown, ChevronUp, History, RotateCcw, Swords, MousePointer2, PieChart, BarChart3, Trash2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabase"
import { SupabaseError } from "@/components/SupabaseError"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface Player {
    id: string
    name: string
    team_id: string
}

interface Team {
    id: string
    name: string
}

interface Match {
    id: string
    team_a_id: string
    team_b_id: string
    team_a: Team
    team_b: Team
    status: string
    overs_type: string
}

interface ActiveState {
    batting_team_id: string
    striker_id: string | null
    non_striker_id: string | null
    bowler_id: string | null
    innings_no: number
    current_over: number
    current_ball: number
}

export default function AdminScoringPage({ params }: { params: Promise<{ id: string }> }) {
    if (!supabase) return <SupabaseError />
    const { id } = use(params)
    const router = useRouter()

    const [match, setMatch] = useState<Match | null>(null)
    const [players, setPlayers] = useState<Player[]>([])
    const [loading, setLoading] = useState(true)
    const [activeState, setActiveState] = useState<ActiveState | null>(null)
    const [events, setEvents] = useState<any[]>([])
    const [recentEvents, setRecentEvents] = useState<any[]>([])
    const [outPlayerIds, setOutPlayerIds] = useState<string[]>([])
    const [score, setScore] = useState({ runs: 0, wickets: 0 })
    const [lastBowlerId, setLastBowlerId] = useState<string | null>(null)
    const [targetScore, setTargetScore] = useState<number | null>(null)

    // Toss and match start
    const [showTossSelection, setShowTossSelection] = useState(false)
    const [tossWinner, setTossWinner] = useState<string | null>(null)
    const [battingFirst, setBattingFirst] = useState<string | null>(null)

    // Scoring helpers
    const [showSelection, setShowSelection] = useState(true)
    const [isStarting, setIsStarting] = useState(false)
    const [showInningsSummary, setShowInningsSummary] = useState(false)

    // Parse total overs from match type (handles T10, T20, 50 Overs, and custom like "15 Overs")
    const getTotalOvers = (oversType: string) => {
        if (oversType === 'T10') return 10
        if (oversType === 'T20') return 20
        if (oversType === '50 Overs') return 50
        // Extract number from custom format (e.g., "15 Overs")
        const match = oversType.match(/(\d+)/)
        return match ? parseInt(match[1]) : 20
    }
    const totalOvers = match ? getTotalOvers(match.overs_type) : 20

    const fetchData = async () => {
        setLoading(true)
        const { data: matchData } = await supabase
            .from('matches')
            .select('*, team_a:teams!team_a_id(id, name), team_b:teams!team_b_id(id, name)')
            .eq('id', id)
            .single()

        if (matchData) {
            setMatch(matchData)
            const { data: pData } = await supabase.from('players').select('*').in('team_id', [matchData.team_a_id, matchData.team_b_id])
            setPlayers(pData || [])

            // Fetch active state
            const { data: stateData } = await supabase.from('match_active_state').select('*').eq('match_id', id).single()
            if (stateData) {
                setActiveState(stateData)
                setShowSelection(!stateData.striker_id || !stateData.non_striker_id || !stateData.bowler_id)
                setShowTossSelection(false)
            } else {
                // Show toss selection if match hasn't started and no toss winner set
                if (!matchData.toss_winner_id) {
                    setShowTossSelection(true)
                }
                // Default state if not exists
                setActiveState({
                    batting_team_id: matchData.team_a_id,
                    striker_id: null,
                    non_striker_id: null,
                    bowler_id: null,
                    innings_no: 1,
                    current_over: 0,
                    current_ball: 0
                })
            }

            // Fetch all events for stats
            const { data: allEventData } = await supabase.from('match_events').select('*').eq('match_id', id).order('created_at', { ascending: false })
            setEvents(allEventData || [])
            setRecentEvents(allEventData?.slice(0, 10) || [])

            // Fetch out players
            const { data: wicketEvents } = await supabase.from('match_events').select('player_out_id').eq('match_id', id).not('player_out_id', 'is', null)
            setOutPlayerIds(wicketEvents?.map((w: any) => w.player_out_id as string) || [])

            // Fetch current score
            const { data: scoreData } = await supabase.from('match_scores').select('*').eq('match_id', id).eq('team_id', stateData?.batting_team_id || matchData.team_a_id).single()
            if (scoreData) setScore({ runs: scoreData.runs_scored, wickets: scoreData.wickets_lost })

            // Fetch last bowler
            if (allEventData && allEventData.length > 0) {
                setLastBowlerId(allEventData[0].bowler_id)
            }

            // Fetch target score if 2nd innings
            if (stateData?.innings_no === 2) {
                const { data: firstScore } = await supabase.from('match_scores').select('runs_scored').eq('match_id', id).eq('is_first_innings', true).single()
                if (firstScore) {
                    setTargetScore(firstScore.runs_scored + 1)
                }
            } else {
                setTargetScore(null)
            }

            // Check if innings should be considered ended (for page refresh/initial load)
            if (scoreData) {
                const battingTeamId = stateData?.batting_team_id || matchData.team_a_id
                const totalPlayers = (pData || []).filter((p: any) => p.team_id === battingTeamId).length
                const maxWickets = Math.max(1, totalPlayers - 1)

                const isAllOut = scoreData.wickets_lost >= maxWickets
                const isOversComplete = scoreData.overs_played >= totalOvers
                const isTargetReached = stateData?.innings_no === 2 && targetScore !== null && scoreData.runs_scored >= targetScore

                if (isAllOut || isOversComplete || isTargetReached || matchData.status === 'Completed') {
                    setShowInningsSummary(true)
                }
            }
        }
        setLoading(false)
    }

    useEffect(() => {
        fetchData()
    }, [id])

    const handleUndo = async () => {
        if (events.length === 0) return alert("Nothing to undo.")
        if (!confirm("Are you sure you want to undo the last ball?")) return

        const lastEvent = events[0]
        const { error: delError } = await supabase.from('match_events').delete().eq('id', lastEvent.id)

        if (delError) return alert("Undo failed: " + delError.message)

        // Reset active state in DB based on remaining events or just clear strikers/bowler if we want user to re-select
        // For simplicity and correctness, we refetch and let the user re-adjust if needed
        await fetchData()
    }

    const handleDeleteEvent = async (eventId: string) => {
        if (!confirm("Are you sure you want to delete this specific event? This will affect the current score calculations.")) return

        const { error: delError } = await supabase.from('match_events').delete().eq('id', eventId)
        if (delError) return alert("Delete failed: " + delError.message)

        await fetchData()
    }

    const handleResetAllData = async () => {
        if (!confirm("CRITICAL WARNING: This will PERMANENTLY ERASE everything—Matches, Teams, Players, Grounds, and Scores. This action CANNOT be undone.\n\nAre you absolutely sure?")) return

        setLoading(true)
        try {
            console.log("Starting Full System Purge...")
            const tables = [
                'match_events', 'player_performances', 'match_scores',
                'match_active_state', 'tournament_teams', 'matches',
                'players', 'teams', 'tournaments', 'grounds'
            ]

            for (const table of tables) {
                const { error } = await supabase.from(table).delete().neq(table === 'match_active_state' ? 'match_id' : (table === 'tournament_teams' ? 'team_id' : 'id'), '00000000-0000-0000-0000-000000000000')
                if (error) {
                    console.error(`Error deleting from ${table}:`, error)
                    // If table doesn't exist, we can continue, but if it's a permission error, we should tell the user
                    if (error.code !== '42P01') { // 42P01 is "relation does not exist"
                        throw new Error(`Failed to delete from ${table}: ${error.message} (Code: ${error.code})`)
                    }
                }
            }

            alert("SUCCESS: System Purged. All data has been wiped.")
            window.location.href = '/admin' // Force reload to clear stats
        } catch (err: any) {
            console.error("Critical Reset Error:", err)
            alert("RESET FAILED: " + err.message + "\n\nIMPORTANT: This error usually occurs because 'DELETE' permissions are not enabled for ALL tables in your Supabase Dashboard. Without a DELETE policy, the database blocks these requests.")
        } finally {
            setLoading(false)
        }
    }

    const handleTossComplete = async () => {
        if (!tossWinner || !battingFirst) {
            alert("Please select both toss winner and batting team!")
            return
        }

        setIsStarting(true)
        try {
            // Update match with toss winner
            const { error: matchError } = await supabase
                .from('matches')
                .update({
                    toss_winner_id: tossWinner,
                    status: 'Live'
                })
                .eq('id', id)

            if (matchError) throw matchError

            // Set the batting team for first innings
            setActiveState(prev => prev ? {
                ...prev,
                batting_team_id: battingFirst
            } : null)

            setShowTossSelection(false)
            await fetchData()
        } catch (err: any) {
            console.error("Toss Error:", err)
            alert("Error: " + err.message)
        } finally {
            setIsStarting(false)
        }
    }

    const handleStartInnings = async () => {
        if (!activeState?.striker_id || !activeState?.non_striker_id || !activeState?.bowler_id) {
            alert("Please select striker, non-striker and bowler first!")
            return
        }

        setIsStarting(true)
        try {
            const { error } = await supabase.from('match_active_state').upsert({
                match_id: id,
                batting_team_id: activeState.batting_team_id,
                striker_id: activeState.striker_id,
                non_striker_id: activeState.non_striker_id,
                bowler_id: activeState.bowler_id,
                innings_no: activeState.innings_no,
                current_over: activeState.current_over,
                current_ball: activeState.current_ball
            })

            if (error) throw error

            setShowSelection(false)
            if (match?.status === 'Scheduled') {
                await supabase.from('matches').update({ status: 'Live' }).eq('id', id)
            }
        } catch (err: any) {
            console.error("Selection Error:", err)
            alert("Error: " + err.message + "\n\nImportant: Ensure you have run the new SQL schema in your Supabase SQL Editor.")
        } finally {
            setIsStarting(false)
        }
    }

    const logBall = async (runs: number, extraType?: string, isWicket: boolean = false) => {
        if (!activeState || !match) return

        const isExtraBall = ['Wide', 'No Ball'].includes(extraType || '')

        const newEvent = {
            match_id: id,
            innings_no: activeState.innings_no,
            over_no: activeState.current_over,
            ball_no: activeState.current_ball + (isExtraBall ? 0 : 1),
            batter_id: activeState.striker_id,
            bowler_id: activeState.bowler_id,
            non_striker_id: activeState.non_striker_id,
            runs_batter: extraType ? (['Bye', 'Leg Bye'].includes(extraType) ? runs : 0) : runs,
            runs_extras: extraType ? (['Wide', 'No Ball'].includes(extraType) ? 1 + runs : 0) : 0,
            extra_type: extraType,
            wicket_type: isWicket ? 'Bowled' : null,
            player_out_id: isWicket ? activeState.striker_id : null,
            commentary: isWicket ? `WICKET! ${players.find(p => p.id === activeState.striker_id)?.name} is out.` :
                extraType ? `${extraType}: ${runs} runs taken.` : `${runs} runs.`
        }

        const { data: eventData, error: eventError } = await supabase.from('match_events').insert([newEvent]).select()
        if (eventError) return alert(eventError.message)

        // Calculate new scores
        const runsThisBall = isExtraBall ? (1 + runs) : runs
        const newTotalRuns = score.runs + runsThisBall
        const newTotalWickets = score.wickets + (isWicket ? 1 : 0)

        let nextBall = activeState.current_ball + (isExtraBall ? 0 : 1)
        let nextOver = activeState.current_over
        let currentStriker = activeState.striker_id
        let currentNonStriker = activeState.non_striker_id

        // Calculate max wickets (Strict professional rule: 10 wickets)
        const maxWickets = 10

        if (isWicket) {
            setOutPlayerIds(prev => [...prev, activeState.striker_id!])
            currentStriker = null
            // Only show selection if NOT all out
            if (newTotalWickets < maxWickets) {
                setShowSelection(true)
            }
        }

        if (runs % 2 !== 0 && !isWicket) {
            const temp = currentStriker
            currentStriker = currentNonStriker
            currentNonStriker = temp
        }

        if (nextBall >= 6) {
            nextBall = 0
            nextOver += 1
            const temp = currentStriker
            currentStriker = currentNonStriker
            currentNonStriker = temp
            setLastBowlerId(activeState.bowler_id)

            // Only show selection if NOT match end
            if (activeState.innings_no === 1 || (targetScore && newTotalRuns < targetScore)) {
                setShowSelection(true)
            }
        }

        // Check for Innings End
        const isAllOut = newTotalWickets >= maxWickets
        const isOversComplete = nextOver >= totalOvers
        const isTargetReached = activeState.innings_no === 2 && targetScore !== null && newTotalRuns >= targetScore

        const isInningsEnd = isAllOut || isOversComplete || isTargetReached

        if (isInningsEnd) {
            let stopReason = isTargetReached ? "Target achieved" : isAllOut ? "All out" : "Overs completed"
            setShowInningsSummary(true)

            if (activeState.innings_no === 2) {
                await supabase.from('matches').update({ status: 'Completed' }).eq('id', id)
            }

            // Only update scores, DO NOT update active state (balls/overs) further if innings ended
            // This prevents "Over 20.1"
            const oversPlayedStr = isOversComplete ? `${totalOvers}.0` :
                isAllOut || isTargetReached ? `${activeState.current_over}.${activeState.current_ball + (isExtraBall ? 0 : 1)}` :
                    `${nextOver}.${nextBall}`

            await supabase.from('match_scores').upsert({
                match_id: id,
                team_id: activeState.batting_team_id,
                runs_scored: newTotalRuns,
                wickets_lost: newTotalWickets,
                overs_played: parseFloat(oversPlayedStr),
                is_first_innings: activeState.innings_no === 1
            }, { onConflict: 'match_id,team_id' })

            // Also update local score state locally so UI reflects it immediately
            setScore({ runs: newTotalRuns, wickets: newTotalWickets })
            // Add event to local list
            setRecentEvents(prev => [eventData[0], ...prev.slice(0, 9)])
            setEvents(prev => [eventData[0], ...prev])

            return // STOP HERE
        }

        const oversPlayedStr = `${nextOver}.${nextBall}`
        const { error: scoreErr } = await supabase.from('match_scores').upsert({
            match_id: id,
            team_id: activeState.batting_team_id,
            runs_scored: newTotalRuns,
            wickets_lost: newTotalWickets,
            overs_played: parseFloat(oversPlayedStr),
            is_first_innings: activeState.innings_no === 1
        }, { onConflict: 'match_id,team_id' })

        if (scoreErr) console.error(scoreErr)

        const newState = {
            ...activeState,
            striker_id: currentStriker,
            non_striker_id: currentNonStriker,
            current_ball: nextBall,
            current_over: nextOver,
            last_event_id: eventData[0].id
        }

        setActiveState(newState)
        setScore({ runs: newTotalRuns, wickets: newTotalWickets })
        await supabase.from('match_active_state').update(newState).eq('match_id', id)
        setRecentEvents(prev => [eventData[0], ...prev.slice(0, 9)])
        setEvents(prev => [eventData[0], ...prev])

        // After updating state, check if we need to auto-switch innings or match status
        if (isInningsEnd) {
            if (activeState.innings_no === 1) {
                // For 1st innings, we show summary and let user click "Next Innings"
                // Or we could auto-switch if preferred, but usually summary is good.
            } else {
                // Match complete
                await supabase.from('matches').update({ status: 'Completed' }).eq('id', id)
            }
        }
    }

    const handleNextInnings = async () => {
        if (!match || !activeState) return
        const nextBattingTeamId = activeState.batting_team_id === match.team_a_id ? match.team_b_id : match.team_a_id

        const newState = {
            match_id: id,
            batting_team_id: nextBattingTeamId,
            striker_id: null,
            non_striker_id: null,
            bowler_id: null,
            innings_no: 2,
            current_over: 0,
            current_ball: 0
        }

        const { error } = await supabase.from('match_active_state').upsert(newState)
        if (error) return alert(error.message)

        setActiveState(newState as any)
        setScore({ runs: 0, wickets: 0 })
        setOutPlayerIds([])
        setShowInningsSummary(false)
        setShowSelection(true)

        // Refresh data to get the new target score and player list
        await fetchData()
    }

    const handleManualInningsEnd = async () => {
        if (!activeState) return
        if (!confirm(`Are you sure you want to end Innings ${activeState.innings_no} manually?`)) return

        if (activeState.innings_no === 1) {
            await handleNextInnings()
        } else {
            setShowInningsSummary(true)
            await supabase.from('matches').update({ status: 'Completed' }).eq('id', id)
        }
    }

    if (loading) return <div className="p-20 text-center font-bold animate-pulse text-primary italic">Synchronizing Live Node...</div>
    if (!match || !activeState) return <div className="p-20 text-center">Match synchronization failed.</div>

    const battingTeam = players.filter(p => p.team_id === activeState.batting_team_id && !outPlayerIds.includes(p.id))
    const bowlingTeam = players.filter(p => p.team_id !== activeState.batting_team_id)

    const currentCRR = (score.runs / (activeState.current_over + activeState.current_ball / 6) || 0).toFixed(2)

    // Calculate Live Player Stats
    const getBatterStats = (playerId: string | null) => {
        if (!playerId) return null;
        const playerEvents = events.filter(e => e.innings_no === activeState.innings_no && e.batter_id === playerId);
        const runs = playerEvents.reduce((sum, e) => sum + e.runs_batter, 0);
        const balls = playerEvents.filter(e => e.extra_type !== 'Wide' && e.extra_type !== 'No Ball').length;
        const sr = balls > 0 ? ((runs / balls) * 100).toFixed(0) : "0";
        return { runs, balls, sr };
    }

    const getBowlerStats = (playerId: string | null) => {
        if (!playerId) return null;
        const playerEvents = events.filter(e => e.innings_no === activeState.innings_no && e.bowler_id === playerId);
        const balls = playerEvents.filter(e => e.extra_type !== 'Wide' && e.extra_type !== 'No Ball').length;
        const overs = Math.floor(balls / 6) + '.' + (balls % 6);

        let wickets = 0;
        let runsConceded = 0;

        playerEvents.forEach(e => {
            if (e.wicket_type && e.wicket_type !== 'Run Out') wickets++;
            // Calculate bowler runs (Batter Runs + Wides + No Balls)
            let extras = 0;
            if (e.extra_type === 'Wide' || e.extra_type === 'No Ball') {
                extras = e.runs_extras;
            }
            runsConceded += e.runs_batter + extras;
        });

        return { overs, wickets, runs: runsConceded };
    }

    const strikerStats = getBatterStats(activeState.striker_id);
    const nonStrikerStats = getBatterStats(activeState.non_striker_id);
    const bowlerStats = getBowlerStats(activeState.bowler_id);

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-4">
                <div className="w-full md:w-auto">
                    <Link href="/admin" className="inline-flex items-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary mb-2">
                        <ArrowLeft className="mr-1 h-3 w-3" /> Dashboard
                    </Link>
                    <div className="flex items-center justify-between md:block">
                        <h1 className="text-3xl md:text-4xl font-black italic tracking-tighter uppercase">Live<span className="text-primary italic">Scorer</span></h1>
                        <div className="md:hidden bg-red-500 text-white px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest animate-pulse flex items-center gap-1">
                            <div className="h-1.5 w-1.5 rounded-full bg-white" /> Live
                        </div>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                    <Button variant="outline" size="sm" className="flex-1 md:flex-none rounded-full bg-slate-50 border-slate-200 font-bold text-[10px] uppercase tracking-widest gap-2 h-9" onClick={handleUndo}>
                        <RotateCcw className="h-3 w-3" /> Undo
                    </Button>
                    {!showInningsSummary && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 md:flex-none rounded-full bg-blue-50 text-blue-600 border-blue-200 font-bold text-[10px] uppercase tracking-widest gap-2 h-9"
                            onClick={handleManualInningsEnd}
                        >
                            <Zap className="h-3 w-3" /> End Inn
                        </Button>
                    )}
                    <Button variant="destructive" size="sm" className="flex-1 md:flex-none rounded-full font-bold text-[10px] uppercase tracking-widest h-9" onClick={handleResetAllData}>
                        Reset
                    </Button>
                    <div className="hidden md:flex bg-red-500 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-white" /> Live Node
                    </div>
                </div>
            </div>

            {/* Toss Selection Screen */}
            {showTossSelection ? (
                <Card className="max-w-3xl mx-auto border-none shadow-2xl rounded-[3rem] overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
                    <CardHeader className="p-12 text-center border-b border-white/10">
                        <Trophy className="h-16 w-16 text-primary mx-auto mb-4" />
                        <CardTitle className="text-4xl font-black italic uppercase tracking-tighter">
                            Toss <span className="text-primary">Selection</span>
                        </CardTitle>
                        <CardDescription className="text-white/60 font-bold uppercase tracking-widest text-xs mt-4">
                            Select toss winner and batting team
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-12 space-y-8">
                        {/* Toss Winner Selection */}
                        <div className="space-y-4">
                            <Label className="text-xs font-black uppercase tracking-widest text-white/60">Who Won the Toss?</Label>
                            <div className="grid grid-cols-2 gap-4">
                                <div
                                    onClick={() => setTossWinner(match.team_a.id)}
                                    className={`p-6 rounded-2xl border-2 cursor-pointer transition-all ${tossWinner === match.team_a.id
                                        ? 'bg-primary border-primary text-white'
                                        : 'bg-white/5 border-white/10 hover:border-white/30'
                                        }`}
                                >
                                    <Shield className="h-8 w-8 mx-auto mb-3" />
                                    <p className="text-center font-black text-lg">{match.team_a.name}</p>
                                </div>
                                <div
                                    onClick={() => setTossWinner(match.team_b.id)}
                                    className={`p-6 rounded-2xl border-2 cursor-pointer transition-all ${tossWinner === match.team_b.id
                                        ? 'bg-primary border-primary text-white'
                                        : 'bg-white/5 border-white/10 hover:border-white/30'
                                        }`}
                                >
                                    <Shield className="h-8 w-8 mx-auto mb-3" />
                                    <p className="text-center font-black text-lg">{match.team_b.name}</p>
                                </div>
                            </div>
                        </div>

                        {/* Batting First Selection */}
                        <div className="space-y-4">
                            <Label className="text-xs font-black uppercase tracking-widest text-white/60">Who Will Bat First?</Label>
                            <div className="grid grid-cols-2 gap-4">
                                <div
                                    onClick={() => setBattingFirst(match.team_a.id)}
                                    className={`p-6 rounded-2xl border-2 cursor-pointer transition-all ${battingFirst === match.team_a.id
                                        ? 'bg-primary border-primary text-white'
                                        : 'bg-white/5 border-white/10 hover:border-white/30'
                                        }`}
                                >
                                    <Users className="h-8 w-8 mx-auto mb-3" />
                                    <p className="text-center font-black text-lg">{match.team_a.name}</p>
                                </div>
                                <div
                                    onClick={() => setBattingFirst(match.team_b.id)}
                                    className={`p-6 rounded-2xl border-2 cursor-pointer transition-all ${battingFirst === match.team_b.id
                                        ? 'bg-primary border-primary text-white'
                                        : 'bg-white/5 border-white/10 hover:border-white/30'
                                        }`}
                                >
                                    <Users className="h-8 w-8 mx-auto mb-3" />
                                    <p className="text-center font-black text-lg">{match.team_b.name}</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="p-12 bg-white/10">
                        <Button
                            className="w-full h-16 rounded-3xl font-black text-xl"
                            onClick={handleTossComplete}
                            disabled={!tossWinner || !battingFirst || isStarting}
                        >
                            {isStarting ? "Starting Match..." : "Confirm Toss & Start Match"}
                        </Button>
                    </CardFooter>
                </Card>
            ) : (
                <div className="grid lg:grid-cols-12 gap-8">
                    {showInningsSummary ? (
                        <div className="lg:col-span-12">
                            <InningsSummary
                                match={match}
                                activeState={activeState}
                                score={score}
                                players={players}
                                events={events}
                                totalOvers={totalOvers}
                                targetScore={targetScore}
                                onNext={activeState.innings_no === 1 ? handleNextInnings : () => router.push(`/matches/${id}`)}
                                onDelete={async () => {
                                    if (confirm("This will permanently delete the match record. Proceed?")) {
                                        setLoading(true)
                                        await supabase.from('matches').delete().eq('id', id)
                                        router.push('/admin')
                                    }
                                }}
                            />
                        </div>
                    ) : (
                        <>
                            {/* Left Side: Active Field & Keypad */}
                            <div className="lg:col-span-8 space-y-6">
                                {/* Active Match Status Card */}
                                <Card className="bg-slate-900 text-white border-none shadow-2xl rounded-[2.5rem] overflow-hidden">
                                    <CardHeader className="p-6 md:p-8 border-b border-white/10 flex flex-row justify-between items-center">
                                        <div>
                                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-primary">Innings {activeState.innings_no}</p>
                                                {activeState.innings_no === 2 && targetScore && (
                                                    <span className="bg-white/10 text-white text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter">Target: {targetScore}</span>
                                                )}
                                            </div>
                                            <h2 className="text-lg md:text-2xl font-black truncate max-w-[150px] md:max-w-none">
                                                {players.find(p => p.team_id === activeState.batting_team_id)?.team_id === match.team_a.id ? match.team_a.name : match.team_b.name}
                                            </h2>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">Over {activeState.current_over}.{activeState.current_ball} • CRR: {currentCRR}</p>
                                            <div className="text-3xl md:text-4xl font-black italic text-primary">{score.runs}/{score.wickets}</div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-6 md:p-8 space-y-4">
                                        {/* 2nd Innings Target Info */}
                                        {activeState.innings_no === 2 && targetScore && (
                                            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex justify-between items-center mb-2">
                                                <div className="space-y-0.5">
                                                    <p className="text-[9px] font-black uppercase text-white/40">Target</p>
                                                    <p className="text-xl font-black italic leading-none">{targetScore}</p>
                                                </div>
                                                <div className="text-center px-4 border-l border-r border-white/10">
                                                    <p className="text-[9px] font-black uppercase text-white/40 mb-1">Status</p>
                                                    <p className="text-[10px] font-black uppercase text-primary animate-pulse">
                                                        {score.runs >= targetScore ? "Target Reached" : `Need ${targetScore - score.runs} from ${((totalOvers - activeState.current_over) * 6 - activeState.current_ball)} balls`}
                                                    </p>
                                                </div>
                                                <div className="text-right space-y-0.5">
                                                    <p className="text-[9px] font-black uppercase text-primary">Required</p>
                                                    <p className="text-xl font-black italic text-primary leading-none">{Math.max(0, targetScore - score.runs)}</p>
                                                </div>
                                            </div>
                                        )}
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-8">
                                            <ActivePlayerTile
                                                label="Striker"
                                                name={players.find(p => p.id === activeState.striker_id)?.name || "Select"}
                                                icon={Swords}
                                                active
                                                onClick={() => setShowSelection(true)}
                                                stats={strikerStats ? `${strikerStats.runs} (${strikerStats.balls})` : null}
                                                subStats={strikerStats ? `SR: ${strikerStats.sr}` : null}
                                            />
                                            <ActivePlayerTile
                                                label="Non-Striker"
                                                name={players.find(p => p.id === activeState.non_striker_id)?.name || "Select"}
                                                icon={User}
                                                onClick={() => setShowSelection(true)}
                                                stats={nonStrikerStats ? `${nonStrikerStats.runs} (${nonStrikerStats.balls})` : null}
                                                subStats={nonStrikerStats ? `SR: ${nonStrikerStats.sr}` : null}
                                            />
                                            <ActivePlayerTile
                                                label="Bowler"
                                                name={players.find(p => p.id === activeState.bowler_id)?.name || "Select"}
                                                icon={Target}
                                                color="text-red-400"
                                                onClick={() => setShowSelection(true)}
                                                stats={bowlerStats ? `${bowlerStats.wickets}-${bowlerStats.runs}` : null}
                                                subStats={bowlerStats ? `${bowlerStats.overs} Ov` : null}
                                            />
                                        </div>
                                    </CardContent>
                                </Card>

                                {showSelection ? (
                                    <Card className="border-2 border-primary/20 shadow-xl rounded-[2.5rem]">
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2">
                                                <MousePointer2 className="h-5 w-5 text-primary" /> Select Active Players
                                            </CardTitle>
                                            <CardDescription>Assign roles for the current over</CardDescription>
                                        </CardHeader>
                                        <CardContent className="grid md:grid-cols-3 gap-6">
                                            <div className="space-y-4">
                                                <Label className="text-[10px] font-black uppercase tracking-widest">Striker</Label>
                                                <select
                                                    className="w-full h-12 rounded-xl bg-muted px-4 font-bold border-none outline-none focus:ring-2 focus:ring-primary"
                                                    value={activeState.striker_id || ""}
                                                    onChange={(e) => setActiveState(prev => prev ? { ...prev, striker_id: e.target.value } : null)}
                                                >
                                                    <option value="">Choose Batter</option>
                                                    {battingTeam.filter(p => p.id !== activeState.non_striker_id).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                </select>
                                            </div>
                                            <div className="space-y-4">
                                                <Label className="text-[10px] font-black uppercase tracking-widest">Non-Striker</Label>
                                                <select
                                                    className="w-full h-12 rounded-xl bg-muted px-4 font-bold border-none outline-none focus:ring-2 focus:ring-primary"
                                                    value={activeState.non_striker_id || ""}
                                                    onChange={(e) => setActiveState(prev => prev ? { ...prev, non_striker_id: e.target.value } : null)}
                                                >
                                                    <option value="">Choose Batter</option>
                                                    {battingTeam.filter(p => p.id !== activeState.striker_id).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                </select>
                                            </div>
                                            <div className="space-y-4">
                                                <Label className="text-[10px] font-black uppercase tracking-widest">Bowler</Label>
                                                <select
                                                    className="w-full h-12 rounded-xl bg-muted px-4 font-bold border-none outline-none focus:ring-2 focus:ring-primary"
                                                    value={activeState.bowler_id || ""}
                                                    onChange={(e) => setActiveState(prev => prev ? { ...prev, bowler_id: e.target.value } : null)}
                                                >
                                                    <option value="">Choose Bowler</option>
                                                    {bowlingTeam.filter(p => p.id !== lastBowlerId).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                </select>
                                            </div>
                                        </CardContent>
                                        <CardFooter>
                                            <Button
                                                className="w-full h-14 rounded-2xl font-black text-lg"
                                                onClick={handleStartInnings}
                                                disabled={isStarting}
                                            >
                                                {isStarting ? "Processing..." : "Lock Selection & Continue"}
                                            </Button>
                                        </CardFooter>
                                    </Card>
                                ) : (
                                    <div className="grid grid-cols-3 md:grid-cols-4 gap-2 md:gap-4">
                                        {[0, 1, 2, 3, 4, 6].map(runs => (
                                            <Button key={runs} variant="secondary" className="h-16 md:h-20 text-xl md:text-2xl font-black rounded-2xl md:rounded-3xl hover:bg-primary hover:text-white transition-all shadow-lg" onClick={() => logBall(runs)}>
                                                {runs}
                                            </Button>
                                        ))}
                                        <Button variant="outline" className="h-16 md:h-20 text-base md:text-xl font-black rounded-2xl md:rounded-3xl border-2 border-amber-500 text-amber-600 hover:bg-amber-50" onClick={() => logBall(1, 'Wide')}>
                                            WD
                                        </Button>
                                        <Button variant="outline" className="h-16 md:h-20 text-base md:text-xl font-black rounded-2xl md:rounded-3xl border-2 border-orange-500 text-orange-600 hover:bg-orange-50" onClick={() => logBall(1, 'No Ball')}>
                                            NB
                                        </Button>
                                        <Button variant="outline" className="h-16 md:h-20 text-base md:text-xl font-black rounded-2xl md:rounded-3xl border-2 border-slate-400 text-slate-600 hover:bg-slate-50" onClick={() => logBall(0, 'Bye')}>
                                            BYE
                                        </Button>
                                        <Button variant="outline" className="h-16 md:h-20 text-base md:text-xl font-black rounded-2xl md:rounded-3xl border-2 border-slate-400 text-slate-600 hover:bg-slate-50" onClick={() => logBall(0, 'Leg Bye')}>
                                            LB
                                        </Button>
                                        <Button variant="destructive" className="h-16 md:h-20 text-base md:text-xl font-black rounded-2xl md:rounded-3xl col-span-2 shadow-xl shadow-red-200" onClick={() => logBall(0, undefined, true)}>
                                            WICKET
                                        </Button>
                                    </div>
                                )}
                            </div>

                            {/* Right Side: Recent Balls & Actions */}
                            <div className="lg:col-span-4 space-y-6">
                                <Card className="border-none shadow-xl rounded-[2rem] overflow-hidden h-[600px] flex flex-col">
                                    <CardHeader className="bg-slate-50 border-b flex flex-row items-center justify-between">
                                        <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                                            <History className="h-4 w-4 text-primary" /> Live Timeline
                                        </CardTitle>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                                            <RotateCcw className="h-4 w-4" />
                                        </Button>
                                    </CardHeader>
                                    <CardContent className="p-0 flex-grow overflow-y-auto">
                                        <div className="divide-y divide-border">
                                            {recentEvents.length > 0 ? recentEvents.map((event, i) => (
                                                <div key={event.id} className="p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors group">
                                                    <div className="h-10 w-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-xs shrink-0 ring-4 ring-slate-100">
                                                        {event.over_no}.{event.ball_no}
                                                    </div>
                                                    <div className="flex-grow">
                                                        <p className="text-sm font-bold flex items-center justify-between">
                                                            <span>Ball Event</span>
                                                            <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-black uppercase",
                                                                event.runs_batter === 4 || event.runs_batter === 6 ? "bg-primary text-white" :
                                                                    event.wicket_type ? "bg-red-500 text-white" : "bg-slate-100"
                                                            )}>
                                                                {event.wicket_type ? "OUT" : event.runs_extras > 0 ? `${event.extra_type}` : `${event.runs_batter} Runs`}
                                                            </span>
                                                        </p>
                                                        <p className="text-[10px] text-muted-foreground mt-1 truncate">
                                                            {players.find(p => p.id === event.batter_id)?.name} facing {players.find(p => p.id === event.bowler_id)?.name}
                                                        </p>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        onClick={() => handleDeleteEvent(event.id)}
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            )) : (
                                                <div className="p-12 text-center text-muted-foreground italic">
                                                    Waiting for first ball delivery...
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                    <CardFooter className="bg-slate-50 border-t p-4">
                                        <Button variant="outline" className="w-full text-xs font-black uppercase h-10 rounded-xl" onClick={() => router.push(`/matches/${id}`)}>
                                            Full Commentary View
                                        </Button>
                                    </CardFooter>
                                </Card>

                                <Button variant="outline" className="w-full h-14 rounded-2xl font-bold border-2" asChild>
                                    <Link href={`/admin`}>
                                        Finish & Exit Match
                                    </Link>
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    )
}

function InningsSummary({ match, activeState, score, onNext, players, events, totalOvers, targetScore, onDelete }: any) {
    const isFirstInnings = activeState.innings_no === 1
    const totalBalls = activeState.current_over * 6 + activeState.current_ball
    const runRate = (score.runs / (totalBalls / 6) || 0).toFixed(2)

    // Stats calculation
    const currentInningsEvents = events.filter((e: any) => e.innings_no === activeState.innings_no)

    const batterStats = currentInningsEvents.reduce((acc: any, e: any) => {
        if (!acc[e.batter_id]) acc[e.batter_id] = { name: players.find((p: any) => p.id === e.batter_id)?.name, runs: 0, balls: 0, boundaries: 0 }
        acc[e.batter_id].runs += e.runs_batter
        if (e.extra_type !== 'Wide' && e.extra_type !== 'No Ball') acc[e.batter_id].balls += 1
        if (e.runs_batter === 4 || e.runs_batter === 6) acc[e.batter_id].boundaries += 1
        return acc
    }, {})

    const topBatter = Object.values(batterStats).sort((a: any, b: any) => b.runs - a.runs)[0] as any
    const aggressionRate = topBatter ? ((topBatter.boundaries / (topBatter.balls || 1)) * 100).toFixed(1) : "0.0"

    const bowlerStats = currentInningsEvents.reduce((acc: any, e: any) => {
        if (!acc[e.bowler_id]) acc[e.bowler_id] = { name: players.find((p: any) => p.id === e.bowler_id)?.name, wickets: 0, runs: 0, dots: 0 }
        if (e.wicket_type) acc[e.bowler_id].wickets += 1
        acc[e.bowler_id].runs += (e.runs_batter + e.runs_extras)
        if (e.runs_batter === 0 && !e.extra_type) acc[e.bowler_id].dots += 1
        return acc
    }, {})

    const topBowler = Object.values(bowlerStats).sort((a: any, b: any) => b.wickets - a.wickets || a.runs - b.runs)[0] as any
    const dotBallPercentage = topBowler ? ((topBowler.dots / (totalBalls || 1)) * 100).toFixed(1) : "0.0"

    // Calculate Reason
    let reason = "Overs completed"
    let status = isFirstInnings ? "Innings Break" : "Match Ended"
    let result = ""

    // Logic derived from rules
    const maxWickets = 10

    if (score.wickets >= maxWickets) {
        reason = "All out"
        result = !isFirstInnings ? (match.team_a.name + " wins") : ""
    } else if (!isFirstInnings && targetScore && score.runs >= targetScore) {
        reason = "Target achieved"
        result = (players.find((p: any) => p.team_id === activeState.batting_team_id)?.team_id === match.team_a.id ? match.team_a.name : match.team_b.name) + " wins"
    } else if (!isFirstInnings && targetScore) {
        if (score.runs === targetScore - 1 && (score.wickets >= maxWickets || activeState.current_over >= totalOvers)) {
            result = "Match is tied"
        } else {
            result = match.team_a.name + " wins"
        }
    }

    return (
        <Card className="border-none shadow-2xl rounded-[3rem] bg-slate-900 text-white overflow-hidden animate-in fade-in zoom-in duration-500">
            <CardHeader className="p-12 text-center border-b border-white/10 relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[100px] -mr-32 -mt-32" />
                <Trophy className="h-20 w-20 text-primary mx-auto mb-6 relative z-10" />
                <CardTitle className="text-5xl font-black italic uppercase tracking-tighter relative z-10">
                    {status}
                </CardTitle>
                <div className="space-y-4 mt-4 relative z-10">
                    <div className="flex flex-col items-center gap-2">
                        <p className="text-white/80 font-bold uppercase tracking-widest text-sm">
                            Reason: <span className="text-primary">{reason}</span>
                        </p>
                        {result && (
                            <p className="text-2xl font-black text-primary animate-bounce mt-2 uppercase tracking-tighter">
                                {result}
                            </p>
                        )}
                    </div>
                    {isFirstInnings ? (
                        <p className="text-white/60 font-bold uppercase tracking-widest text-xs">
                            Target: {score.runs + 1} Runs
                        </p>
                    ) : targetScore ? (
                        <p className="text-white/60 font-bold uppercase tracking-widest text-xs">
                            Goal was: {targetScore} Runs
                        </p>
                    ) : null}
                </div>
            </CardHeader>
            <CardContent className="p-12 space-y-12">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                    <StatCard label="Final score" value={`${score.runs}/${score.wickets}`} />
                    <StatCard label="Overs" value={`${activeState.current_over}.${activeState.current_ball}`} />
                    <StatCard label="Run Rate" value={runRate} />
                    <StatCard label="Extras" value={currentInningsEvents.reduce((sum: number, e: any) => sum + e.runs_extras, 0).toString()} />
                </div>

                <div className="grid md:grid-cols-2 gap-12">
                    {/* Batsman Analysis */}
                    <div className="p-10 bg-white/5 rounded-[2.5rem] border border-white/10 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <PieChart className="h-24 w-24 text-primary" />
                        </div>
                        <h4 className="text-xs font-black uppercase tracking-widest text-white/40 mb-6 flex items-center gap-2">
                            <Swords className="h-4 w-4 text-primary" /> Batter Analysis
                        </h4>
                        {topBatter ? (
                            <div className="relative z-10 space-y-4">
                                <div>
                                    <p className="text-[10px] font-black uppercase text-primary mb-1">Impact Player</p>
                                    <p className="text-3xl font-black italic tracking-tight">{topBatter.name}</p>
                                </div>
                                <div className="flex items-end gap-6">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black uppercase text-white/40">Aggression Rate</p>
                                        <p className="text-4xl font-black italic text-primary">{aggressionRate}%</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black uppercase text-white/40">Total Runs</p>
                                        <p className="text-4xl font-black italic text-white">{topBatter.runs}</p>
                                    </div>
                                </div>
                            </div>
                        ) : <p className="opacity-40 italic">Innings data pending...</p>}
                    </div>

                    {/* Bowler Analysis */}
                    <div className="p-10 bg-white/5 rounded-[2.5rem] border border-white/10 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <BarChart3 className="h-24 w-24 text-primary" />
                        </div>
                        <h4 className="text-xs font-black uppercase tracking-widest text-white/40 mb-6 flex items-center gap-2">
                            <Target className="h-4 w-4 text-primary" /> Bowling Intelligence
                        </h4>
                        {topBowler ? (
                            <div className="relative z-10 space-y-4">
                                <div>
                                    <p className="text-[10px] font-black uppercase text-primary mb-1">Key Disciplinarian</p>
                                    <p className="text-3xl font-black italic tracking-tight">{topBowler.name}</p>
                                </div>
                                <div className="flex items-end gap-6">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black uppercase text-white/40">Dot Control</p>
                                        <p className="text-4xl font-black italic text-primary">{dotBallPercentage}%</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black uppercase text-white/40">Wickets</p>
                                        <p className="text-4xl font-black italic text-white">{topBowler.wickets}</p>
                                    </div>
                                </div>
                            </div>
                        ) : <p className="opacity-40 italic">Bowling data pending...</p>}
                    </div>
                </div>
            </CardContent>
            <CardFooter className="p-12 bg-white/10 flex flex-col md:flex-row gap-6">
                <Button className="flex-grow h-20 rounded-3xl font-black text-2xl italic tracking-tight group" onClick={onNext}>
                    {isFirstInnings ? (
                        <>
                            Switch Sides & Start 2nd Innings <Zap className="ml-2 h-6 w-6 fill-current group-hover:animate-bounce" />
                        </>
                    ) : (
                        <>
                            View Full Scorecard <Trophy className="ml-2 h-6 w-6 group-hover:animate-bounce" />
                        </>
                    )}
                </Button>
                {!isFirstInnings && onDelete && (
                    <Button onClick={onDelete} variant="destructive" className="h-20 px-8 rounded-3xl font-black text-xl hover:bg-destructive/90">
                        Delete Record & Exit
                    </Button>
                )}
            </CardFooter>
        </Card>
    )
}

function StatCard({ label, value }: { label: string, value: string }) {
    return (
        <div className="text-center p-6 bg-white/5 rounded-[2rem] border border-white/10 hover:bg-primary/10 hover:border-primary/30 transition-all group">
            <p className="text-[9px] font-black uppercase tracking-widest text-primary/60 mb-2 group-hover:text-primary">{label}</p>
            <p className="text-4xl font-black italic text-white tracking-tighter">{value}</p>
        </div>
    )
}

function ActivePlayerTile({ label, name, icon: Icon, active, color, onClick, stats, subStats }: any) {
    return (
        <div
            onClick={onClick}
            className={cn(
                "p-4 rounded-[1.5rem] border-2 transition-all cursor-pointer group relative overflow-hidden",
                active ? "bg-primary/20 border-primary/40" : "bg-white/5 border-white/10 hover:border-white/20"
            )}
        >
            {active && <div className="absolute top-0 right-0 p-2"><div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_10px_theme(colors.primary.DEFAULT)]" /></div>}

            <div className="flex items-center gap-2 mb-2 opacity-60">
                <Icon className={cn("h-3 w-3", color || "text-primary")} />
                <p className="text-[10px] font-black uppercase tracking-widest">{label}</p>
            </div>

            <p className="text-base md:text-lg font-black truncate group-hover:text-primary transition-colors leading-tight mb-1 md:mb-2">{name}</p>

            {stats && (
                <div className="flex items-baseline gap-2">
                    <p className="text-xl md:text-2xl font-black italic tracking-tighter">{stats}</p>
                    {subStats && <p className="text-[10px] md:text-xs font-bold opacity-60 uppercase tracking-widest">{subStats}</p>}
                </div>
            )}
        </div>
    )
}
