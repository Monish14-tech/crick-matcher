"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { MapPin, Image as ImageIcon, CheckCircle2, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/supabase"
import { SupabaseError } from "@/components/SupabaseError"
import Link from "next/link"

export default function NewGroundPage() {
    if (!supabase) return <SupabaseError />
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)

    const [groundData, setGroundData] = useState({
        name: "",
        location: "",
        image_url: ""
    })

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setGroundData(prev => ({ ...prev, [e.target.name]: e.target.value }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            const { error } = await supabase
                .from("grounds")
                .insert([groundData])

            if (error) throw error

            setSuccess(true)
            setTimeout(() => {
                router.push("/admin")
            }, 2000)
        } catch (error: any) {
            console.error("Error registering ground:", error.message)
            alert("Error: " + error.message)
        } finally {
            setLoading(false)
        }
    }

    if (success) {
        return (
            <div className="min-h-[70vh] flex items-center justify-center p-4">
                <Card className="max-w-md w-full text-center p-8 space-y-6">
                    <div className="flex justify-center">
                        <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                            <CheckCircle2 className="h-12 w-12" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl">Ground Registered!</CardTitle>
                    <p className="text-muted-foreground">The venue is now available for match scheduling.</p>
                </Card>
            </div>
        )
    }

    return (
        <div className="max-w-2xl mx-auto px-4 py-12">
            <Link href="/admin" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-8 transition-colors">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
            </Link>

            <div className="mb-10 space-y-2">
                <h1 className="text-3xl font-extrabold tracking-tight">Register New Ground</h1>
                <p className="text-muted-foreground">Add a cricket stadium or local ground to the system.</p>
            </div>

            <Card className="shadow-lg border-primary/10">
                <form onSubmit={handleSubmit}>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <MapPin className="h-5 w-5 text-primary" />
                            Venue Details
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="name">Ground Name</Label>
                            <Input
                                id="name"
                                name="name"
                                placeholder="e.g. Lords Cricket Ground"
                                required
                                value={groundData.name}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="location">Location / City</Label>
                            <Input
                                id="location"
                                name="location"
                                placeholder="e.g. London, UK"
                                required
                                value={groundData.location}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="image_url">Image URL (Optional)</Label>
                            <Input
                                id="image_url"
                                name="image_url"
                                placeholder="https://example.com/stadium.jpg"
                                value={groundData.image_url}
                                onChange={handleChange}
                            />
                        </div>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-4 border-t pt-6 bg-slate-50/50">
                        <Button
                            type="submit"
                            className="w-full h-12 font-bold text-lg"
                            disabled={loading}
                        >
                            {loading ? "Registering..." : "Add Ground"}
                        </Button>
                        <p className="text-xs text-center text-muted-foreground">
                            Multiple grounds can be scheduled for different matches on the same day.
                        </p>
                    </CardFooter>
                </form>
            </Card>
        </div>
    )
}
