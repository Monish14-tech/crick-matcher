"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Calendar, Users, MapPin, Clock, Info, CheckCircle2, ArrowLeft, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/supabase"
import { SupabaseError } from "@/components/SupabaseError"
import Link from "next/link"

export default function NewMatchPage() {
    if (!supabase) return <SupabaseError />
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)

    const [teams, setTeams] = useState<any[]>([])
    const [grounds, setGrounds] = useState<any[]>([])

    const [matchData, setMatchData] = useState({
        team_a_id: "",
        team_b_id: "",
        ground_id: "",
        match_date: "",
        match_time: "",
        overs_type: "T20"
    })
    const [customOvers, setCustomOvers] = useState("")


    useEffect(() => {
        async function fetchData() {
            const { data: teamsData } = await supabase.from('teams').select('id, name')
            let { data: groundsData } = await supabase.from('grounds').select('id, name, location')

            setTeams(teamsData || [])

            // If no grounds exist, create the default "Thondamuthur boys high school ground"
            if (!groundsData || groundsData.length === 0) {
                const { data: newGround, error } = await supabase
                    .from('grounds')
                    .insert([{
                        name: 'Thondamuthur boys high school ground',
                        location: 'Thondamuthur'
                    }])
                    .select()

                if (!error && newGround && newGround.length > 0) {
                    groundsData = newGround
                }
            }

            if (groundsData && groundsData.length > 0) {
                setGrounds(groundsData)
                setMatchData(prev => ({ ...prev, ground_id: groundsData[0].id }))
            } else {
                setGrounds([])
                setMatchData(prev => ({ ...prev, ground_id: "" }))
            }
        }
        fetchData()
    }, [])

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
        setMatchData(prev => ({ ...prev, [e.target.name]: e.target.value }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (matchData.team_a_id === matchData.team_b_id) {
            alert("Teams A and B must be different!")
            return
        }

        if (matchData.overs_type === "Custom" && !customOvers) {
            alert("Please enter the number of overs for custom format!")
            return
        }

        setLoading(true)
        try {
            const finalOversType = matchData.overs_type === "Custom" ? `${customOvers} Overs` : matchData.overs_type

            const { error } = await supabase
                .from("matches")
                .insert([{ ...matchData, overs_type: finalOversType }])

            if (error) throw error

            setSuccess(true)
            setTimeout(() => {
                router.push("/admin")
            }, 2000)
        } catch (error) {
            const message = error instanceof Error ? error.message : "Unknown error"
            console.error("Error scheduling match:", message)
            alert("Error: " + message)
        } finally {
            setLoading(false)
        }
    }

    if (success) {
        return (
            <div className="min-h-[70vh] flex items-center justify-center p-4 text-center">
                <div className="space-y-6 animate-in fade-in zoom-in duration-500">
                    <div className="h-24 w-24 bg-primary rounded-full flex items-center justify-center text-primary-foreground mx-auto shadow-2xl">
                        <Zap className="h-12 w-12" />
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-3xl font-bold">Match Fixed Successfully!</h1>
                        <p className="text-muted-foreground">The teams have been notified and the calendar updated.</p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-12">
            <Link href="/admin" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-8 transition-colors">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
            </Link>

            <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="space-y-2">
                    <h1 className="text-4xl font-extrabold tracking-tight">Schedule Match</h1>
                    <p className="text-muted-foreground italic">Professional match fixing and scheduling system.</p>
                </div>
                <div className="bg-primary/5 border border-primary/20 px-4 py-2 rounded-lg flex items-center space-x-3">
                    <Info className="h-5 w-5 text-primary" />
                    <div className="text-xs">
                        <p className="font-bold uppercase tracking-wider">Note to Admin</p>
                        <p>Matches are scheduled at the Thondamuthur boys high school ground.</p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Teams and Format */}
                <div className="space-y-6">
                    <Card className="shadow-md">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="h-5 w-5 text-primary" />
                                Team Selection
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label>Team A (Home)</Label>
                                <select
                                    name="team_a_id"
                                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                                    required
                                    value={matchData.team_a_id}
                                    onChange={handleChange}
                                >
                                    <option value="">Select Home Team</option>
                                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            </div>
                            <div className="flex justify-center -my-3">
                                <div className="bg-muted px-3 py-1 rounded text-xs font-black italic text-muted-foreground">VS</div>
                            </div>
                            <div className="space-y-2">
                                <Label>Team B (Away)</Label>
                                <select
                                    name="team_b_id"
                                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                                    required
                                    value={matchData.team_b_id}
                                    onChange={handleChange}
                                >
                                    <option value="">Select Away Team</option>
                                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-md">
                        <CardHeader>
                            <CardTitle className="text-lg">Match Format</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                {["T10", "T20", "50 Overs", "Custom"].map((f) => (
                                    <div
                                        key={f}
                                        onClick={() => setMatchData(prev => ({ ...prev, overs_type: f }))}
                                        className={`p-4 border rounded-xl text-center cursor-pointer transition-all ${matchData.overs_type === f ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:border-primary/50'}`}
                                    >
                                        <p className="font-bold">{f}</p>
                                    </div>
                                ))}
                            </div>

                            {matchData.overs_type === "Custom" && (
                                <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <Label htmlFor="customOvers">Number of Overs</Label>
                                    <Input
                                        id="customOvers"
                                        type="number"
                                        min="1"
                                        max="100"
                                        placeholder="Enter overs (e.g., 15)"
                                        value={customOvers}
                                        onChange={(e) => setCustomOvers(e.target.value)}
                                        className="h-12 text-lg font-bold text-center"
                                    />
                                    <p className="text-xs text-muted-foreground text-center">
                                        Enter any number between 1-100 overs
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Venue and Timing */}
                <div className="space-y-6">
                    <Card className="shadow-md">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <MapPin className="h-5 w-5 text-primary" />
                                Venue & Timing
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label>Venue</Label>
                                <div className="w-full h-10 rounded-md border border-input bg-muted/50 px-3 py-2 text-sm flex items-center text-muted-foreground italic">
                                    {grounds[0]?.name || "Thondamuthur boys high school ground"} ({grounds[0]?.location || "Thondamuthur"})
                                </div>
                                <input type="hidden" name="ground_id" value={matchData.ground_id} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-1">
                                        <Calendar className="h-3 w-3" /> Date
                                    </Label>
                                    <Input
                                        type="date"
                                        name="match_date"
                                        required
                                        value={matchData.match_date}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" /> Time (24h)
                                    </Label>
                                    <Input
                                        type="time"
                                        name="match_time"
                                        required
                                        value={matchData.match_time}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="flex flex-col gap-4 border-t pt-6 bg-slate-50/50">
                            <Button
                                type="submit"
                                className="w-full h-12 font-bold text-lg"
                                disabled={loading || teams.length < 2}
                            >
                                {loading ? "Scheduling..." : "Schedule Match"}
                            </Button>
                            {teams.length < 2 && (
                                <div className="text-xs text-destructive font-medium text-center space-y-1">
                                    <p>⚠️ Please register at least 2 teams first.</p>
                                    <Link href="/admin/teams/register" className="text-primary underline hover:no-underline">
                                        → Register Teams
                                    </Link>
                                </div>
                            )}
                        </CardFooter>
                    </Card>

                    <div className="p-6 bg-slate-100 rounded-2xl space-y-4">
                        <h3 className="font-bold flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-primary" />
                            Scheduling Preview
                        </h3>
                        <div className="space-y-2 text-sm text-muted-foreground">
                            <p>Selection: <span className="text-foreground font-medium">{matchData.overs_type}</span></p>
                            <p>Matchup: <span className="text-foreground font-medium">Team A vs Team B</span></p>
                            <p>Reserved Venue: <span className="text-foreground font-medium">{grounds.find(g => g.id === matchData.ground_id)?.name || "Not selected"}</span></p>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    )
}
