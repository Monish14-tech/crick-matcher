"use client"
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardContent, CardTitle, CardFooter } from '@/components/ui/card'
import { Lock, ArrowRight, ShieldCheck } from 'lucide-react'
import Link from 'next/link'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [errorMsg, setErrorMsg] = useState('')
    const router = useRouter()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setErrorMsg('')

        try {
            const { error } = await supabase.auth.signInWithPassword({ email, password })
            if (error) {
                setErrorMsg(error.message)
            } else {
                router.push('/admin')
            }
        } catch (err) {
            setErrorMsg('Authentication failed')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <Card className="w-full max-w-md shadow-2xl rounded-[2.5rem] border-none overflow-hidden bg-white">
                <CardHeader className="bg-slate-900 text-white p-10 text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-10 -mt-10" />
                    <div className="relative z-10">
                        <div className="mx-auto w-20 h-20 bg-white overflow-hidden rounded-[1.5rem] flex items-center justify-center mb-6 shadow-xl">
                            <img
                                src="https://img.freepik.com/premium-vector/logo-cricket-club-dark-blue-background_549850-1296.jpg?semt=ais_hybrid&w=740&q=80"
                                alt="Crick Matcher Admin"
                                className="h-full w-full object-cover"
                            />
                        </div>
                        <CardTitle className="text-3xl font-black italic tracking-tighter mb-2">Admin Portal</CardTitle>
                        <p className="text-sm opacity-60 font-medium">Enter your credentials to manage the league.</p>
                    </div>
                </CardHeader>
                <CardContent className="p-10">
                    {errorMsg && (
                        <div className="mb-6 p-4 bg-red-50 text-red-600 text-sm font-bold rounded-xl flex items-center gap-2 border border-red-100">
                            <Lock className="h-4 w-4" /> {errorMsg}
                        </div>
                    )}
                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Email</label>
                            <Input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="h-14 rounded-2xl bg-slate-50 border-slate-200 px-4 font-bold"
                                placeholder="admin@league.com"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Password</label>
                            <Input
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="h-14 rounded-2xl bg-slate-50 border-slate-200 px-4 font-bold"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                        <Button type="submit" className="w-full h-14 font-black rounded-2xl text-lg shadow-xl shadow-primary/20 hover:scale-[1.02] transition-transform" disabled={loading}>
                            {loading ? "Authenticating..." : "Login to Dashboard"}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="p-8 pt-0 text-center justify-center">
                    <Link href="/" className="text-xs font-bold text-muted-foreground hover:text-primary flex items-center gap-2 transition-colors">
                        <ArrowRight className="h-4 w-4 rotate-180" /> Back to Public Site
                    </Link>
                </CardFooter>
            </Card>
        </div>
    )
}
