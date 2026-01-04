"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Trophy, Users, Calendar, ArrowRight, ArrowLeft, Settings, Sparkles, Wand2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabase"
import { SupabaseError } from "@/components/SupabaseError"
import Link from "next/link"

interface Team {
    id: string
    name: string
}

export default function FixtureGeneratorPage() {
    if (!supabase) return <SupabaseError />
    const router = useRouter()
    const [teams, setTeams] = useState<Team[]>([])
    const [selectedTeams, setSelectedTeams] = useState<string[]>([])
    const [loading, setLoading] = useState(true)
    const [generating, setGenerating] = useState(false)
    const [tournamentName, setTournamentName] = useState("")

    useEffect(() => {
        async function fetchTeams() {
            const { data } = await supabase.from('teams').select('id, name').order('name')
            if (data) setTeams(data)
            setLoading(false)
        }
        fetchTeams()
    }, [])

    const toggleTeam = (id: string) => {
        setSelectedTeams(prev =>
            prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
        )
    }

    const generateFixtures = async () => {
        if (selectedTeams.length < 2) {
            alert("Select at least 2 teams!")
            return
        }
        if (!tournamentName) {
            alert("Enter tournament name!")
            return
        }

        setGenerating(true)
        try {
            // 1. Create Tournament
            const { data: tournament, error: tError } = await supabase
                .from('tournaments')
                .insert([{ name: tournamentName, status: 'Upcoming' }])
                .select()
                .single()

            if (tError) throw tError

            // 2. Add Teams to Tournament
            const tournamentTeams = selectedTeams.map(id => ({
                tournament_id: tournament.id,
                team_id: id
            }))
            const { error: ttError } = await supabase.from('tournament_teams').insert(tournamentTeams)
            if (ttError) throw ttError

            // 3. Generate Round Robin Fixtures
            const fixtures: any[] = []

            // Get or create a valid ground ID
            let groundId = null
            const { data: grounds } = await supabase.from('grounds').select('id').limit(1)

            if (grounds && grounds.length > 0) {
                groundId = grounds[0].id
            } else {
                // If no ground exists, create a default one
                const { data: newGround, error: ngError } = await supabase
                    .from('grounds')
                    .insert([{
                        name: 'Thondamuthur boys high school ground',
                        location: 'Thondamuthur'
                    }])
                    .select()
                    .single()

                if (ngError) {
                    console.error("Failed to create default ground:", ngError)
                    throw new Error("No ground found and failed to create a default one. Please add a ground manually in Admin.")
                }
                groundId = newGround.id
            }

            if (!groundId) {
                throw new Error("Could not determine a valid ground for matches.")
            }

            for (let i = 0; i < selectedTeams.length; i++) {
                for (let j = i + 1; j < selectedTeams.length; j++) {
                    fixtures.push({
                        tournament_id: tournament.id,
                        team_a_id: selectedTeams[i],
                        team_b_id: selectedTeams[j],
                        ground_id: groundId,
                        match_date: new Date().toISOString().split('T')[0],
                        match_time: '10:00:00',
                        overs_type: 'T20',
                        status: 'Scheduled'
                    })
                }
            }

            const { error: fError } = await supabase.from('matches').insert(fixtures)
            if (fError) throw fError

            alert(`Tournament "${tournamentName}" created with ${fixtures.length} fixtures!`)
            router.push(`/tournament?id=${tournament.id}`)
        } catch (error: any) {
            console.error("Tournament generation failed:", error.message)
            alert("Error generating tournament: " + error.message)
        } finally {
            setGenerating(false)
        }
    }

    if (loading) return <div className="p-20 text-center">Loading teams...</div>

    return (
        <div className="max-w-5xl mx-auto px-4 py-12">
            <Link href="/admin" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-8">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
            </Link>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight mb-2 flex items-center gap-3">
                        Fixture Engine <Wand2 className="h-8 w-8 text-primary" />
                    </h1>
                    <p className="text-muted-foreground">Automated round-robin scheduler for your league</p>
                </div>
                <Button
                    size="lg"
                    className="h-14 px-8 font-bold shadow-xl animate-pulse bg-gradient-to-r from-primary to-primary/80"
                    onClick={generateFixtures}
                    disabled={generating || selectedTeams.length < 2}
                >
                    {generating ? "Generating..." : <><Sparkles className="mr-2 h-5 w-5" /> Generate Tournament</>}
                </Button>
            </div>

            <div className="grid lg:grid-cols-3 gap-12">
                <div className="lg:col-span-1 space-y-6">
                    <Card className="border-none shadow-lg">
                        <CardHeader>
                            <CardTitle>Tournament Details</CardTitle>
                            <CardDescription>Basic info for the new series</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="tname">Tournament Name</Label>
                                <Input
                                    id="tname"
                                    placeholder="e.g. Winter Cup 2026"
                                    value={tournamentName}
                                    onChange={(e) => setTournamentName(e.target.value)}
                                />
                            </div>
                            <div className="p-4 bg-muted rounded-xl text-xs space-y-2">
                                <p className="font-bold flex items-center gap-2"><Settings className="h-3 w-3" /> Auto Configuration:</p>
                                <ul className="list-disc list-inside opacity-70">
                                    <li>Format: Round Robin</li>
                                    <li>Match Type: T20</li>
                                    <li>Ground: Auto-select available</li>
                                </ul>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-lg bg-slate-900 text-white">
                        <CardContent className="p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold text-lg">Selected Teams</h3>
                                <span className="bg-primary px-3 py-1 rounded-full text-xs font-black">{selectedTeams.length}</span>
                            </div>
                            <div className="space-y-2">
                                {selectedTeams.map(id => {
                                    const team = teams.find(t => t.id === id)
                                    return (
                                        <div key={id} className="flex items-center gap-3 p-2 bg-white/5 rounded-lg text-sm">
                                            <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center text-[10px] font-bold">
                                                {team?.name[0]}
                                            </div>
                                            {team?.name}
                                        </div>
                                    )
                                })}
                                {selectedTeams.length === 0 && <p className="text-white/40 text-xs italic text-center py-4">No teams selected yet</p>}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold">Select Participating Squads</h2>
                        <Button variant="ghost" size="sm" onClick={() => setSelectedTeams(teams.map(t => t.id))}>Select All</Button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {teams.map((team) => {
                            const isSelected = selectedTeams.includes(team.id)
                            return (
                                <button
                                    key={team.id}
                                    onClick={() => toggleTeam(team.id)}
                                    className={`p-6 rounded-3xl text-left transition-all border-2 ${isSelected
                                        ? 'border-primary bg-primary/5 shadow-inner'
                                        : 'border-border bg-card hover:border-primary/50'
                                        }`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`h-12 w-12 rounded-2xl flex items-center justify-center text-xl font-bold transition-colors ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                                            }`}>
                                            {team.name[0]}
                                        </div>
                                        <div>
                                            <p className="font-bold">{team.name}</p>
                                            <p className="text-xs text-muted-foreground">Click to {isSelected ? 'Remove' : 'Add'}</p>
                                        </div>
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    )
}
