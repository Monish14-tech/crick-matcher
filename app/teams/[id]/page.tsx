"use client"

import { useEffect, useState, use } from "react"
import { Trophy, Users, Mail, Phone, ArrowLeft, Shield, User, Star, Zap, Target, Swords, Activity, Award, UserPlus, ArrowRight, ExternalLink, BarChart3 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import { SupabaseError } from "@/components/SupabaseError"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"

interface Team {
    id: string
    name: string
    captain_name: string
    contact_number: string
    logo_url?: string
}

interface Player {
    id: string
    name: string
    role: string
}

export default function TeamDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    if (!supabase) return <SupabaseError />

    const { id } = use(params)
    const [team, setTeam] = useState<Team | null>(null)
    const [players, setPlayers] = useState<Player[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchTeamDetails() {
            setLoading(true)
            try {
                const { data: teamData, error: teamError } = await supabase
                    .from('teams')
                    .select('*')
                    .eq('id', id)
                    .single()

                if (teamError) throw teamError

                const { data: playersData, error: playersError } = await supabase
                    .from('players')
                    .select('*')
                    .eq('team_id', id)

                if (playersError) console.error(playersError)

                setTeam(teamData)
                setPlayers(playersData || [])
            } catch (err) {
                console.error(err)
            } finally {
                setLoading(false)
            }
        }

        fetchTeamDetails()
    }, [id])

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-8">
                <div className="relative">
                    <Trophy className="h-16 w-16 text-primary animate-bounce shadow-[0_0_30px_theme(colors.primary)]" />
                    <div className="absolute inset-0 bg-primary blur-3xl opacity-20 animate-pulse" />
                </div>
                <div className="space-y-2 text-center">
                    <h2 className="text-xl font-black italic uppercase tracking-tighter text-white">Mobilizing Franchise</h2>
                    <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">Accessing Secure Records...</p>
                </div>
            </div>
        )
    }

    if (!team) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-4 text-center">
                <div className="h-24 w-24 bg-white/5 rounded-full flex items-center justify-center mb-8 border border-white/10">
                    <Shield className="h-10 w-10 text-slate-700" />
                </div>
                <h1 className="text-4xl font-black italic uppercase text-white mb-2">Franchise <span className="text-primary italic">Missing</span></h1>
                <p className="text-slate-500 font-bold max-w-sm mb-10 text-sm">The requested identity has been archived or does not exist in the current circuit.</p>
                <Button asChild className="h-16 px-8 rounded-2xl font-black italic uppercase tracking-widest bg-primary hover:scale-105 transition-all">
                    <Link href="/teams" className="flex items-center gap-2">
                        <ArrowLeft className="h-4 w-4" /> Back to Collective
                    </Link>
                </Button>
            </div>
        )
    }

    const teamStats = {
        total: players.length,
        batsmen: players.filter(p => p.role?.includes('Batsman') || p.role?.includes('Batter')).length,
        bowlers: players.filter(p => p.role?.includes('Bowler')).length,
        allRounders: players.filter(p => p.role?.includes('All-Rounder')).length,
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 pb-32">
            {/* Immersive Team Hero */}
            <div className="relative pt-32 pb-48 overflow-hidden">
                <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[150px] -mr-96 -mt-96 opacity-50" />
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-[100px] -ml-48 -mb-24" />

                <div className="max-w-7xl mx-auto px-4 relative z-10">
                    <Link href="/teams" className="inline-flex items-center text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 hover:text-primary mb-12 transition-all group">
                        <ArrowLeft className="mr-2 h-3.5 w-3.5 group-hover:-translate-x-1 transition-transform" />
                        The Collective / All Franchises
                    </Link>

                    <div className="flex flex-col md:flex-row items-center gap-12 md:gap-20">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
                            animate={{ opacity: 1, scale: 1, rotate: 0 }}
                            className="relative"
                        >
                            <div className="h-56 w-56 bg-white/5 rounded-[3rem] flex items-center justify-center text-7xl font-black text-white italic border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] group overflow-hidden">
                                {team.logo_url ? (
                                    <img src={team.logo_url} alt={team.name} className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                ) : (
                                    <span className="text-gradient-primary">{team.name[0]}</span>
                                )}
                                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <div className="absolute -bottom-6 -right-6 h-20 w-20 bg-primary rounded-3xl flex items-center justify-center border-[6px] border-slate-950 shadow-2xl animate-float">
                                <Shield className="h-8 w-8 text-white" />
                            </div>
                        </motion.div>

                        <div className="text-center md:text-left space-y-8">
                            <div className="space-y-2">
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="inline-flex items-center gap-2 bg-primary/20 text-primary px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-[0.3em] border border-primary/20"
                                >
                                    <Activity className="h-3.5 w-3.5 animate-pulse" />
                                    Active Franchise
                                </motion.div>
                                <h1 className="text-6xl md:text-8xl font-black italic uppercase tracking-tighter leading-[0.85] text-white">
                                    {team.name}
                                </h1>
                            </div>

                            <div className="flex flex-wrap justify-center md:justify-start gap-8">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Designated Captain</p>
                                    <div className="flex items-center gap-3">
                                        <div className="h-3 w-3 rounded-full bg-primary" />
                                        <span className="text-2xl font-black italic uppercase tracking-tighter text-white">{team.captain_name}</span>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Secure Direct Line</p>
                                    <div className="flex items-center gap-3">
                                        <div className="h-3 w-3 rounded-full bg-white/20" />
                                        <span className="text-2xl font-black italic uppercase tracking-tighter text-slate-300">{team.contact_number}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 -mt-24 relative z-20">
                <div className="grid lg:grid-cols-4 gap-8">
                    {/* Left Panel: Analytics */}
                    <div className="space-y-8">
                        <Card className="glass-card-dark border-white/5 p-8 rounded-[2.5rem] shadow-2xl overflow-hidden relative">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full -mr-12 -mt-12 blur-2xl" />
                            <div className="relative z-10 space-y-8">
                                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Squad Analytics</h3>
                                    <BarChart3 className="h-4 w-4 text-primary" />
                                </div>
                                <div className="space-y-6">
                                    <SmallStat label="Deployment Strength" value={teamStats.total} icon={<Users className="h-4 w-4" />} />
                                    <SmallStat label="Batsmen Precision" value={teamStats.batsmen} icon={<Zap className="h-4 w-4" />} />
                                    <SmallStat label="Bowler Intensity" value={teamStats.bowlers} icon={<Target className="h-4 w-4" />} />
                                    <SmallStat label="Versatility Factor" value={teamStats.allRounders} icon={<Swords className="h-4 w-4" />} />
                                </div>
                            </div>
                        </Card>

                        <Card className="glass-card-dark border-white/5 p-10 rounded-[2.5rem] shadow-2xl text-center bg-gradient-to-b from-slate-900/60 to-primary/10 transition-all group overflow-hidden">
                            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
                            <Star className="h-10 w-10 mx-auto text-primary mb-4 animate-float fill-primary group-hover:scale-125 transition-transform" />
                            <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 mb-1">Franchise Support</h4>
                            <p className="text-xl font-black italic uppercase italic text-white mb-6">Contact Manager</p>
                            <Button className="w-full h-14 rounded-xl bg-primary hover:scale-105 transition-all font-black uppercase tracking-widest text-[10px]" asChild>
                                <a href={`tel:${team.contact_number}`}>Secure Connection</a>
                            </Button>
                        </Card>
                    </div>

                    {/* Right Panel: Player Grid */}
                    <div className="lg:col-span-3 space-y-10">
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-4">
                            <div className="space-y-1">
                                <div className="h-1 w-12 bg-primary rounded-full mb-3" />
                                <h2 className="text-4xl font-black italic uppercase tracking-tighter text-white">Combat <span className="text-primary italic">Roster</span></h2>
                                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">{teamStats.total} Elite Units Identified</p>
                            </div>
                            <Button className="h-12 px-6 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-[0.4em] hover:bg-white/10 transition-all">
                                Filter Roles
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            <AnimatePresence>
                                {players.map((player, idx) => (
                                    <motion.div
                                        key={player.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                    >
                                        <Card className="glass-card-dark border-white/5 p-6 rounded-[2rem] hover:border-primary/50 transition-all duration-500 group relative overflow-hidden h-32 flex items-center">
                                            <div className="absolute right-0 top-0 h-full w-12 bg-white/2 skew-x-[-20deg] translate-x-12 group-hover:translate-x-6 transition-transform duration-700" />

                                            <div className="flex items-center gap-6 relative z-10 w-full">
                                                <div className="h-16 w-16 bg-white/5 rounded-2xl flex items-center justify-center text-2xl font-black text-white italic border border-white/10 shadow-xl group-hover:bg-primary group-hover:text-white group-hover:scale-110 transition-all duration-500">
                                                    {player.name[0]}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="text-xl font-black italic uppercase tracking-tighter text-white truncate group-hover:text-primary transition-colors">{player.name}</h3>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        {getRoleIcon(player.role)}
                                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">{player.role || "Elite Player"}</span>
                                                    </div>
                                                </div>
                                                <ArrowRight className="h-4 w-4 text-slate-800 group-hover:text-primary transition-all opacity-0 group-hover:opacity-100 -translate-x-4 group-hover:translate-x-0" />
                                            </div>
                                        </Card>
                                    </motion.div>
                                ))}
                            </AnimatePresence>

                            {players.length === 0 && (
                                <div className="col-span-full py-32 text-center rounded-[3rem] border-2 border-dashed border-white/5 bg-white/2">
                                    <UserPlus className="h-16 w-16 mx-auto mb-6 text-slate-800 animate-pulse" />
                                    <h4 className="text-2xl font-black italic uppercase text-slate-400">Roster Unassigned</h4>
                                    <p className="text-slate-600 font-bold max-w-xs mx-auto text-sm mt-2">No active units discovered in this franchise sector yet.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

function SmallStat({ label, value, icon }: { label: string, value: number, icon: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between group">
            <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-500 group-hover:text-primary group-hover:bg-primary/10 transition-all">
                    {icon}
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-slate-200 transition-colors">{label}</span>
            </div>
            <span className="text-2xl font-black italic text-white tracking-tighter group-hover:scale-125 transition-transform">{value}</span>
        </div>
    )
}

function getRoleIcon(role: string) {
    const r = role?.toLowerCase() || ''
    if (r.includes('bat')) return <Zap className="h-2.5 w-2.5 text-amber-500" />
    if (r.includes('bowl')) return <Target className="h-2.5 w-2.5 text-red-500" />
    if (r.includes('all')) return <Swords className="h-2.5 w-2.5 text-blue-500" />
    return <Award className="h-2.5 w-2.5 text-emerald-500" />
}
