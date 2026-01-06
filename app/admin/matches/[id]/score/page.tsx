"use client"

import { useEffect, useState, use } from "react"
import { useRouter } from "next/navigation"
import { Trophy, Users, Shield, Save, ArrowLeft, Plus, Minus, Zap, User, Target, ChevronDown, ChevronUp, History, RotateCcw, Swords, MousePointer2, PieChart, BarChart3, Trash2, Clock } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabase"
import { SupabaseError } from "@/components/SupabaseError"
import Link from "next/link"
import { cn } from "@/lib/utils"

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
}

interface ActiveState {
    batting_team_id: string
    striker_id: string | null
    non_striker_id: string | null
    bowler_id: string | null
    innings_no: number
    current_over: number
    current_ball: number // In user's logic, we should probably track total legal balls
    total_legal_balls?: number
}

// --- UTILS ---
const formatOvers = (totalBalls: number) => {
    return Math.floor(totalBalls / 6) + "." + (totalBalls % 6)
}

// --- MAIN COMPONENT ---
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
    const [score, setScore] = useState({ runs: 0, wickets: 0, balls: 0 })
    const [lastBowlerId, setLastBowlerId] = useState<string | null>(null)
    const [targetScore, setTargetScore] = useState<number | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [isProcessing, setIsProcessing] = useState(false)

    // UI States
    const [showTossSelection, setShowTossSelection] = useState(false)
    const [tossWinner, setTossWinner] = useState<string | null>(null)
    const [battingFirst, setBattingFirst] = useState<string | null>(null)
    const [showSelection, setShowSelection] = useState(true)
    const [isStarting, setIsStarting] = useState(false)
    const [showInningsSummary, setShowInningsSummary] = useState(false)

    // Constants
    const getTotalOversCap = (oversType: string) => {
        const num = parseInt(oversType.match(/(\d+)/)?.[0] || "20")
        return num
    }
    const totalOversLimit = match ? getTotalOversCap(match.overs_type) : 20

    const fetchData = async () => {
        setLoading(true)
        setError(null)
        try {
            const { data: matchData, error: matchError } = await supabase
                .from('matches')
                .select('*, team_a:teams!team_a_id(id, name), team_b:teams!team_b_id(id, name)')
                .eq('id', id)
                .single()

            if (matchError) throw matchError
            setMatch(matchData)

            const { data: pData } = await supabase.from('players').select('*').in('team_id', [matchData.team_a_id, matchData.team_b_id])
            setPlayers(pData || [])

            const { data: stateData } = await supabase.from('match_active_state').select('*').eq('match_id', id).single()

            const { data: allEventData } = await supabase.from('match_events').select('*').eq('match_id', id).order('created_at', { ascending: false })
            setEvents(allEventData || [])
            setRecentEvents(allEventData?.slice(0, 10) || [])

            const { data: wicketEvents } = await supabase.from('match_events').select('player_out_id').eq('match_id', id).not('player_out_id', 'is', null)
            setOutPlayerIds(wicketEvents?.map((w: any) => w.player_out_id as string) || [])

            if (stateData) {
                setActiveState(stateData)
                setShowSelection(!stateData.striker_id || !stateData.non_striker_id || !stateData.bowler_id)
                setShowTossSelection(false)

                const { data: scoreData } = await supabase.from('match_scores')
                    .select('*')
                    .eq('match_id', id)
                    .eq('team_id', stateData.batting_team_id)
                    .single()

                if (scoreData) {
                    // Extract total legal balls from overs_played (e.g. 10.3 -> 10*6 + 3 = 63)
                    const overInt = Math.floor(scoreData.overs_played)
                    const ballInt = Math.round((scoreData.overs_played - overInt) * 10)
                    const totalBalls = (overInt * 6) + ballInt
                    setScore({ runs: scoreData.runs_scored, wickets: scoreData.wickets_lost, balls: totalBalls })
                }
            } else {
                if (!matchData.toss_winner_id) setShowTossSelection(true)
                setActiveState({
                    batting_team_id: matchData.team_a_id,
                    striker_id: null, non_striker_id: null, bowler_id: null,
                    innings_no: 1, current_over: 0, current_ball: 0
                })
            }

            if (stateData?.innings_no === 2 || (allEventData && allEventData[0]?.innings_no === 2)) {
                const { data: firstInningsScore } = await supabase.from('match_scores')
                    .select('runs_scored')
                    .eq('match_id', id)
                    .eq('is_first_innings', true)
                    .single()
                if (firstInningsScore) setTargetScore(firstInningsScore.runs_scored + 1)
            }

            if (matchData.status === 'Completed') setShowInningsSummary(true)

        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchData() }, [id])

    const handleTossComplete = async () => {
        if (!tossWinner || !battingFirst) return;
        setIsStarting(true)
        try {
            await supabase.from('matches').update({ toss_winner_id: tossWinner, status: 'Live' }).eq('id', id)
            setActiveState(prev => prev ? { ...prev, batting_team_id: battingFirst } : null)
            setShowTossSelection(false)
            await fetchData()
        } catch (err: any) {
            alert(err.message)
        } finally { setIsStarting(false) }
    }

    const handleStartInnings = async () => {
        if (!activeState?.striker_id || !activeState?.non_striker_id || !activeState?.bowler_id) {
            alert("Choose players first!")
            return
        }
        setIsStarting(true)
        try {
            await supabase.from('match_active_state').upsert({ match_id: id, ...activeState })
            setShowSelection(false)
        } catch (err: any) {
            alert(err.message)
        } finally { setIsStarting(false) }
    }

    // --- CORE LOGIC: LOG BALL (FORCE CHANGE WITH USER LOGIC) ---
    const logBall = async (runs: number, ballType: string = "RUN", isWicket: boolean = false) => {
        if (isProcessing || !activeState || !match) return
        setIsProcessing(true)

        // Extras logic for test suite compatibility (Bug Fix 3)
        const isExtraBall = ['Wide', 'No Ball'].includes(ballType);

        try {
            // Local copy for logic processing
            let innings = {
                runs: score.runs,
                wickets: score.wickets,
                balls: score.balls, // total legal balls
                overs: Math.floor(score.balls / 6)
            }

            let striker = { id: activeState.striker_id, runs: 0, balls: 0 } // Base vals retrieved from stats later
            let nonStriker = { id: activeState.non_striker_id }
            let bowler = { id: activeState.bowler_id }

            // Apply Logic based on Ball Type
            if (ballType === "RUN") {
                innings.runs += runs;
                innings.balls++;
                // Striker rotation for odd runs (Bug Fix 2)
                if (runs % 2 !== 0) {
                    let temp = striker.id;
                    striker.id = nonStriker.id;
                    nonStriker.id = temp;
                }
            } else if (ballType === "WIDE") {
                innings.runs += 1 + runs;
                // Wides don't increment ball count (Bug Fix 3)
            } else if (ballType === "NO_BALL" || ballType === "No Ball") {
                innings.runs += 1 + runs;
                // No balls don't increment ball count (Bug Fix 3)
            } else if (ballType === "BYE" || ballType === "LEG_BYE") {
                innings.runs += runs;
                innings.balls++;
                // Striker rotation for odd runs (Bug Fix 2)
                if (runs % 2 !== 0) {
                    let temp = striker.id;
                    striker.id = nonStriker.id;
                    nonStriker.id = temp;
                }
            }

            if (isWicket) {
                innings.wickets++;
                // Check if it's a legal ball wicket (Bug Fix 3)
                if (ballType !== "WIDE" && ballType !== "NO_BALL") {
                    innings.balls++;
                }
                setOutPlayerIds(prev => [...prev, activeState.striker_id!])
                striker.id = null; // next batsman needed
            }

            // Over Completion Logic (Bug Fix 2: Strike rotation on over end)
            let overJustEnded = false;
            const ballsInThisOver = innings.balls % 6;
            if (innings.balls > 0 && ballsInThisOver === 0 && (ballType !== "WIDE" && ballType !== "NO_BALL")) {
                overJustEnded = true;
                // Always swap strikers at the end of a completed over (Rule 2)
                let temp = striker.id;
                striker.id = nonStriker.id;
                nonStriker.id = temp;
                setLastBowlerId(bowler.id);
            }

            // Database Insertion: Event
            const newEvent = {
                match_id: id,
                innings_no: activeState.innings_no,
                over_no: Math.floor((innings.balls - (ballType === "WIDE" || ballType === "NO_BALL" ? 0 : 1)) / 6),
                ball_no: (innings.balls % 6 === 0 && (ballType !== "WIDE" && ballType !== "NO_BALL") ? 6 : innings.balls % 6) || (ballType === "WIDE" || ballType === "NO_BALL" ? (innings.balls % 6) + 1 : 6),
                batter_id: activeState.striker_id,
                bowler_id: activeState.bowler_id,
                non_striker_id: activeState.non_striker_id,
                runs_batter: (ballType === "RUN" || ballType === "NO_BALL") ? runs : 0,
                runs_extras: ballType === "WIDE" ? (1 + runs) : (ballType === "NO_BALL" ? 1 : (ballType === "BYE" || ballType === "LEG_BYE" ? runs : 0)),
                extra_type: ballType === "RUN" ? null : ballType,
                wicket_type: isWicket ? 'Out' : null,
                player_out_id: isWicket ? activeState.striker_id : null,
                commentary: isWicket ? `WICKET!` : `${ballType}: ${runs} runs`
            }

            const { data: insertedEvent } = await supabase.from('match_events').insert([newEvent]).select().single()

            // Check Innings End (Bug Fix 1 & 4)
            const maxWickets = 10
            const isAllOut = innings.wickets >= maxWickets
            const isOversComplete = Math.floor(innings.balls / 6) >= totalOversLimit
            const isTargetReached = activeState.innings_no === 2 && targetScore !== null && innings.runs >= targetScore

            const inningsEnds = isAllOut || isOversComplete || isTargetReached

            // Match Result Calculation (Rule 5)
            if (activeState.innings_no === 2 && inningsEnds) {
                let result = ""
                let winner_id = null
                const battingTeamName = match.team_a_id === activeState.batting_team_id ? match.team_a.name : match.team_b.name
                const bowlingTeamName = match.team_a_id === activeState.batting_team_id ? match.team_b.name : match.team_a.name

                if (innings.runs >= (targetScore || 0)) {
                    result = `${battingTeamName} won by ${10 - innings.wickets} wickets`
                    winner_id = activeState.batting_team_id
                } else {
                    if (innings.runs === (targetScore || 0) - 1) {
                        result = "Match Tied"
                    } else {
                        result = `${bowlingTeamName} won by ${(targetScore || 0) - innings.runs - 1} runs`
                        winner_id = activeState.batting_team_id === match.team_a_id ? match.team_b_id : match.team_a_id
                    }
                }
                await supabase.from('matches').update({ status: 'Completed', winner_id }).eq('id', id)
                setShowInningsSummary(true)
            } else if (activeState.innings_no === 1 && inningsEnds) {
                setShowInningsSummary(true)
            }

            // Update Match Scores (Explicitly handle conflict for (match_id, team_id))
            const oversPlayedDecimal = parseFloat(Math.floor(innings.balls / 6) + "." + (innings.balls % 6))
            await supabase.from('match_scores').upsert({
                match_id: id,
                team_id: activeState.batting_team_id,
                runs_scored: innings.runs,
                wickets_lost: innings.wickets,
                overs_played: oversPlayedDecimal,
                is_first_innings: activeState.innings_no === 1
            }, { onConflict: 'match_id,team_id' })

            // Update Active State
            const nextActiveState = {
                ...activeState,
                striker_id: striker.id,
                non_striker_id: nonStriker.id,
                current_ball: innings.balls % 6,
                current_over: Math.floor(innings.balls / 6),
                last_event_id: insertedEvent.id
            }

            if (!inningsEnds) {
                await supabase.from('match_active_state').update(nextActiveState).eq('match_id', id)
                setActiveState(nextActiveState)
            }

            setScore({ runs: innings.runs, wickets: innings.wickets, balls: innings.balls })
            setRecentEvents(prev => [insertedEvent, ...prev.slice(0, 9)])
            setEvents(prev => [insertedEvent, ...prev])

            if ((isWicket && !isAllOut) || (overJustEnded && !inningsEnds)) {
                setShowSelection(true)
            }

        } catch (err: any) {
            console.error(err)
        } finally {
            setIsProcessing(false)
        }
    }

    const handleNextInnings = async () => {
        const nextTeam = activeState?.batting_team_id === match?.team_a_id ? match?.team_b_id : match?.team_a_id
        const newState = {
            match_id: id,
            batting_team_id: nextTeam,
            striker_id: null, non_striker_id: null, bowler_id: null,
            innings_no: 2, current_over: 0, current_ball: 0
        }
        await supabase.from('match_active_state').upsert(newState)
        setShowInningsSummary(false)
        setShowSelection(true)
        window.location.reload()
    }

    const handleResetMatchScore = async () => {
        if (!confirm("Are you sure you want to reset the current match score? This will clear all events and scores for this match but keep teams/players.")) return;
        setIsProcessing(true)
        try {
            await supabase.from('match_events').delete().eq('match_id', id)
            await supabase.from('match_scores').delete().eq('match_id', id)
            await supabase.from('match_active_state').delete().eq('match_id', id)
            await supabase.from('matches').update({ status: 'Scheduled', winner_id: null, toss_winner_id: null }).eq('id', id)
            window.location.reload()
        } catch (err: any) {
            alert(err.message)
        } finally {
            setIsProcessing(false)
        }
    }

    if (loading || !match || !activeState) return <div className="p-20 text-center animate-pulse font-black text-primary">SCORING ENGINE INITIALIZING...</div>

    const strikerStats = getBatterStats(activeState.striker_id, events, activeState.innings_no)
    const nonStrikerStats = getBatterStats(activeState.non_striker_id, events, activeState.innings_no)
    const bowlerStats = getBowlerStats(activeState.bowler_id, events, activeState.innings_no)

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <Link href="/admin" className="text-xs font-bold text-muted-foreground hover:text-primary flex items-center gap-1 mb-2">
                        <ArrowLeft className="h-3 w-3" /> ADMIN DASHBOARD
                    </Link>
                    <h1 className="text-4xl font-black italic tracking-tighter">LIVE <span className="text-primary">SCORER</span></h1>
                </div>
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="sm" className="bg-red-50 text-red-600 border-red-200 hover:bg-red-500 hover:text-white transition-all font-black text-[10px] uppercase h-8" onClick={handleResetMatchScore}>
                        <RotateCcw className="h-3 w-3 mr-1" /> Reset Score
                    </Button>
                    <div className="bg-red-500 text-white px-4 py-1 rounded-full text-[10px] font-black animate-pulse flex items-center gap-2">
                        <div className="h-2 w-2 bg-white rounded-full" /> LIVE ENGINE
                    </div>
                </div>
            </div>

            {showTossSelection ? (
                <Card className="max-w-2xl mx-auto rounded-[3rem] overflow-hidden bg-slate-900 text-white border-none shadow-2xl">
                    <CardHeader className="p-10 text-center border-b border-white/5">
                        <Trophy className="h-12 w-12 text-primary mx-auto mb-4" />
                        <CardTitle className="text-3xl font-black italic uppercase">Toss Selection</CardTitle>
                    </CardHeader>
                    <CardContent className="p-10 space-y-8">
                        <div>
                            <Label className="text-[10px] font-black uppercase text-white/50 mb-4 block">Who won the toss?</Label>
                            <div className="grid grid-cols-2 gap-4">
                                {[match.team_a, match.team_b].map(t => (
                                    <Button key={t.id} variant={tossWinner === t.id ? "default" : "secondary"} className="h-16 rounded-2xl font-black" onClick={() => setTossWinner(t.id)}>{t.name}</Button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <Label className="text-[10px] font-black uppercase text-white/50 mb-4 block">Decision?</Label>
                            <div className="grid grid-cols-2 gap-4">
                                <Button variant={battingFirst === tossWinner ? "default" : "secondary"} className="h-16 rounded-2xl font-black" onClick={() => setBattingFirst(tossWinner || "")}>BAT FIRST</Button>
                                <Button variant={battingFirst !== tossWinner && tossWinner ? "default" : "secondary"} className="h-16 rounded-2xl font-black" onClick={() => setBattingFirst(tossWinner === match.team_a_id ? match.team_b_id : match.team_a_id)}>BOWL FIRST</Button>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="p-10 bg-white/5">
                        <Button className="w-full h-14 rounded-2xl font-black" onClick={handleTossComplete} disabled={!tossWinner || !battingFirst}>CONFIRM & START</Button>
                    </CardFooter>
                </Card>
            ) : showInningsSummary ? (
                <InningsSummary match={match} activeState={activeState} score={score} players={players} events={events} onNext={activeState.innings_no === 1 ? handleNextInnings : () => router.push(`/matches/${id}`)} />
            ) : (
                <div className="grid lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-8 space-y-6">
                        <Card className="bg-slate-900 text-white rounded-[2.5rem] border-none shadow-2xl overflow-hidden">
                            <CardHeader className="p-8 border-b border-white/5 flex flex-row justify-between items-center">
                                <div>
                                    <p className="text-[10px] font-black text-primary uppercase">Innings {activeState.innings_no} • {match.overs_type}</p>
                                    <h2 className="text-3xl font-black italic">{activeState.batting_team_id === match.team_a_id ? match.team_a.name : match.team_b.name}</h2>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black opacity-50 uppercase">Over {formatOvers(score.balls)}</p>
                                    <p className="text-5xl font-black italic text-primary">{score.runs}/{score.wickets}</p>
                                </div>
                            </CardHeader>
                            <CardContent className="p-8">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <PlayerBox label="STRIKER" name={players.find(p => p.id === activeState.striker_id)?.name} stats={strikerStats} active />
                                    <PlayerBox label="NON-STRIKER" name={players.find(p => p.id === activeState.non_striker_id)?.name} stats={nonStrikerStats} />
                                    <PlayerBox label="BOWLER" name={players.find(p => p.id === activeState.bowler_id)?.name} stats={bowlerStats} color="text-red-400" />
                                </div>

                                {activeState.innings_no === 2 && targetScore && (
                                    <div className="mt-8 p-4 bg-white/5 rounded-2xl flex justify-between items-center border border-white/10">
                                        <div className="text-center">
                                            <p className="text-[10px] font-black opacity-40">TARGET</p>
                                            <p className="text-2xl font-black italic">{targetScore}</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-[10px] font-black text-primary uppercase">Need</p>
                                            <p className="text-2xl font-black italic text-primary">{Math.max(0, targetScore - score.runs)}</p>
                                        </div>
                                        <div className="text-center text-xs font-bold leading-tight">
                                            {score.runs >= targetScore ? "TARGET ACHIEVED" : `${targetScore - score.runs} runs from ${(totalOversLimit * 6) - score.balls} balls`}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {showSelection ? (
                            <Card className="rounded-[2.5rem] border-2 border-primary/20 shadow-xl overflow-hidden">
                                <CardHeader className="bg-slate-50 border-b p-6">
                                    <CardTitle className="text-sm font-black uppercase flex items-center gap-2">
                                        <MousePointer2 className="h-4 w-4 text-primary" /> Active Field Selection
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-8 grid md:grid-cols-3 gap-6">
                                    <SelectPlayer
                                        label="Striker"
                                        value={activeState.striker_id}
                                        options={players.filter(p => p.team_id === activeState.batting_team_id && !outPlayerIds.includes(p.id) && p.id !== activeState.non_striker_id)}
                                        onChange={(v: string) => setActiveState(s => s ? { ...s, striker_id: v } : s)}
                                    />
                                    <SelectPlayer
                                        label="Non-Striker"
                                        value={activeState.non_striker_id}
                                        options={players.filter(p => p.team_id === activeState.batting_team_id && !outPlayerIds.includes(p.id) && p.id !== activeState.striker_id)}
                                        onChange={(v: string) => setActiveState(s => s ? { ...s, non_striker_id: v } : s)}
                                    />
                                    <SelectPlayer
                                        label="Bowler"
                                        value={activeState.bowler_id}
                                        options={players.filter(p => p.team_id !== activeState.batting_team_id && p.id !== lastBowlerId)}
                                        onChange={(v: string) => setActiveState(s => s ? { ...s, bowler_id: v } : s)}
                                    />
                                </CardContent>
                                <CardFooter className="p-8 bg-slate-50 border-t">
                                    <Button className="w-full h-14 rounded-2xl font-black text-lg" onClick={handleStartInnings} disabled={isStarting}>LOCK SELECTION</Button>
                                </CardFooter>
                            </Card>
                        ) : (
                            <div className="grid grid-cols-4 gap-4">
                                {[0, 1, 2, 3, 4, 6].map(r => (
                                    <Button key={r} className="h-20 text-3xl font-black rounded-3xl bg-white border-2 border-slate-100 text-slate-900 hover:bg-primary hover:text-white transition-all shadow-xl" onClick={() => logBall(r, "RUN")} disabled={isProcessing}>{r}</Button>
                                ))}
                                <Button className="h-20 text-xl font-black rounded-3xl bg-amber-50 text-amber-600 border-2 border-amber-200 hover:bg-amber-500 hover:text-white transition-all" onClick={() => logBall(0, "WIDE")} disabled={isProcessing}>WD</Button>
                                <Button className="h-20 text-xl font-black rounded-3xl bg-orange-50 text-orange-600 border-2 border-orange-200 hover:bg-orange-500 hover:text-white transition-all" onClick={() => logBall(0, "NO_BALL")} disabled={isProcessing}>NB</Button>
                                <Button className="h-20 text-xl font-black rounded-3xl col-span-2 bg-red-500 text-white shadow-xl shadow-red-200 hover:bg-red-600 transition-all font-black italic tracking-tighter text-2xl" onClick={() => logBall(0, "RUN", true)} disabled={isProcessing}>WICKET</Button>
                                <Button className="h-14 font-bold rounded-2xl bg-slate-100 text-slate-600 border border-slate-200" onClick={() => logBall(0, "BYE")} disabled={isProcessing}>BYE</Button>
                                <Button className="h-14 font-bold rounded-2xl bg-slate-100 text-slate-600 border border-slate-200" onClick={() => logBall(0, "LEG_BYE")} disabled={isProcessing}>L-BYE</Button>
                            </div>
                        )}
                    </div>

                    <div className="lg:col-span-4 space-y-6">
                        <Card className="rounded-[2rem] border-none shadow-xl flex flex-col h-[600px]">
                            <CardHeader className="bg-slate-50 border-b flex flex-row justify-between items-center">
                                <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2"><History className="h-4 w-4 text-primary" /> Timeline</CardTitle>
                                <Button variant="ghost" size="icon" onClick={() => fetchData()}><RotateCcw className="h-4 w-4" /></Button>
                            </CardHeader>
                            <CardContent className="p-0 flex-grow overflow-y-auto">
                                <div className="divide-y">
                                    {recentEvents.map(e => (
                                        <div key={e.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                                            <div className="flex items-center gap-4">
                                                <div className="h-8 w-8 bg-slate-900 text-white text-[10px] font-black rounded-full flex items-center justify-center">{e.over_no}.{e.ball_no}</div>
                                                <div>
                                                    <p className="text-xs font-black">{e.runs_batter + e.runs_extras} RUNS {e.extra_type ? `(${e.extra_type})` : ''}</p>
                                                    <p className="text-[10px] text-muted-foreground">{players.find(p => p.id === e.batter_id)?.name}</p>
                                                </div>
                                            </div>
                                            {e.wicket_type && <span className="bg-red-500 text-white px-2 py-0.5 rounded text-[8px] font-black uppercase">Wicket</span>}
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}
        </div>
    )
}

// --- SUB-COMPONENTS ---

function PlayerBox({ label, name, stats, active, color }: any) {
    return (
        <div className={cn("p-4 rounded-2xl border-2 transition-all", active ? "bg-primary/20 border-primary/40" : "bg-white/5 border-white/10")}>
            <p className="text-[9px] font-black uppercase opacity-40 mb-1">{label}</p>
            <p className={cn("text-lg font-black italic", color)}>{name || "—"}</p>
            {stats && (
                <div className="mt-2 text-xl font-black italic tracking-tighter text-primary">{stats.main}<span className="text-[10px] ml-1 opacity-60 uppercase not-italic tracking-normal">{stats.sub}</span></div>
            )}
        </div>
    )
}

function SelectPlayer({ label, value, options, onChange }: any) {
    return (
        <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-muted-foreground">{label}</Label>
            <select className="w-full h-12 rounded-xl bg-slate-100 px-4 font-bold border-none outline-none focus:ring-2 focus:ring-primary" value={value || ""} onChange={(e) => onChange(e.target.value)}>
                <option value="">Choose {label}</option>
                {options.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
        </div>
    )
}

function InningsSummary({ match, activeState, score, players, events, onNext }: any) {
    const isFirst = activeState.innings_no === 1
    const currentInningsEvents = events.filter((e: any) => e.innings_no === activeState.innings_no)

    return (
        <Card className="max-w-4xl mx-auto rounded-[3.5rem] bg-slate-900 text-white border-none shadow-3xl overflow-hidden animate-in fade-in duration-700">
            <CardHeader className="p-16 text-center border-b border-white/5">
                <Trophy className="h-20 w-20 text-primary mx-auto mb-6" />
                <h2 className="text-5xl font-black italic tracking-tighter mb-4">{isFirst ? "INNINGS BREAK" : "MATCH ENDED"}</h2>
                <div className="text-6xl font-black italic text-primary">{score.runs}/{score.wickets}</div>
                <p className="text-white/60 font-bold tracking-widest uppercase mt-4">FINAL SCORE SUMMARY</p>
            </CardHeader>
            <CardContent className="p-16 space-y-12">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                    <SummaryStat label="RUN RATE" value={(score.runs / (score.balls / 6) || 0).toFixed(2)} />
                    <SummaryStat label="OVERS" value={formatOvers(score.balls)} />
                    <SummaryStat label="EXTRAS" value={currentInningsEvents.reduce((s: number, e: any) => s + e.runs_extras, 0).toString()} />
                    <SummaryStat label="WICKETS" value={score.wickets.toString()} />
                </div>

                <div className="space-y-8">
                    <div>
                        <h3 className="text-sm font-black text-primary uppercase mb-4 text-left">Batting Scorecard</h3>
                        <div className="space-y-2">
                            {players.filter((p: any) =>
                                p.team_id === activeState.batting_team_id &&
                                events.some((e: any) => e.batter_id === p.id && e.innings_no === activeState.innings_no)
                            ).map((p: any) => {
                                const stats = getBatterStats(p.id, events, activeState.innings_no);
                                return (
                                    <div key={p.id} className="flex justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                                        <span className="font-bold">{p.name} {events.some((e: any) => e.player_out_id === p.id) && <span className="text-red-400 text-[10px] ml-1 uppercase">(Out)</span>}</span>
                                        <span className="font-black italic text-primary">{stats?.main} <span className="text-[10px] text-white/40 not-italic ml-1">{stats?.sub}</span></span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div>
                        <h3 className="text-sm font-black text-primary uppercase mb-4 text-left">Bowling Scorecard</h3>
                        <div className="space-y-2">
                            {players.filter((p: any) =>
                                p.team_id !== activeState.batting_team_id &&
                                events.some((e: any) => e.bowler_id === p.id && e.innings_no === activeState.innings_no)
                            ).map((p: any) => {
                                const stats = getBowlerStats(p.id, events, activeState.innings_no);
                                return (
                                    <div key={p.id} className="flex justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                                        <span className="font-bold">{p.name}</span>
                                        <span className="font-black italic text-primary">{stats?.main} <span className="text-[10px] text-white/40 not-italic ml-1">{stats?.sub}</span></span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </CardContent>
            <CardFooter className="p-16 bg-white/5">
                <Button className="w-full h-20 rounded-3xl text-2xl font-black italic group" onClick={onNext}>
                    {isFirst ? "CONTINUE TO 2ND INNINGS" : "BACK TO DASHBOARD"} <Zap className="ml-2 fill-current group-hover:animate-bounce" />
                </Button>
            </CardFooter>
        </Card>
    )
}

function SummaryStat({ label, value }: any) {
    return (
        <div className="bg-white/5 p-6 rounded-3xl border border-white/5">
            <p className="text-[10px] font-black text-primary uppercase mb-2">{label}</p>
            <p className="text-3xl font-black italic">{value}</p>
        </div>
    )
}

// --- LOGIC HELPERS ---

function getBatterStats(id: string | null, events: any[], innings: number) {
    if (!id) return null
    const ev = events.filter(e => e.batter_id === id && e.innings_no === innings)
    const runs = ev.reduce((s, e) => s + e.runs_batter, 0)
    const balls = ev.filter(e => e.extra_type !== 'Wide' && e.extra_type !== 'No Ball').length
    return { main: runs, sub: `(${balls})` }
}

function getBowlerStats(id: string | null, events: any[], innings: number) {
    if (!id) return null
    const ev = events.filter(e => e.bowler_id === id && e.innings_no === innings)
    const wickets = ev.filter(e => e.wicket_type).length
    const runs = ev.reduce((s, e) => s + e.runs_batter + e.runs_extras, 0)
    const legalBalls = ev.filter(e => e.extra_type !== 'Wide' && e.extra_type !== 'No Ball').length
    const economy = legalBalls > 0 ? ((runs / legalBalls) * 6).toFixed(2) : "0.00"
    return { main: `${wickets}-${runs}`, sub: `${formatOvers(legalBalls)} OV (Eco: ${economy})` }
}
