"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"
import { Trophy, Calendar, MapPin, Users, ArrowRight, Play, CheckCircle2, Activity, Zap, Clock, Shield, TrendingUp, Swords } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { supabase } from "@/lib/supabase"
import { motion, AnimatePresence } from "framer-motion"
import { FeaturedMatchesCarousel } from "@/components/FeaturedMatchesCarousel"
import { SlidingTicker } from "@/components/SlidingTicker"
import { Odometer } from "@/components/Odometer"
import { SlidingTeams } from "@/components/SlidingTeams"
import { cn } from "@/lib/utils"

interface Match {
  id: string
  match_date: string
  match_time: string
  overs_type: string
  status: string
  team_a: { name: string }
  team_b: { name: string }
  ground: { name: string }
  scores?: any[]
}

export default function Home() {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [completedCount, setCompletedCount] = useState(0)
  const [teamCount, setTeamCount] = useState(0)

  useEffect(() => {
    async function fetchStats() {
      const { count: matchCount } = await supabase
        .from('matches')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Completed')
      setCompletedCount(matchCount || 0)

      const { count: tCount } = await supabase
        .from('teams')
        .select('*', { count: 'exact', head: true })
      setTeamCount(tCount || 0)
    }
    fetchStats()

    async function fetchMatches() {
      if (!supabase) {
        setLoading(false)
        return
      }

      const { data: matchData } = await supabase
        .from('matches')
        .select(`
          *,
          team_a:teams!team_a_id(id, name),
          team_b:teams!team_b_id(id, name),
          ground:grounds(name)
        `)
        .in('status', ['Scheduled', 'Live', 'Completed'])
        .order('match_date', { ascending: false })
        .limit(12)

      if (matchData) {
        const matchIds = matchData.map((m: any) => m.id)
        const { data: scoreData } = await supabase
          .from('match_scores')
          .select('*')
          .in('match_id', matchIds)

        const matchesWithScores = (matchData || []).map((m: any) => ({
          ...m,
          scores: scoreData?.filter((s: any) => s.match_id === m.id) || []
        }))
        setMatches(matchesWithScores as any)
      }
      setLoading(false)
    }

    fetchMatches()
    const interval = setInterval(fetchMatches, 2000)
    return () => clearInterval(interval)
  }, [])

  const liveMatches = matches.filter(m => m.status === 'Live')
  const scheduledMatches = matches.filter(m => m.status === 'Scheduled').slice(0, 6)

  return (
    <div className="flex flex-col gap-0 pb-32 overflow-hidden bg-slate-950 text-slate-100">

      {/* Dynamic Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/10 rounded-full blur-[120px]" />
      </div>

      {/* Top Banner Ticker */}
      <div className="z-50 relative border-b border-white/5 bg-slate-900/50 backdrop-blur-md">
        <SlidingTicker />
      </div>

      {/* HERO SECTION - The Big Stage */}
      <section className="relative min-h-[70vh] md:min-h-[90vh] flex items-center pt-16 md:pt-20 pb-12 md:pb-20 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 w-full">
          <div className="grid lg:grid-cols-2 gap-8 md:gap-16 items-center">

            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="space-y-10"
            >
              <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl backdrop-blur-md">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_theme(colors.emerald.500)]" />
                <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] text-emerald-400">System Live & Operational</span>
              </div>

              <div className="space-y-3 sm:space-y-4">
                <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-9xl font-black italic tracking-tighter leading-[0.85] uppercase">
                  UNLEASH <br />
                  <span className="text-gradient-cricket">PRECISION.</span>
                </h1>
                <p className="text-base sm:text-lg md:text-xl text-slate-400 font-medium max-w-lg leading-relaxed">
                  The ultimate arena for local cricket. Capture every run, wicket, and momentum shift with our world-class scoring engine.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4">
                <Button size="lg" className="h-14 sm:h-16 px-8 sm:px-10 text-base sm:text-lg font-black rounded-xl sm:rounded-2xl bg-white text-slate-950 hover:bg-slate-200 shadow-[0_20px_40px_-12px_rgba(255,255,255,0.2)] transition-all hover:scale-105" asChild>
                  <Link href="/teams/register">
                    REGISTER TEAM <Shield className="ml-2 h-4 sm:h-5 w-4 sm:w-5 fill-current" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="h-14 sm:h-16 px-8 sm:px-10 text-base sm:text-lg font-black rounded-xl sm:rounded-2xl border-2 border-white/10 bg-white/5 backdrop-blur-md hover:bg-white/10 transition-all font-outfit" asChild>
                  <Link href="#next-battles">FIXTURES</Link>
                </Button>
              </div>

              <div className="flex items-center gap-4 sm:gap-8 pt-6 sm:pt-8 border-t border-white/5">
                <div>
                  <div className="text-2xl sm:text-3xl font-black italic leading-none"><Odometer value={teamCount} /></div>
                  <div className="text-[8px] sm:text-[10px] font-bold uppercase tracking-wider sm:tracking-widest text-slate-500 mt-1 sm:mt-2">ACTIVE FRANCHISES</div>
                </div>
                <div className="h-8 sm:h-10 w-px bg-white/10" />
                <div>
                  <div className="text-2xl sm:text-3xl font-black italic leading-none">99.9%</div>
                  <div className="text-[8px] sm:text-[10px] font-bold uppercase tracking-wider sm:tracking-widest text-slate-500 mt-1 sm:mt-2">SYNC ACCURACY</div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9, rotate: 2 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ duration: 1, delay: 0.2 }}
              className="relative w-full mt-20 lg:mt-0 lg:translate-x-20"
            >
              <div className="relative z-10 glass-card-dark p-4 md:p-6 rounded-[2.5rem] md:rounded-[3rem] shadow-2xl lg:scale-110">
                <FeaturedMatchesCarousel />
              </div>
              {/* Decorative Rings */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] border border-white/5 rounded-full pointer-events-none hidden md:block" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140%] h-[140%] border border-white/5 rounded-full pointer-events-none opacity-50 hidden md:block" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* LIVE ACTION BAR */}
      <AnimatePresence>
        {liveMatches.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative z-20 -mt-10 mb-20 px-4"
          >
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center gap-3 mb-6 px-4">
                <span className="h-3 w-3 rounded-full bg-rose-500 animate-ping" />
                <h2 className="text-xs font-black uppercase tracking-[0.4em] text-white">Live Broadcast Network</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {liveMatches.map(match => (
                  <LiveMatchStrip key={match.id} match={match} />
                ))}
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* TEAM SHOWCASE SLIDER */}
      <section className="py-20 bg-slate-900/30 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-4 mb-10 text-center">
          <h2 className="text-xs font-black uppercase tracking-[0.5em] text-slate-500 mb-2">The Pro Circuit</h2>
          <p className="text-3xl font-black italic uppercase tracking-tighter">Elite Rosters Online</p>
        </div>
        <SlidingTeams />
      </section>

      {/* NEXT FIXTURES GRID */}
      <section id="next-battles" className="py-32 relative">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-16">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full border border-primary/20">
                <Calendar className="h-3 w-3 text-primary" />
                <span className="text-[10px] font-black uppercase tracking-widest text-primary">Season Schedule</span>
              </div>
              <h2 className="text-5xl md:text-6xl font-black italic uppercase tracking-tighter">Next <span className="text-slate-500">Battles</span></h2>
            </div>
            <Button variant="ghost" className="h-14 px-8 rounded-2xl font-black text-slate-400 hover:text-white transition-colors" asChild>
              <Link href="/schedule">VIEW CALENDAR <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {loading ? (
              [1, 2, 3].map(i => <div key={i} className="h-64 rounded-[2.5rem] bg-white/5 animate-pulse border border-white/5" />)
            ) : scheduledMatches.length > 0 ? (
              scheduledMatches.map(match => (
                <ScheduledMatchCard key={match.id} match={match} />
              ))
            ) : (
              <div className="col-span-full py-20 text-center border-2 border-dashed border-white/5 rounded-[3.5rem] bg-white/2">
                <p className="text-slate-500 font-black italic uppercase text-lg mb-6">Circuit is currently silent...</p>
                <Button className="h-14 px-10 rounded-2xl font-black italic uppercase tracking-widest bg-primary hover:scale-105 transition-all" asChild>
                  <Link href="/teams/register">Establish Your Franchise</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* QUICK CORE ACTIONS */}
      <section className="max-w-7xl mx-auto px-4 py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <CoreActionCard
            icon={Shield}
            title="Team Forge"
            desc="Deploy pro squads and manage roster dynamics."
            link="/teams/register"
            color="from-blue-600 to-indigo-700"
          />
          <CoreActionCard
            icon={Activity}
            title="Live Arbitration"
            desc="Real-time match scoring and ball-by-ball logic."
            link="/admin"
            color="from-amber-500 to-orange-600"
          />
          <CoreActionCard
            icon={Trophy}
            title="Tournament Arena"
            desc="Construct leagues and dominate professional circuits."
            link="/admin"
            color="from-emerald-500 to-teal-600"
          />
        </div>
      </section>

      {/* FINAL CTA - IMMERSIVE OVERLAY */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-12 sm:pt-20">
        <motion.div
          whileHover={{ scale: 1.01 }}
          className="relative rounded-[2rem] sm:rounded-[3rem] md:rounded-[4rem] overflow-hidden bg-gradient-to-br from-primary via-indigo-700 to-slate-900 min-h-[400px] sm:min-h-[500px] flex items-center p-6 sm:p-8 md:p-20 shadow-2xl"
        >
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 pointer-events-none" />
          <div className="relative z-10 w-full grid md:grid-cols-2 gap-8 sm:gap-12 items-center">
            <div className="space-y-4 sm:space-y-8">
              <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black italic uppercase leading-[0.85] tracking-tighter">
                DIGITIZE <br />THE GLORY.
              </h2>
              <p className="text-sm sm:text-base md:text-lg font-medium opacity-80 leading-relaxed max-w-md">
                Professional-grade scoring, real-time broadcasting, and deep analytics. Everything you need to manage local cricket at a global standard.
              </p>
            </div>
            <div className="flex justify-center md:justify-end">
              <Button size="lg" className="h-16 sm:h-20 md:h-24 w-full md:w-auto px-12 sm:px-14 md:px-16 text-lg sm:text-xl md:text-2xl font-black rounded-xl sm:rounded-2xl bg-white text-slate-950 hover:bg-slate-100 shadow-2xl transition-all active:scale-95" asChild>
                <Link href="/teams/register">JOIN NOW</Link>
              </Button>
            </div>
          </div>
        </motion.div>
      </section>
    </div>
  )
}

