"use client"

import { useEffect, useState, use } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, RefreshCw, Settings, MoreVertical, Trophy, Check, MousePointer2, X, Undo2, Users, Edit2, PlayCircle, Share2, Menu, AlertCircle, Info, Activity, Play, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"

// --- HELPERS ---
function SelectPlayerPremium({ label, options, onChange }: any) {
    return (
        <div className="space-y-3">
            <Label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.3em] ml-1">{label}</Label>
            <div className="relative group">
                <select
                    className="w-full h-16 rounded-2xl bg-white/5 px-6 font-bold text-white border-2 border-white/5 outline-none focus:border-primary/50 focus:bg-primary/5 transition-all appearance-none cursor-pointer"
                    onChange={(e) => onChange(e.target.value)}
                    defaultValue=""
                >
                    <option value="" disabled className="bg-slate-900">Choose Player...</option>
                    {options.map((p: any) => (
                        <option key={p.id} value={p.id} className="bg-slate-900 text-white py-4 font-bold">
                            {p.name}
                        </option>
                    ))}
                </select>
                <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 group-focus-within:text-primary transition-colors">
                    <UserPlus className="h-5 w-5" />
                </div>
            </div>
        </div>
    )
}

// --- TYPES ---
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
    toss_winner_id?: string
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

// --- MAIN COMPONENT ---
export default function AdminScoringPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()

    // State
    const [match, setMatch] = useState<Match | null>(null)
    const [players, setPlayers] = useState<Player[]>([])
    const [activeState, setActiveState] = useState<ActiveState | null>(null)
    const [events, setEvents] = useState<any[]>([])
    const [score, setScore] = useState({ runs: 0, wickets: 0, balls: 0 })
    const [targetScore, setTargetScore] = useState<number | null>(null)
    const [loading, setLoading] = useState(true)
    const [isProcessing, setIsProcessing] = useState(false)
    const [outPlayerIds, setOutPlayerIds] = useState<string[]>([])

    // Toss State
    const [tossWinner, setTossWinner] = useState<string | null>(null)
    const [battingFirst, setBattingFirst] = useState<string | null>(null)
    const [isStarting, setIsStarting] = useState(false)

    // Modals & UI State
    const [showWicketModal, setShowWicketModal] = useState(false)
    const [showExtrasModal, setShowExtrasModal] = useState<'WIDE' | 'NO_BALL' | 'BYE' | 'LEG_BYE' | null>(null)
    const [extrasRunsInput, setExtrasRunsInput] = useState(0)
    const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null)

    // Notification State
    const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null)

    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
        setNotification({ message, type })
        setTimeout(() => setNotification(null), 3000)
    }

    // Wicket Modal State
    const [wicketType, setWicketType] = useState('Caught')
    const [whoOut, setWhoOut] = useState<'striker' | 'non_striker'>('striker')

    // Derived Stats
    const [partnership, setPartnership] = useState({ runs: 0, balls: 0 })

    // Initial Fetch
    const fetchData = async () => {
        try {
            const { data: m } = await supabase.from('matches').select('*, team_a:teams!team_a_id(*), team_b:teams!team_b_id(*)').eq('id', id).single()
            if (m) {
                setMatch(m)
                if (m.toss_winner_id && !tossWinner) setTossWinner(m.toss_winner_id)
            }

            const { data: p } = await supabase.from('players').select('*').in('team_id', [m?.team_a_id, m?.team_b_id])
            if (p) setPlayers(p || [])

            const { data: s } = await supabase.from('match_active_state').select('*').eq('match_id', id).single()
            if (s) setActiveState(s)

            const { data: e } = await supabase.from('match_events').select('*').eq('match_id', id).order('created_at', { ascending: false })
            if (e) {
                setEvents(e)
                calculatePartnership(e, s)
            }

            const { data: wicketEvents } = await supabase.from('match_events').select('player_out_id').eq('match_id', id).not('player_out_id', 'is', null)
            setOutPlayerIds(wicketEvents?.map((w: any) => w.player_out_id as string) || [])

            if (s) {
                const { data: scoreData } = await supabase.from('match_scores').select('*').eq('match_id', id).eq('team_id', s.batting_team_id).single()
                if (scoreData) {
                    const balls = Math.floor(scoreData.overs_played) * 6 + Math.round((scoreData.overs_played % 1) * 10)
                    setScore({ runs: scoreData.runs_scored, wickets: scoreData.wickets_lost, balls })
                }

                if (s.innings_no === 2) {
                    const { data: firstInn } = await supabase.from('match_scores').select('runs_scored').eq('match_id', id).eq('is_first_innings', true).single()
                    if (firstInn) setTargetScore(firstInn.runs_scored + 1)
                }
            }
        } catch (e) { console.error(e) }
        setLoading(false)
    }

    useEffect(() => { fetchData() }, [id])

    // --- LOGIC: PARTNERSHIP ---
    const calculatePartnership = (eventsList: any[], currentState: ActiveState | null) => {
        if (!currentState) return;
        const reversedEvents = [...eventsList].reverse()
        const currentInningsEvents = reversedEvents.filter(e => e.innings_no === currentState.innings_no)

        let lastWicketIndex = -1
        for (let i = currentInningsEvents.length - 1; i >= 0; i--) {
            if (currentInningsEvents[i].wicket_type) {
                lastWicketIndex = i
                break
            }
        }

        const partnershipEvents = currentInningsEvents.slice(lastWicketIndex + 1)
        const runs = partnershipEvents.reduce((s, e) => s + (e.runs_batter || 0) + (e.runs_extras || 0), 0)
        const balls = partnershipEvents.filter(e => e.extra_type !== 'WIDE' && e.extra_type !== 'NO_BALL').length

        setPartnership({ runs, balls })
    }

    // --- ACTIONS: UNDO ---
    const handleUndo = async () => {
        if (!confirm("Are you sure you want to delete the last ball?")) return;
        setIsProcessing(true)
        try {
            const { data: lastEvent } = await supabase.from('match_events').select('*').eq('match_id', id).order('created_at', { ascending: false }).limit(1).single()
            if (!lastEvent) { showToast("No balls to undo", "error"); return; }

            // Delete the last event
            await supabase.from('match_events').delete().eq('id', lastEvent.id)

            // Fetch remaining events to recalculate statistics
            const { data: allEvents } = await supabase.from('match_events').select('*').eq('match_id', id).eq('innings_no', activeState!.innings_no)
            const realEvents = allEvents || []

            const newRuns = realEvents.reduce((sum: number, e: any) => sum + (e.runs_batter || 0) + (e.runs_extras || 0), 0)
            const newWickets = realEvents.filter((e: any) => e.wicket_type).length
            const legalBalls = realEvents.filter((e: any) => !['WIDE', 'NO_BALL', 'Wide', 'No Ball'].includes(e.extra_type)).length
            const newOvers = parseFloat(Math.floor(legalBalls / 6) + "." + (legalBalls % 6))

            // Update Match Scores
            await supabase.from('match_scores').update({
                runs_scored: newRuns,
                wickets_lost: newWickets,
                overs_played: newOvers
            }).eq('match_id', id).eq('team_id', activeState!.batting_team_id)

            // Restore Active State (Critical: Restore who was facing/bowling the undone ball)
            // The deleted event contains the snapshot of who was active at that moment
            await supabase.from('match_active_state').update({
                striker_id: lastEvent.batter_id,
                non_striker_id: lastEvent.non_striker_id,
                bowler_id: lastEvent.bowler_id,
                current_over: Math.floor(legalBalls / 6),
                current_ball: legalBalls % 6
            }).eq('match_id', id)

            // Local State Update for Instant Feedback
            setScore({ runs: newRuns, wickets: newWickets, balls: legalBalls })
            setEvents(realEvents.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()))
            setActiveState(prev => prev ? ({
                ...prev,
                striker_id: lastEvent.batter_id,
                non_striker_id: lastEvent.non_striker_id,
                bowler_id: lastEvent.bowler_id,
                current_over: Math.floor(legalBalls / 6),
                current_ball: legalBalls % 6
            }) : null)

            await fetchData()
            showToast("Undo successful", "success")

        } catch (e) { console.error(e) }
        finally { setIsProcessing(false) }
    }

    const handleUpdatePlayerName = async (playerId: string, newName: string) => {
        if (!newName.trim()) return
        await supabase.from('players').update({ name: newName }).eq('id', playerId)
        setPlayers(players.map(p => p.id === playerId ? { ...p, name: newName } : p))
        setEditingPlayerId(null)
    }

    // --- ACTIONS: RETIRED ---
    const handleRetired = async () => {
        if (!activeState || isProcessing) return
        if (!confirm("Confirm RETIRED? Batter will leave without a wicket.")) return
        setIsProcessing(true)

        try {
            // Log event for timeline (optional but good for history) - Type 'RETIRED'
            // For now, per rules "No ball counted", we just swap the player.
            // We can set striker to null to trigger selection.

            await supabase.from('match_active_state').update({
                striker_id: null
            }).eq('match_id', id)

            await fetchData()
            showToast("Batter Retired. Select new batter.", "info")

        } catch (err: any) { showToast(err.message, "error") }
        finally { setIsProcessing(false) }
    }

    // --- CORE LOGIC: COMMIT BALL ---
    const commitBall = async (runs: number, ballType: string, isWicket: boolean, wicketDetails?: { playerOut: string, type: string }) => {
        if (isProcessing || !activeState || !match) return
        setIsProcessing(true)

        try {
            const totalOversLimit = parseInt(match.overs_type.match(/(\d+)/)?.[0] || "20")
            const maxBalls = totalOversLimit * 6

            let currentBalls = score.balls
            let currentRuns = score.runs
            let currentWickets = score.wickets

            // Calculate Checks LOCALLY first
            let runsToAdd = runs
            let extrasToAdd = 0

            if (ballType === "WIDE") {
                runsToAdd = 0;
                extrasToAdd = 1 + runs;
            } else if (ballType === "NO_BALL") {
                runsToAdd = runs;
                extrasToAdd = 1;
            } else if (ballType === "BYE" || ballType === "LEG_BYE") {
                // Rules: Runs add to team and bowling (conceded), but NOT to batter. 
                // Count as extras.
                runsToAdd = 0;
                extrasToAdd = runs;
            } else {
                runsToAdd = runs;
            }

            const totalOnBall = runsToAdd + extrasToAdd
            const isBallLegal = ballType === "RUN" || ballType === "BYE" || ballType === "LEG_BYE" || (isWicket && ballType !== "WIDE" && ballType !== "NO_BALL")

            const newBallCount = isBallLegal ? currentBalls + 1 : currentBalls
            const newRunCount = currentRuns + totalOnBall
            const newWicketCount = isWicket ? currentWickets + 1 : currentWickets

            // --- END CONDITIONS CHECK (CRITICAL: Do this BEFORE DB writes if possible to fast-track, but for safety we write first then check) ---
            // Actually, we should check conditions based on FUTURE state
            let isInningsEnd = false
            let isMatchEnd = false
            let matchWinnerId = null

            const battingTeamPlayers = players.filter(p => p.team_id === activeState.batting_team_id)
            const maxWicketLimit = Math.max(1, battingTeamPlayers.length > 0 ? battingTeamPlayers.length - 1 : 10)

            if (newWicketCount >= maxWicketLimit && newWicketCount > currentWickets) isInningsEnd = true
            if (newBallCount >= maxBalls && newBallCount > currentBalls) isInningsEnd = true

            // Target Check (2nd Innings)
            if (activeState.innings_no === 2 && targetScore && newRunCount >= targetScore) {
                isMatchEnd = true
                matchWinnerId = activeState.batting_team_id
            } else if (activeState.innings_no === 2 && isInningsEnd) {
                // Natural End of 2nd Innings
                isMatchEnd = true
                if (newRunCount > (targetScore || 0) - 1) matchWinnerId = activeState.batting_team_id
                else if (newRunCount < (targetScore || 0) - 1) matchWinnerId = activeState.batting_team_id === match.team_a_id ? match.team_b_id : match.team_a_id
                else matchWinnerId = null // Tie
            }

            // --- DB WRITES ---

            // 1. Log Event
            const playerOutId = isWicket ? wicketDetails?.playerOut : null
            const wicketTypeVal = isWicket ? wicketDetails?.type : null

            // Map internal types to DB Check Constraints
            // A ball is counted for a bowler if it's NOT a Wide and NOT a No Ball.
            const isLegalBowlerBall = !['WIDE', 'NO_BALL'].includes(ballType)
            let dbExtraType = null
            if (ballType === 'WIDE') dbExtraType = 'Wide'
            else if (ballType === 'NO_BALL') dbExtraType = 'No Ball'
            else if (ballType === 'BYE') dbExtraType = 'Bye'
            else if (ballType === 'LEG_BYE') dbExtraType = 'Leg Bye'

            const newEvent = {
                match_id: id,
                innings_no: activeState.innings_no,
                over_no: Math.floor(currentBalls / 6),
                ball_no: (currentBalls % 6) + 1,
                batter_id: activeState.striker_id,
                bowler_id: activeState.bowler_id,
                non_striker_id: activeState.non_striker_id,
                runs_batter: runsToAdd, // Use calculated runsToAdd which now handles BYE/LB/NB correctly per user request
                runs_extras: extrasToAdd,
                extra_type: dbExtraType,
                wicket_type: isWicket ? wicketTypeVal : null,
                player_out_id: playerOutId
            }
            const { error: eventError } = await supabase.from('match_events').insert([newEvent])
            if (eventError) throw eventError

            // OPTIMISTIC UPDATE (Instant UI)
            setScore({ runs: newRunCount, wickets: newWicketCount, balls: newBallCount })
            const optimisticEvent = { ...newEvent, id: 'temp-' + Date.now(), created_at: new Date().toISOString() }
            setEvents(prev => [optimisticEvent, ...prev])

            // 2. Update Scores
            await supabase.from('match_scores').upsert({
                match_id: id,
                team_id: activeState.batting_team_id,
                runs_scored: newRunCount,
                wickets_lost: newWicketCount,
                overs_played: parseFloat(Math.floor(newBallCount / 6) + "." + (newBallCount % 6)),
                is_first_innings: activeState.innings_no === 1
            }, { onConflict: 'match_id,team_id' })

            // 3. Handle End Match / Innings
            if (isMatchEnd) {
                await supabase.from('matches').update({ status: 'Completed', winner_id: matchWinnerId }).eq('id', id)
                showToast("Match Completed! Redirecting...", "success")
                await new Promise(resolve => setTimeout(resolve, 2000))
                router.push(`/matches/${id}`)
                return
            }

            if (isInningsEnd && activeState.innings_no === 1) {
                const nextBattingTeam = activeState.batting_team_id === match.team_a_id ? match.team_b_id : match.team_a_id
                await supabase.from('match_active_state').update({
                    innings_no: 2,
                    batting_team_id: nextBattingTeam,
                    striker_id: null, non_striker_id: null, bowler_id: null,
                    current_over: 0, current_ball: 0
                }).eq('match_id', id)
                showToast("Innings Break! Start next innings.", "info")
                await new Promise(resolve => setTimeout(resolve, 2000))
                window.location.reload()
                return
            }

            // 4. Update Active State (Rotation)
            let nextStriker = activeState.striker_id
            let nextNonStriker = activeState.non_striker_id

            // Standard Rotation
            if ((ballType === "RUN" || ballType === "NO_BALL" || ballType === "BYE" || ballType === "LEG_BYE") && runs % 2 !== 0) {
                [nextStriker, nextNonStriker] = [nextNonStriker, nextStriker]
            }

            // Wicket Logic
            if (isWicket) {
                if (playerOutId === nextStriker) nextStriker = null
                if (playerOutId === nextNonStriker) nextNonStriker = null
            }

            // Over End Check
            let nextBowler = activeState.bowler_id; // Default: Keep current bowler
            if (isBallLegal && newBallCount % 6 === 0 && newBallCount > 0) {
                [nextStriker, nextNonStriker] = [nextNonStriker, nextStriker]
                nextBowler = null // Force new selection
            }

            const updatePayload: any = {
                striker_id: nextStriker,
                non_striker_id: nextNonStriker,
                current_ball: newBallCount % 6,
                current_over: Math.floor(newBallCount / 6),
                bowler_id: nextBowler
            }

            await supabase.from('match_active_state').update(updatePayload).eq('match_id', id)

            await fetchData()

        } catch (err: any) { showToast("Error logging ball: " + (err.message || err), "error"); console.error(err); }
        finally {
            setIsProcessing(false);
            setShowExtrasModal(null);
            setShowWicketModal(false);
            setExtrasRunsInput(0);
        }
    }

    // UI Helpers
    const handleTossClick = (teamId: string) => { setTossWinner(teamId); setBattingFirst(null); }
    const handleDecisionClick = (decision: 'BAT' | 'BOWL') => {
        if (!tossWinner) return
        if (decision === 'BAT') setBattingFirst(tossWinner)
        else setBattingFirst(tossWinner === match?.team_a_id ? (match?.team_b_id || null) : (match?.team_a_id || null))
    }
    const handleTossComplete = async () => {
        if (!tossWinner || !battingFirst) return;
        setIsStarting(true)
        try {
            await supabase.from('matches').update({ toss_winner_id: tossWinner, status: 'Live' }).eq('id', id)
            const newState = { match_id: id, batting_team_id: battingFirst, striker_id: null, non_striker_id: null, bowler_id: null, innings_no: 1, current_over: 0, current_ball: 0 }
            await supabase.from('match_active_state').upsert(newState)
            setActiveState(newState)
            await fetchData()
        } catch (err: any) { showToast(err.message, "error") }
        finally { setIsStarting(false) }
    }
    const handleStartInnings = async () => {
        if (!activeState?.striker_id || !activeState?.non_striker_id || !activeState?.bowler_id) return showToast("Select all players", "error")
        setIsStarting(true)
        try {
            await supabase.from('match_active_state').upsert({ match_id: id, ...activeState })
            await fetchData()
        } catch (err: any) { showToast(err.message, "error") }
        finally { setIsStarting(false) }
    }

    if (loading || !match) return <div className="flex h-screen items-center justify-center bg-slate-950 text-emerald-400 animate-pulse font-bold">LOADING...</div>

    // VIEW 1: TOSS SELECTION (PREMIUM ARENA THEME)
    if (!activeState) {
        return (
            <div className="min-h-screen bg-slate-950 p-6 flex items-center justify-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-[120px]" />
                <Card className="w-full max-w-lg glass-card-dark border-white/5 shadow-2xl rounded-[3rem] overflow-hidden z-10">
                    <CardHeader className="bg-gradient-to-br from-slate-900 to-slate-800 border-b border-white/5 p-10 text-center">
                        <div className="h-20 w-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-primary/20">
                            <Trophy className="h-10 w-10 text-primary" />
                        </div>
                        <CardTitle className="text-4xl font-black italic uppercase tracking-tighter text-white">Match Initiation</CardTitle>
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-2">The Battle Begins Here</p>
                    </CardHeader>
                    <CardContent className="p-10 space-y-10">
                        <div className="space-y-4">
                            <Label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.3em] ml-1">Toss Victor</Label>
                            <div className="grid grid-cols-1 gap-3">
                                {[match.team_a, match.team_b].map(t => (
                                    <button
                                        key={t.id}
                                        className={cn(
                                            "h-20 px-8 rounded-2xl text-lg font-black italic uppercase tracking-tighter transition-all flex items-center justify-between border-2",
                                            tossWinner === t.id
                                                ? "bg-primary border-white text-white shadow-2xl shadow-primary/30 scale-105"
                                                : "bg-white/5 border-white/5 text-slate-400 hover:bg-white/10"
                                        )}
                                        onClick={() => handleTossClick(t.id)}
                                    >
                                        <span>{t.name}</span>
                                        {tossWinner === t.id && <Check className="h-6 w-6" />}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <AnimatePresence>
                            {tossWinner && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="space-y-4"
                                >
                                    <Label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.3em] ml-1">Declaration</Label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <button
                                            className={cn(
                                                "h-16 rounded-2xl font-black uppercase tracking-widest transition-all border-2",
                                                battingFirst === tossWinner
                                                    ? "bg-white text-slate-950 border-white shadow-xl"
                                                    : "bg-white/5 border-white/5 text-slate-500 hover:text-white"
                                            )}
                                            onClick={() => handleDecisionClick('BAT')}
                                        >
                                            BAT FIRST
                                        </button>
                                        <button
                                            className={cn(
                                                "h-16 rounded-2xl font-black uppercase tracking-widest transition-all border-2",
                                                battingFirst !== tossWinner && battingFirst !== null
                                                    ? "bg-white text-slate-950 border-white shadow-xl"
                                                    : "bg-white/5 border-white/5 text-slate-500 hover:text-white"
                                            )}
                                            onClick={() => handleDecisionClick('BOWL')}
                                        >
                                            BOWL FIRST
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </CardContent>
                    <CardFooter className="p-10 pt-0">
                        <Button
                            className="w-full h-20 bg-primary text-white text-xl font-black italic uppercase tracking-tighter rounded-[2rem] shadow-2xl shadow-primary/20 hover:scale-[1.02] transition-all disabled:opacity-50"
                            disabled={!tossWinner || !battingFirst || isStarting}
                            onClick={handleTossComplete}
                        >
                            {isStarting ? <RefreshCw className="animate-spin h-6 w-6" /> : "DEPLOY ARENA"}
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        )
    }

    // VIEW 2: PLAYER SELECTION (HIGH-PERFORMANCE DARK)
    if (!activeState.striker_id || !activeState.non_striker_id || !activeState.bowler_id) {
        return (
            <div className="min-h-screen bg-slate-950 p-6 flex items-center justify-center relative">
                <div className="absolute top-0 left-0 w-96 h-96 bg-primary/10 rounded-full blur-[120px]" />
                <Card className="w-full max-w-lg glass-card-dark border-white/5 shadow-2xl rounded-[3rem] overflow-hidden">
                    <CardHeader className="bg-gradient-to-br from-slate-900 to-slate-800 border-b border-white/5 p-10">
                        <div className="flex items-center gap-4 mb-2">
                            <div className="h-10 w-10 bg-primary/20 rounded-xl flex items-center justify-center border border-primary/30">
                                <Users className="h-5 w-5 text-primary" />
                            </div>
                            <CardTitle className="text-3xl font-black italic uppercase tracking-tighter text-white">Draft Squad</CardTitle>
                        </div>
                        <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em]">Configure Opening Dynamics</p>
                    </CardHeader>
                    <CardContent className="p-10 space-y-8">
                        <div className="space-y-6">
                            {!activeState.striker_id && (
                                <SelectPlayerPremium
                                    label="Prime Striker"
                                    options={players.filter(p => p.team_id === activeState.batting_team_id && p.id !== activeState.non_striker_id && !outPlayerIds.includes(p.id))}
                                    onChange={(v: string) => setActiveState({ ...activeState, striker_id: v })}
                                />
                            )}
                            {!activeState.non_striker_id && (
                                <SelectPlayerPremium
                                    label="Non-Striker Support"
                                    options={players.filter(p => p.team_id === activeState.batting_team_id && p.id !== activeState.striker_id && !outPlayerIds.includes(p.id))}
                                    onChange={(v: string) => setActiveState({ ...activeState, non_striker_id: v })}
                                />
                            )}
                            {!activeState.bowler_id && (
                                <SelectPlayerPremium
                                    label="Executioner (Bowler)"
                                    options={players.filter(p => p.team_id !== activeState.batting_team_id)}
                                    onChange={(v: string) => setActiveState({ ...activeState, bowler_id: v })}
                                />
                            )}
                        </div>
                    </CardContent>
                    <CardFooter className="p-10 pt-0">
                        <Button
                            className="w-full h-20 bg-primary text-white text-xl font-black italic uppercase tracking-tighter rounded-[2rem] shadow-2xl shadow-primary/20 hover:scale-[1.02] transition-all"
                            onClick={handleStartInnings}
                            disabled={isStarting}
                        >
                            {isStarting ? <RefreshCw className="animate-spin h-6 w-6" /> : "IGNITE MATCH"}
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        )
    }

    // VIEW 3: MAIN SCORING UI (DARK THEME - FINAL)
    const currentOverEvents = events.filter(e => e.innings_no === activeState.innings_no && e.over_no === Math.floor(score.balls / 6))
    const strikerStats = getBatterStats(activeState.striker_id, events, activeState.innings_no)
    const nonStrikerStats = getBatterStats(activeState.non_striker_id, events, activeState.innings_no)
    const bowlerStats = getBowlerStats(activeState.bowler_id, events, activeState.innings_no)
    const battingTeamName = activeState.batting_team_id === match.team_a_id ? match.team_a.name : match.team_b.name

    // Modals (Dark)
    const WicketModal = () => (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in">
            <Card className="w-full max-w-sm shadow-2xl border-slate-700 bg-slate-900">
                <CardHeader className="bg-rose-600/20 border-b border-rose-500/30 text-rose-500 rounded-t-xl">
                    <CardTitle className="uppercase flex justify-between items-center text-lg">
                        Wicket Fallen <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500 hover:bg-rose-500/20" onClick={() => setShowWicketModal(false)}><X className="h-5 w-5" /></Button>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-5">
                    <div>
                        <Label className="text-xs uppercase text-slate-400 font-bold tracking-wider">Who is Out?</Label>
                        <div className="grid grid-cols-2 gap-3 mt-3">
                            <Button variant="outline" className={cn("h-12 font-bold bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white", whoOut === 'striker' && "bg-rose-500/10 border-rose-500 text-rose-400")} onClick={() => setWhoOut('striker')}>Striker</Button>
                            <Button variant="outline" className={cn("h-12 font-bold bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white", whoOut === 'non_striker' && "bg-rose-500/10 border-rose-500 text-rose-400")} onClick={() => setWhoOut('non_striker')}>Non-Striker</Button>
                        </div>
                    </div>
                    <div>
                        <Label className="text-xs uppercase text-slate-400 font-bold tracking-wider">How Out?</Label>
                        <select className="w-full h-12 mt-2 border border-slate-700 bg-slate-800 text-white rounded-xl px-3 font-bold outline-none focus:ring-2 focus:ring-rose-500" value={wicketType} onChange={(e) => setWicketType(e.target.value)}>
                            {['Caught', 'Bowled', 'LBW', 'Run Out', 'Stumped', 'Hit Wicket'].map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button className="w-full bg-rose-600 hover:bg-rose-500 h-12 font-bold rounded-xl text-white shadow-lg shadow-rose-500/20" onClick={() => {
                        const pid = whoOut === 'striker' ? activeState.striker_id! : activeState.non_striker_id!
                        commitBall(0, 'RUN', true, { playerOut: pid, type: wicketType })
                    }}>Confirm Wicket</Button>
                </CardFooter>
            </Card>
        </div>
    )

    const ExtrasModal = () => (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in">
            <Card className="w-full max-w-sm shadow-2xl border-slate-700 bg-slate-900">
                <CardHeader className="bg-slate-800 border-b border-slate-700 text-white rounded-t-xl">
                    <CardTitle className="uppercase flex justify-between items-center text-lg">
                        {showExtrasModal?.replace('_', ' ')} <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white" onClick={() => setShowExtrasModal(null)}><X className="h-5 w-5" /></Button>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                    <div className="text-center space-y-4">
                        <Label className="text-sm uppercase text-slate-400 font-bold tracking-wider">Additional Runs Scored</Label>
                        <div className="flex gap-4 items-center justify-center">
                            <Button variant="outline" className="h-14 w-14 text-2xl font-black bg-slate-800 border-slate-700 text-white hover:bg-slate-700 rounded-full" onClick={() => setExtrasRunsInput(Math.max(0, extrasRunsInput - 1))}>-</Button>
                            <div className="w-24 text-center text-5xl font-black text-white">{extrasRunsInput}</div>
                            <Button variant="outline" className="h-14 w-14 text-2xl font-black bg-slate-800 border-slate-700 text-white hover:bg-slate-700 rounded-full" onClick={() => setExtrasRunsInput(extrasRunsInput + 1)}>+</Button>
                        </div>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button className="w-full bg-emerald-600 hover:bg-emerald-500 h-12 font-bold rounded-xl text-white shadow-lg shadow-emerald-500/20" onClick={() => {
                        commitBall(extrasRunsInput, showExtrasModal!, false)
                    }}>Confirm {showExtrasModal}</Button>
                </CardFooter>
            </Card>
        </div>
    )

    const EditPlayerModal = () => {
        const player = players.find(p => p.id === editingPlayerId)
        const [name, setName] = useState(player?.name || "")
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in">
                <Card className="w-full max-w-sm shadow-2xl border-slate-700 bg-slate-900 text-white">
                    <CardHeader className="bg-blue-600/20 border-b border-blue-500/30 text-blue-400 rounded-t-xl">
                        <CardTitle className="uppercase flex justify-between items-center text-lg">
                            Edit Player <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-400 hover:bg-blue-500/20" onClick={() => setEditingPlayerId(null)}><X className="h-5 w-5" /></Button>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <Label className="mb-2 block text-slate-400 text-xs font-bold uppercase">Player Name</Label>
                        <Input value={name} onChange={e => setName(e.target.value)} className="font-bold text-lg bg-slate-800 border-slate-700 text-white h-12" />
                    </CardContent>
                    <CardFooter>
                        <Button className="w-full bg-blue-600 hover:bg-blue-500 h-12 font-bold rounded-xl text-white shadow-lg shadow-blue-500/20" onClick={() => handleUpdatePlayerName(editingPlayerId!, name)}>Save Name</Button>
                    </CardFooter>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-950 pb-[420px] md:pb-0 relative text-slate-100 font-sans selection:bg-primary/30 antialiased overflow-x-hidden">
            {showWicketModal && <WicketModal />}
            {showExtrasModal && <ExtrasModal />}
            {editingPlayerId && <EditPlayerModal />}

            {/* Premium Dynamic Header */}
            <div className="bg-slate-900/60 backdrop-blur-2xl border-b border-white/5 sticky top-0 z-40 px-4 pt-4 pb-6 shadow-2xl">
                <div className="max-w-3xl mx-auto">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-4">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 rounded-xl bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                                onClick={() => router.back()}
                            >
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                            <div>
                                <div className="flex items-center gap-2 mb-0.5">
                                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                    <h1 className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em]">{match.overs_type} Professional Series</h1>
                                </div>
                                <div className="font-black text-xl italic uppercase tracking-tighter text-white">
                                    {match.team_a.name} <span className="text-slate-600 text-sm mx-1 not-italic font-medium">VS</span> {match.team_b.name}
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl bg-white/5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all" onClick={handleUndo} title="Undo Last Ball">
                                <Undo2 className="h-5 w-5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl bg-white/5 text-slate-400 hover:text-primary hover:bg-primary/10 transition-all" onClick={() => window.location.reload()}>
                                <RefreshCw className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-8 items-end">
                        <div className="space-y-1">
                            <div className="flex items-baseline gap-2">
                                <div className="text-7xl md:text-8xl font-black italic tracking-tighter text-white leading-none">
                                    {score.runs}
                                    <span className="text-3xl text-slate-700 mx-1 align-top relative top-2">/</span>
                                    <span className="text-5xl text-primary align-top relative top-1">{score.wickets}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="px-3 py-1 bg-slate-800 rounded-lg border border-white/5">
                                    <span className="text-xs font-black uppercase text-slate-500 tracking-widest mr-2">Overs</span>
                                    <span className="text-sm font-mono font-black text-white">{Math.floor(score.balls / 6)}.{score.balls % 6}</span>
                                </div>
                                <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                                    TRR: <span className="text-slate-300">{(score.runs / Math.max(0.1, score.balls / 6)).toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col items-end gap-3">
                            <AnimatePresence>
                                {targetScore && (
                                    <motion.div
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="bg-primary/10 border border-primary/20 px-4 py-2 rounded-2xl text-right"
                                    >
                                        <div className="text-[9px] font-black text-primary uppercase tracking-widest mb-0.5">TARGET DEFENSE</div>
                                        <div className="text-lg font-black italic text-white leading-none">
                                            {targetScore - score.runs} <span className="text-[10px] not-italic text-primary font-bold">OFF</span> {Math.max(0, (parseInt(match.overs_type.replace(/\D/g, '')) * 6) - score.balls)}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full">
                                <Activity className="h-3 w-3 text-emerald-500 animate-pulse" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">{battingTeamName} LIVE</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Scrollable Action Area */}
            <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

                {/* Match Momentum (Simple Indicator) */}
                <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden flex">
                    <div className="h-full bg-primary shadow-[0_0_10px_theme(colors.primary)]" style={{ width: `${Math.min(100, (score.runs / (targetScore || 100)) * 100)}%` }} />
                </div>

                {/* Performance HUD */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Batting HUD */}
                    <Card className="glass-card-dark border-white/5 overflow-hidden shadow-2xl">
                        <div className="bg-white/5 px-4 py-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex justify-between">
                            <span>Striker Command</span>
                            <span>R(B) 4s 6s</span>
                        </div>
                        <div className="divide-y divide-white/5">
                            <PlayerHUDRow
                                name={players.find(p => p.id === activeState.striker_id)?.name}
                                stats={strikerStats}
                                isStriker={true}
                                onEdit={() => setEditingPlayerId(activeState.striker_id)}
                            />
                            <PlayerHUDRow
                                name={players.find(p => p.id === activeState.non_striker_id)?.name}
                                stats={nonStrikerStats}
                                isStriker={false}
                                onEdit={() => setEditingPlayerId(activeState.non_striker_id)}
                            />
                        </div>
                    </Card>

                    {/* Bowling HUD */}
                    <Card className="glass-card-dark border-white/5 overflow-hidden shadow-2xl">
                        <div className="bg-white/5 px-4 py-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex justify-between">
                            <span>Bowling Unit</span>
                            <span>O M R W</span>
                        </div>
                        <BowlerHUDRow
                            name={players.find(p => p.id === activeState.bowler_id)?.name}
                            stats={bowlerStats}
                            onEdit={() => setEditingPlayerId(activeState.bowler_id)}
                        />
                    </Card>
                </div>

                {/* Over Timeline Ticker */}
                <div className="flex items-center gap-3 overflow-x-auto py-2 no-scrollbar bg-white/2 p-4 rounded-[2rem] border border-white/5">
                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest shrink-0 border-r border-white/5 pr-4">THIS OVER</span>
                    <div className="flex gap-3">
                        {currentOverEvents.map((e, i) => (
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                key={i}
                                className={cn(
                                    "h-10 w-10 rounded-2xl flex items-center justify-center text-sm font-black shrink-0 border-2 transition-all shadow-xl",
                                    e.wicket_type ? "bg-rose-600 border-rose-400 text-white shadow-rose-900/40" :
                                        (e.runs_batter === 4 || e.runs_batter === 6) ? "bg-primary border-primary-foreground/30 text-white shadow-primary/30" :
                                            "bg-slate-800 border-slate-700 text-slate-200"
                                )}
                            >
                                {getBallLabel(e)}
                            </motion.div>
                        ))}
                        {currentOverEvents.length === 0 && <span className="text-slate-700 italic text-xs font-bold font-mono">WAITING FOR FIRST BALL...</span>}
                    </div>
                </div>

                {/* Partnership Widget */}
                {partnership.balls > 0 && (
                    <div className="flex items-center justify-center gap-6 py-4 bg-gradient-to-r from-transparent via-white/5 to-transparent border-y border-white/5">
                        <div className="text-center">
                            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">PARTNERSHIP</div>
                            <div className="text-2xl font-black italic text-white leading-none">
                                {partnership.runs} <span className="text-xs not-italic text-slate-500">OFF</span> {partnership.balls}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* HIGH-PERFORMANCE KEYPAD AREA */}
            <div className="fixed bottom-0 left-0 right-0 z-50 transition-transform duration-300">
                <div className="max-w-3xl mx-auto backdrop-blur-3xl bg-slate-950/90 border-t-2 border-primary/20 p-4 pb-12 shadow-[0_-30px_60px_-15px_rgba(0,0,0,0.8)] rounded-t-[3.5rem]">

                    {/* Specialized Extras/Wicket Row */}
                    <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar pb-2">
                        <UtilityButton label="WD" icon={Play} onClick={() => setShowExtrasModal('WIDE')} color="bg-slate-800" />
                        <UtilityButton label="NB" icon={Play} onClick={() => setShowExtrasModal('NO_BALL')} color="bg-slate-800" />
                        <UtilityButton label="BYE" icon={Play} onClick={() => setShowExtrasModal('BYE')} color="bg-slate-800" />
                        <UtilityButton label="L-BYE" icon={Play} onClick={() => setShowExtrasModal('LEG_BYE')} color="bg-slate-800" />
                        <div className="flex-1" />
                        <UtilityButton label="RETIRED" icon={Play} onClick={handleRetired} color="bg-orange-600/20 text-orange-400 border-orange-500/30" />
                        <UtilityButton label="WICKET" icon={Play} onClick={() => setShowWicketModal(true)} color="bg-rose-600 text-white shadow-[0_10px_20px_-5px_rgba(225,29,72,0.4)]" />
                    </div>

                    {/* Pro Input Grid */}
                    <div className="grid grid-cols-4 gap-3">
                        {[0, 1, 2, 3].map(v => (
                            <ScoreKey key={v} val={v} onClick={() => commitBall(v, 'RUN', false)} />
                        ))}
                        <ScoreKey val={4} isSpecial onClick={() => commitBall(4, 'RUN', false)} />
                        <ScoreKey val={6} isSpecial onClick={() => commitBall(6, 'RUN', false)} />

                        <Button
                            className="h-20 rounded-[2rem] bg-slate-900 border-2 border-white/5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all active:scale-95"
                            onClick={handleUndo}
                        >
                            <Undo2 className="h-6 w-6" />
                        </Button>
                        <Button
                            className="h-20 rounded-[2rem] bg-indigo-600 text-white shadow-2xl shadow-indigo-500/20 hover:bg-indigo-500 transition-all active:scale-95"
                            onClick={() => window.location.reload()}
                        >
                            <RefreshCw className="h-6 w-6" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Notification Toast Replacement */}
            <AnimatePresence>
                {notification && (
                    <motion.div
                        initial={{ opacity: 0, y: -50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className={cn(
                            "fixed top-8 left-1/2 -translate-x-1/2 z-[100] px-8 py-4 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-2 backdrop-blur-xl flex items-center gap-4",
                            notification.type === 'error' ? "bg-rose-600/90 border-rose-400 text-white" :
                                notification.type === 'success' ? "bg-emerald-600/90 border-emerald-400 text-white" :
                                    "bg-primary/90 border-primary-foreground/30 text-white"
                        )}
                    >
                        {notification.type === 'error' ? <AlertCircle className="h-5 w-5" /> : <Check className="h-5 w-5" />}
                        <span className="text-sm font-black uppercase tracking-wider">{notification.message}</span>
                    </motion.div>
                )}
            </AnimatePresence>
        </div >
    )
}

function PlayerHUDRow({ name, stats, isStriker, onEdit }: any) {
    if (!name) return <div className="p-4 text-center text-[10px] text-slate-700 italic font-black uppercase tracking-widest">Awaiting Selection...</div>
    return (
        <div className={cn("flex justify-between items-center p-4 relative group transition-all", isStriker && "bg-primary/5")}>
            <div className="flex items-center gap-3" onClick={onEdit}>
                <div className={cn("h-2.5 w-2.5 rounded-full transition-all", isStriker ? "bg-primary shadow-[0_0_15px_theme(colors.primary)] scale-110" : "bg-slate-800")} />
                <div className={cn("font-black text-sm uppercase italic tracking-tighter cursor-pointer group-hover:text-primary transition-colors", isStriker ? "text-white" : "text-slate-400")}>
                    {name}
                </div>
                <Edit2 className="h-3 w-3 text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="flex gap-5 items-center">
                <div className="flex gap-4 font-mono">
                    <span className="w-8 text-center font-black text-white text-lg">{stats?.main || 0}</span>
                    <span className="w-8 text-center text-slate-500 font-bold">({stats?.balls || 0})</span>
                </div>
                <div className="h-8 w-px bg-white/5 mx-1" />
                <div className="flex gap-4 text-[10px] font-black text-slate-600">
                    <span className="w-4 text-center">{stats?.fours || 0}</span>
                    <span className="w-4 text-center">{stats?.sixes || 0}</span>
                </div>
            </div>
        </div>
    )
}

function BowlerHUDRow({ name, stats, onEdit }: any) {
    if (!name) return <div className="p-8 text-center text-[10px] text-slate-700 italic font-black uppercase tracking-widest">Select Bowling Unit...</div>
    return (
        <div className="p-4 group hover:bg-white/2 transition-all">
            <div className="flex justify-between items-center mb-4">
                <div className="font-black text-lg uppercase italic tracking-tighter text-white cursor-pointer flex items-center gap-2 hover:text-primary transition-colors" onClick={onEdit}>
                    {name}
                    <Edit2 className="h-4 w-4 text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="bg-primary/10 border border-primary/20 px-3 py-1 rounded-lg text-primary text-[10px] font-black uppercase tracking-widest">
                    {(stats?.runs / Math.max(0.1, stats?.balls / 6)).toFixed(1)} ECON
                </div>
            </div>
            <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                    <div className="text-[10px] font-black text-slate-600 mb-1 uppercase tracking-widest">O</div>
                    <div className="text-xl font-black text-slate-300 italic">{stats?.overs || "0.0"}</div>
                </div>
                <div>
                    <div className="text-[10px] font-black text-slate-600 mb-1 uppercase tracking-widest">M</div>
                    <div className="text-xl font-black text-slate-800 italic">0</div>
                </div>
                <div>
                    <div className="text-[10px] font-black text-slate-600 mb-1 uppercase tracking-widest">R</div>
                    <div className="text-xl font-black text-white italic">{stats?.runs || 0}</div>
                </div>
                <div>
                    <div className="text-[10px] font-black text-slate-600 mb-1 uppercase tracking-widest">W</div>
                    <div className="text-3xl font-black text-primary italic leading-none">{stats?.wickets || 0}</div>
                </div>
            </div>
        </div>
    )
}

function UtilityButton({ label, onClick, color }: any) {
    return (
        <button
            className={cn("px-5 h-12 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] border border-white/5 transition-all active:scale-90 hover:brightness-110", color)}
            onClick={onClick}
        >
            {label}
        </button>
    )
}

function ScoreKey({ val, isSpecial, onClick }: any) {
    return (
        <button
            className={cn(
                "h-24 rounded-[2.5rem] flex items-center justify-center text-4xl font-black italic tracking-tighter transition-all active:scale-90 shadow-2xl relative overflow-hidden group border-2",
                isSpecial
                    ? "bg-slate-100 text-slate-950 border-white shadow-[0_20px_40px_rgba(255,255,255,0.1)]"
                    : "bg-slate-900 text-white border-white/5 hover:border-white/10"
            )}
            onClick={onClick}
        >
            <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="relative z-10">{val}</span>
            {isSpecial && <div className="absolute top-2 right-4 text-[10px] not-italic uppercase font-bold text-slate-400">Boundary</div>}
        </button>
    )
}

function getBatterStats(id: string | null, events: any[], innings: number) {
    if (!id) return null
    const ev = events.filter(e => e.batter_id === id && e.innings_no === innings)
    const runs = ev.reduce((s: number, e: any) => s + e.runs_batter, 0)
    const balls = ev.filter((e: any) => !['WIDE', 'NO_BALL', 'Wide', 'No Ball', 'BYE', 'Bye', 'LEG_BYE', 'Leg Bye'].includes(e.extra_type)).length
    const fours = ev.filter(e => e.runs_batter === 4).length
    const sixes = ev.filter(e => e.runs_batter === 6).length
    return { main: runs, balls, fours, sixes }
}

function getBowlerStats(id: string | null, events: any[], innings: number) {
    if (!id) return null
    const ev = events.filter(e => e.bowler_id === id && e.innings_no === innings)
    const runs = ev.reduce((s: number, e: any) => s + (e.runs_batter + (e.runs_extras || 0)), 0)
    const wickets = ev.filter(e => e.wicket_type).length
    const balls = ev.filter(e => e.extra_type !== 'WIDE' && e.extra_type !== 'NO_BALL').length
    const overs = Math.floor(balls / 6) + "." + (balls % 6)
    return { runs, wickets, overs, balls }
}

function getBallLabel(e: any) {
    if (e.wicket_type) return "W"
    if (e.extra_type === "WIDE") return "WD"
    if (e.extra_type === "NO_BALL") return "NB"
    if (e.runs_batter === 0 && e.runs_extras === 0) return "•"
    return e.runs_batter + e.runs_extras
}
