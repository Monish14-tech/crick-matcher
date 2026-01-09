"use client"

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Lock, ArrowRight, ShieldCheck, Activity, Zap, Trophy, Shield, Key } from 'lucide-react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

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
            setErrorMsg('Authentication Failure: Secure Connection Interrupted')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6 relative overflow-hidden">
            {/* Immersive Background Elements */}
            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[150px] -mr-96 -mt-96 opacity-30" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-[100px] -ml-48 -mb-24 opacity-20" />
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="w-full max-w-md relative z-10"
            >
                <div className="text-center mb-10 space-y-4">
                    <div className="inline-flex items-center gap-2 bg-primary/20 text-primary px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-[0.3em] border border-primary/20 mb-4">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Secure Perimeter
                    </div>
                    <h1 className="text-5xl md:text-6xl font-black italic uppercase tracking-tighter text-white leading-none">
                        Arena <span className="text-primary italic">Control</span>
                    </h1>
                    <p className="text-slate-500 font-bold text-xs uppercase tracking-widest leading-relaxed">
                        Authorized Personnel Only / Zero Trust Protocol
                    </p>
                </div>

                <Card className="glass-card-dark border-white/5 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] rounded-[3rem] overflow-hidden">
                    <CardContent className="p-10 md:p-12">
                        <AnimatePresence mode="wait">
                            {errorMsg && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0, y: -20 }}
                                    animate={{ opacity: 1, height: 'auto', y: 0 }}
                                    exit={{ opacity: 0, height: 0, y: -20 }}
                                    className="mb-8 p-4 bg-red-500/10 text-red-500 text-[10px] font-black uppercase tracking-widest rounded-2xl flex items-center gap-3 border border-red-500/20"
                                >
                                    <Lock className="h-4 w-4 shrink-0" />
                                    <span>{errorMsg}</span>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <form onSubmit={handleLogin} className="space-y-8">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 ml-2">Operator Identity</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-slate-600 group-focus-within:text-primary transition-colors">
                                        <Shield className="h-4 w-4" />
                                    </div>
                                    <Input
                                        type="email"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        className="h-16 rounded-[1.25rem] bg-white/2 border-white/5 px-14 font-black text-white italic tracking-tight placeholder:text-slate-700 focus:bg-white/5 focus:border-primary/30 transition-all outline-none"
                                        placeholder="ADMIN@ARENA.NET"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 ml-2">Encryption Key</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-slate-600 group-focus-within:text-primary transition-colors">
                                        <Key className="h-4 w-4" />
                                    </div>
                                    <Input
                                        type="password"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        className="h-16 rounded-[1.25rem] bg-white/2 border-white/5 px-14 font-black text-white italic tracking-tight placeholder:text-slate-700 focus:bg-white/5 focus:border-primary/30 transition-all outline-none"
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>
                            </div>

                            <Button
                                type="submit"
                                className="w-full h-16 bg-primary hover:bg-primary/90 text-white font-black italic uppercase tracking-[0.2em] rounded-[1.25rem] shadow-[0_12px_24px_-8px_rgba(37,99,235,0.5)] hover:scale-[1.02] active:scale-[0.98] transition-all relative overflow-hidden group"
                                disabled={loading}
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                                <span className="flex items-center justify-center gap-3">
                                    {loading ? (
                                        <>
                                            <Activity className="h-5 w-5 animate-spin" />
                                            Authenticating
                                        </>
                                    ) : (
                                        <>
                                            Deploy Control Center
                                            <Zap className="h-4 w-4 fill-white" />
                                        </>
                                    )}
                                </span>
                            </Button>
                        </form>
                    </CardContent>

                    <div className="bg-white/2 border-t border-white/5 p-8 flex flex-col items-center gap-4">
                        <Link href="/" className="group flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 hover:text-primary transition-all">
                            <ArrowRight className="h-3.5 w-3.5 rotate-180 group-hover:-translate-x-1 transition-transform" />
                            Return to Public Grid
                        </Link>
                        <div className="flex items-center gap-6 opacity-20">
                            <Trophy className="h-5 w-5 text-white" />
                            <Activity className="h-5 w-5 text-white" />
                            <ShieldCheck className="h-5 w-5 text-white" />
                        </div>
                    </div>
                </Card>

                <p className="mt-8 text-center text-[10px] font-black uppercase tracking-[0.5em] text-slate-700">
                    © 2026 CRICK MATCHER INTELLIGENCE
                </p>
            </motion.div>
        </div>
    )
}
