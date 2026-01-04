"use client"

import { useEffect, useState } from "react"
import { MapPin, Search, Calendar, CheckCircle2, Navigation } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabase"
import Link from "next/link"

interface Ground {
    id: string
    name: string
    location: string
    image_url?: string
}

export default function GroundsPage() {
    const [grounds, setGrounds] = useState<Ground[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchGrounds() {
            if (!supabase) {
                setLoading(false)
                return
            }
            const { data, error } = await supabase.from('grounds').select('*')
            if (error) console.error(error)
            else setGrounds(data || [])
            setLoading(false)
        }
        fetchGrounds()
    }, [])

    return (
        <div className="max-w-7xl mx-auto px-4 py-12">
            <div className="mb-12 space-y-4">
                <h1 className="text-4xl font-extrabold tracking-tight">Cricket Grounds</h1>
                <p className="text-muted-foreground max-w-2xl">Discover and book the best venues for your next match. From professional stadiums to local club grounds.</p>
            </div>

            {!supabase ? (
                <div className="bg-slate-50 border p-12 rounded-3xl text-center">
                    <MapPin className="h-12 w-12 mx-auto mb-4 opacity-20 text-primary" />
                    <h3 className="text-xl font-bold">Database Connection Required</h3>
                    <p className="text-muted-foreground mt-2">Connect your Supabase account to see live ground availability.</p>
                </div>
            ) : loading ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {[1, 2, 3].map(i => <div key={i} className="h-80 bg-muted animate-pulse rounded-2xl" />)}
                </div>
            ) : grounds.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {grounds.map((ground) => (
                        <Card key={ground.id} className="overflow-hidden group hover:border-primary transition-all">
                            <div className="aspect-video bg-slate-200 relative overflow-hidden">
                                {ground.image_url ? (
                                    <img src={ground.image_url} alt={ground.name} className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-500" />
                                ) : (
                                    <div className="flex items-center justify-center h-full text-slate-400">
                                        <MapPin className="h-12 w-12" />
                                    </div>
                                )}
                                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 shadow-sm">
                                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                                    Available
                                </div>
                            </div>
                            <CardHeader>
                                <CardTitle>{ground.name}</CardTitle>
                                <div className="flex items-center text-sm text-muted-foreground gap-1">
                                    <Navigation className="h-3 w-3" />
                                    <span>{ground.location}</span>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground">
                                    <span className="bg-slate-100 px-2 py-1 rounded">Floodlights</span>
                                    <span className="bg-slate-100 px-2 py-1 rounded">Pavilion</span>
                                    <span className="bg-slate-100 px-2 py-1 rounded">Turf Pitch</span>
                                </div>
                            </CardContent>
                            <CardFooter className="border-t pt-4">
                                <Button className="w-full font-bold" asChild>
                                    <Link href="/admin/matches/new">Schedule Here</Link>
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 bg-muted/20 border-2 border-dashed rounded-3xl">
                    <MapPin className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p className="text-muted-foreground">No grounds have been registered yet.</p>
                    <Button variant="outline" className="mt-4" asChild>
                        <Link href="/admin/grounds/new">Register Ground (Admin)</Link>
                    </Button>
                </div>
            )}
        </div>
    )
}