function LiveMatchStrip({ match }: { match: Match }) {
  const scoreA = match.scores?.find((s: any) => s.team_id === (match as any).team_a_id)
  const scoreB = match.scores?.find((s: any) => s.team_id === (match as any).team_b_id)

  return (
    <Link href={`/matches/${match.id}`} className="block group">
      <div className="glass-card-dark p-6 rounded-[2.5rem] border-white/10 hover:border-primary/50 transition-all hover:scale-[1.02] shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" /> Live Now
          </span>
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{match.overs_type} Series</span>
        </div>

        <div className="flex justify-between items-center gap-4">
          <div className="flex-1 space-y-2">
            <p className="font-black text-xl italic uppercase tracking-tighter leading-none">{match.team_a.name}</p>
            <p className="text-2xl font-black text-primary leading-none">
              {scoreA ? `${scoreA.runs_scored}/${scoreA.wickets_lost}` : '0/0'}
            </p>
          </div>
          <div className="w-px h-12 bg-white/5 shrink-0" />
          <div className="flex-1 text-right space-y-2">
            <p className="font-black text-xl italic uppercase tracking-tighter leading-none">{match.team_b.name}</p>
            <p className="text-2xl font-black text-slate-400 leading-none">
              {scoreB ? `${scoreB.runs_scored}/${scoreB.wickets_lost}` : '0/0'}
            </p>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-white/5 flex justify-between items-center">
          <div className="flex items-center gap-2 text-slate-500 italic text-[10px] font-bold">
            <MapPin className="h-3 w-3" /> {match.ground.name}
          </div>
          <ArrowRight className="h-4 w-4 text-primary group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </Link>
  )
}

