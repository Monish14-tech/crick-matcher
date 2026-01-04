"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Trophy, Users, User, Phone, MapPin, Plus, Trash2, CheckCircle2, ChevronRight, ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/supabase"
import { SupabaseError } from "@/components/SupabaseError"

export default function TeamRegisterPage() {
    if (!supabase) return <SupabaseError />
    const router = useRouter()
    const [step, setStep] = useState(1)
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)

    const [teamData, setTeamData] = useState({
        name: "",
        captain_name: "",
        contact_number: "",
        logo_url: ""
    })

    const [players, setPlayers] = useState([
        { name: "", role: "Batsman" },
        { name: "", role: "Batsman" },
        { name: "", role: "Bowler" },
        { name: "", role: "Bowler" },
        { name: "", role: "All-Rounder" },
    ])

    const handleTeamChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTeamData(prev => ({ ...prev, [e.target.name]: e.target.value }))
    }

    const handlePlayerChange = (index: number, field: string, value: string) => {
        const newPlayers = [...players]
        newPlayers[index] = { ...newPlayers[index], [field]: value }
        setPlayers(newPlayers)
    }

    const addPlayer = () => {
        setPlayers([...players, { name: "", role: "Batsman" }])
    }

    const removePlayer = (index: number) => {
        if (players.length > 5) {
            setPlayers(players.filter((_, i) => i !== index))
        }
    }

    const handleSubmit = async () => {
        setLoading(true)
        try {
            // 1. Insert Team
            const { data: team, error: teamError } = await supabase
                .from("teams")
                .insert([teamData])
                .select()
                .single()

            if (teamError) throw teamError

            // 2. Insert Players
            const playersToInsert = players
                .filter(p => p.name.trim() !== "")
                .map(p => ({
                    team_id: team.id,
                    name: p.name,
                    role: p.role
                }))

            if (playersToInsert.length > 0) {
                const { error: playersError } = await supabase
                    .from("players")
                    .insert(playersToInsert)

                if (playersError) throw playersError
            }

            setSuccess(true)
            setTimeout(() => {
                router.push("/")
            }, 3000)
        } catch (error) {
            const message = error instanceof Error ? error.message : "Registration failed"
            console.error("Error registering team:", message)
            alert("Registration failed: " + message)
        } finally {
            setLoading(false)
        }
    }

    if (success) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center p-4">
                <Card className="max-w-md w-full text-center p-8 space-y-6">
                    <div className="flex justify-center">
                        <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                            <CheckCircle2 className="h-12 w-12" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <CardTitle className="text-3xl">Registration Successful!</CardTitle>
                        <CardDescription className="text-lg">
                            {teamData.name} has been registered. Redirecting you home...
                        </CardDescription>
                    </div>
                </Card>
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-12">
            <div className="mb-10 text-center space-y-4">
                <h1 className="text-4xl font-bold tracking-tight">Register Your Team</h1>
                <p className="text-muted-foreground max-w-lg mx-auto">
                    Start your professional cricket journey by providing your team details and squad members.
                </p>

                {/* Step Indicator */}
                <div className="flex items-center justify-center space-x-4 pt-4">
                    <div className={`h-2 w-16 rounded-full ${step === 1 ? 'bg-primary' : 'bg-muted'}`} />
                    <div className={`h-2 w-16 rounded-full ${step === 2 ? 'bg-primary' : 'bg-muted'}`} />
                </div>
            </div>

            <Card className="shadow-xl">
                {step === 1 ? (
                    <>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-2xl">
                                <Trophy className="h-6 w-6 text-primary" />
                                Team Information
                            </CardTitle>
                            <CardDescription>Enter the general details of your cricket team.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Team Name</Label>
                                    <Input
                                        id="name"
                                        name="name"
                                        placeholder="e.g. Royal Challengers"
                                        value={teamData.name}
                                        onChange={handleTeamChange}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="captain_name">Captain Name</Label>
                                    <Input
                                        id="captain_name"
                                        name="captain_name"
                                        placeholder="Full name of the captain"
                                        value={teamData.captain_name}
                                        onChange={handleTeamChange}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="contact_number">Contact Number</Label>
                                    <Input
                                        id="contact_number"
                                        name="contact_number"
                                        placeholder="+91 XXXXX XXXXX"
                                        value={teamData.contact_number}
                                        onChange={handleTeamChange}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="logo_url">Team Logo URL (Optional)</Label>
                                    <Input
                                        id="logo_url"
                                        name="logo_url"
                                        placeholder="https://example.com/logo.png"
                                        value={teamData.logo_url}
                                        onChange={handleTeamChange}
                                    />
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="flex justify-end pt-4">
                            <Button
                                onClick={() => setStep(2)}
                                disabled={!teamData.name || !teamData.captain_name || !teamData.contact_number}
                                className="h-11 px-8"
                            >
                                Next: Squad Management <ChevronRight className="ml-2 h-4 w-4" />
                            </Button>
                        </CardFooter>
                    </>
                ) : (
                    <>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-2xl">
                                <Users className="h-6 w-6 text-primary" />
                                Squad Members
                            </CardTitle>
                            <CardDescription>Add at least 5 players to your team roster.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-4">
                                {players.map((player, index) => (
                                    <div key={index} className="flex gap-4 items-end animate-in fade-in slide-in-from-top-2">
                                        <div className="flex-grow space-y-2">
                                            <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Player {index + 1} Name</Label>
                                            <Input
                                                placeholder="Player Name"
                                                value={player.name}
                                                onChange={(e) => handlePlayerChange(index, 'name', e.target.value)}
                                            />
                                        </div>
                                        <div className="w-40 space-y-2">
                                            <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Role</Label>
                                            <select
                                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                                value={player.role}
                                                onChange={(e) => handlePlayerChange(index, 'role', e.target.value)}
                                            >
                                                <option>Batsman</option>
                                                <option>Bowler</option>
                                                <option>All-Rounder</option>
                                                <option>Wicket Keeper</option>
                                            </select>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-muted-foreground hover:text-destructive"
                                            onClick={() => removePlayer(index)}
                                            disabled={players.length <= 5}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                            <Button variant="outline" className="w-full h-11 border-dashed" onClick={addPlayer}>
                                <Plus className="mr-2 h-4 w-4" /> Add Another Player
                            </Button>
                        </CardContent>
                        <CardFooter className="flex justify-between pt-4 border-t">
                            <Button variant="ghost" onClick={() => setStep(1)} className="h-11 px-8">
                                <ChevronLeft className="mr-2 h-4 w-4" /> Back
                            </Button>
                            <Button
                                onClick={handleSubmit}
                                disabled={loading || players.filter(p => p.name).length < 5}
                                className="h-11 px-8 font-bold"
                            >
                                {loading ? "Registering..." : "Complete Registration"}
                            </Button>
                        </CardFooter>
                    </>
                )}
            </Card>

            <p className="mt-8 text-center text-sm text-muted-foreground italic">
                * Registration will make your team available for upcoming match scheduling.
            </p>
        </div>
    )
}