function ScheduledMatchCard({ match }: { match: Match }) {
  return (
    <Link href={`/matches/${match.id}`} className="group">
      <Card className="glass-card-dark border-white/5 hover:border-white/20 p-8 rounded-[3rem] h-full flex flex-col justify-between transition-all hover:-translate-y-2 bg-slate-900/40">
        <div className="flex justify-between items-start mb-10">
          <div className="bg-white/5 rounded-xl px-4 py-2 border border-white/5 text-center min-w-[60px]">
            <p className="text-[10px] font-black text-slate-500 uppercase leading-none mb-1">
              {new Date(match.match_date).toLocaleDateString('en-GB', { month: 'short' })}
            </p>
            <p className="text-2xl font-black leading-none italic">
              {new Date(match.match_date).getDate()}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-1">Fixture Start</p>
            <p className="text-sm font-black italic">{match.match_time?.slice(0, 5)} HRS</p>
          </div>
        </div>

        <div className="flex items-center gap-6 mb-10">
          <div className="flex-1 space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center font-black italic text-lg">{match.team_a.name[0]}</div>
            <p className="font-black uppercase italic tracking-tighter text-lg leading-tight">{match.team_a.name}</p>
          </div>
          <p className="text-4xl font-black italic opacity-10">VS</p>
          <div className="flex-1 text-right space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center font-black italic text-lg ml-auto">{match.team_b.name[0]}</div>
            <p className="font-black uppercase italic tracking-tighter text-lg leading-tight">{match.team_b.name}</p>
          </div>
        </div>

        <div className="pt-6 border-t border-white/5 flex items-center gap-3 text-slate-500">
          <MapPin className="h-4 w-4 text-primary" />
          <span className="text-[10px] font-black uppercase tracking-widest truncate">{match.ground.name}</span>
        </div>
      </Card>
    </Link>
  )
}

function CoreActionCard({ icon: Icon, title, desc, link, color }: any) {
  return (
    <Link href={link} className="group">
      <div className="glass-card-dark p-8 rounded-[3rem] border-white/5 hover:border-white/10 transition-all h-full bg-slate-900/40">
        <div className={cn("h-16 w-16 rounded-[1.5rem] bg-gradient-to-br flex items-center justify-center text-white mb-8 group-hover:scale-110 transition-transform shadow-xl", color)}>
          <Icon className="h-8 w-8" />
        </div>
        <h3 className="text-2xl font-black italic uppercase tracking-tighter mb-3">{title}</h3>
        <p className="text-sm text-slate-400 font-medium leading-relaxed mb-6">{desc}</p>
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-primary group-hover:gap-4 transition-all">
          EXPLORE CORE <ArrowRight className="h-4 w-4" />
        </div>
      </div>
    </Link>
  )
}
