"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"
import { Trophy, Calendar, MapPin, Users, ArrowRight, Play, CheckCircle2, Activity, Zap, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { supabase } from "@/lib/supabase"
import { motion } from "framer-motion"
import { FeaturedMatchesCarousel } from "@/components/FeaturedMatchesCarousel"

interface Match {
  id: string
  match_date: string
  match_time: string
  overs_type: string
  status: string
  team_a: { name: string }
  team_b: { name: string }
  ground: { name: string }
}

import { SlidingTicker } from "@/components/SlidingTicker"
import { Odometer } from "@/components/Odometer"
import { SlidingTeams } from "@/components/SlidingTeams"

export default function Home() {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [completedCount, setCompletedCount] = useState(0)

  useEffect(() => {
    async function fetchStats() {
      const { count } = await supabase
        .from('matches')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Completed')

      setCompletedCount(count || 0)
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
        .in('status', ['Scheduled', 'Live'])
        .order('status', { ascending: false }) // Live first
        .order('match_date', { ascending: true })
        .limit(6)

      if (matchData) {
        // Fetch scores for these matches
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

    // Real-time subscription for score updates
    const channel = supabase
      .channel('home-score-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'match_scores' },
        () => fetchMatches()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'matches' },
        () => fetchMatches()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const liveMatches = matches.filter(m => m.status === 'Live')
  const scheduledMatches = matches.filter(m => m.status === 'Scheduled')

  return (
    <div className="flex flex-col gap-0 pb-20 overflow-hidden bg-slate-50">

      {/* Sliding Ticker */}
      <SlidingTicker />

      <div className="flex flex-col gap-20">
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-20 pb-16 md:pt-32 md:pb-24 hero-gradient">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                className="flex flex-col space-y-8"
              >
                <div className="inline-flex items-center space-x-2 bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-full text-primary text-xs font-black uppercase tracking-widest w-fit">
                  <img
                    src="https://img.freepik.com/premium-vector/logo-cricket-club-dark-blue-background_549850-1296.jpg?semt=ais_hybrid&w=740&q=80"
                    alt="Logo"
                    className="h-5 w-5 rounded-full object-cover"
                  />
                  <span>Next-Gen Match Engine</span>
                </div>
                <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-[0.9]">
                  Dominate The <span className="text-primary italic">Pitch.</span>
                </h1>
                <p className="text-xl text-muted-foreground max-w-lg leading-relaxed font-medium">
                  Professional cricket management for the digital era. Schedule, score, and track performance with absolute precision.
                </p>
                <div className="flex flex-col sm:flex-row gap-8 items-center">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Button size="lg" className="h-16 px-10 text-lg font-black rounded-2xl shadow-2xl shadow-primary/20" asChild>
                      <Link href="/teams/register">
                        Register Team <ArrowRight className="ml-2 h-5 w-5" />
                      </Link>
                    </Button>
                    <Button size="lg" variant="outline" className="h-16 px-10 text-lg font-black rounded-2xl border-2 hover:bg-slate-50" asChild>
                      <Link href="/schedule">Match Schedule</Link>
                    </Button>
                  </div>

                  <div className="hidden xl:block h-16 w-px bg-slate-200" />

                  <div className="hidden xl:block">
                    <Odometer value={completedCount} label="Live Games Completed" />
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8 }}
                className="relative"
              >
                <FeaturedMatchesCarousel />
                <div className="absolute -top-12 -right-12 w-48 h-48 bg-primary/20 rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />
              </motion.div>
            </div>
          </div>
        </section>

        {/* Sliding Window (Teams) */}
        <SlidingTeams />


        {/* Live Match Strip */}
        {liveMatches.length > 0 && (
          <section className="w-full">
            <div className="max-w-7xl mx-auto px-4">
              <div className="flex items-center gap-4 mb-8">
                <div className="h-10 w-10 rounded-2xl bg-red-500/10 flex items-center justify-center">
                  <Activity className="h-5 w-5 text-red-500 animate-pulse" />
                </div>
                <h2 className="text-2xl font-black uppercase italic tracking-tighter">Live Broadcasts</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {liveMatches.map(match => {
                  const scoreA = (match as any).scores?.find((s: any) => s.team_id === (match as any).team_a_id)
                  const scoreB = (match as any).scores?.find((s: any) => s.team_id === (match as any).team_b_id)

                  return (
                    <Link key={match.id} href={`/matches/${match.id}`}>
                      <Card className="bg-slate-900 text-white border-none shadow-2xl rounded-[2rem] overflow-hidden group hover:scale-[1.02] transition-transform">
                        <CardContent className="p-8 flex items-center justify-between gap-8">
                          <div className="flex-1 text-center">
                            <p className="text-xl font-black tracking-tighter">{(match as any).team_a.name}</p>
                            <p className="text-2xl font-black text-primary mt-1">{scoreA ? `${scoreA.runs_scored}/${scoreA.wickets_lost}` : '0/0'}</p>
                          </div>
                          <div className="flex flex-col items-center gap-2">
                            <div className="px-4 py-1 bg-red-500 rounded-full text-[10px] font-black uppercase animate-pulse">LIVE</div>
                            <div className="text-4xl font-black italic opacity-20">VS</div>
                          </div>
                          <div className="flex-1 text-center">
                            <p className="text-xl font-black tracking-tighter">{(match as any).team_b.name}</p>
                            <p className="text-2xl font-black text-primary mt-1">{scoreB ? `${scoreB.runs_scored}/${scoreB.wickets_lost}` : '0/0'}</p>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  )
                })}
              </div>
            </div>
          </section>
        )}

        {/* Quick Actions */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard icon={Users} title="Team Forge" description="Register pro squads and manage roster dynamics." link="/teams/register" accent="blue" />
            <FeatureCard icon={Zap} title="Live Scoring" description="Real-time match arbitration and analytics." link="/schedule" accent="amber" />
            <FeatureCard icon={Trophy} title="League Matches" description="Scale from casual games to pro tournaments." link="/tournament" accent="indigo" />
          </div>
        </section>

        {/* Upcoming Matches */}
        <section className="py-12 w-full">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-end mb-12">
              <div className="space-y-1">
                <h2 className="text-4xl font-black italic tracking-tighter uppercase">Next Fixtures</h2>
                <p className="text-muted-foreground font-medium">The local circuit schedule</p>
              </div>
              <Button variant="ghost" className="rounded-xl font-bold" asChild>
                <Link href="/schedule">Full Calendar <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex flex-col gap-4 p-8 bg-white rounded-[2.5rem] shadow-sm border border-slate-100">
                    <div className="h-4 w-24 bg-slate-100 animate-pulse rounded-full" />
                    <div className="flex justify-between items-center py-4">
                      <div className="h-16 w-16 bg-slate-100 animate-pulse rounded-2xl" />
                      <div className="h-4 w-8 bg-slate-100 animate-pulse rounded-full" />
                      <div className="h-16 w-16 bg-slate-100 animate-pulse rounded-2xl" />
                    </div>
                    <div className="h-px w-full bg-slate-100" />
                    <div className="space-y-2">
                      <div className="h-3 w-32 bg-slate-100 animate-pulse rounded-full" />
                      <div className="h-3 w-48 bg-slate-100 animate-pulse rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : scheduledMatches.length > 0 ? (
              <motion.div
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
                variants={{
                  hidden: { opacity: 0 },
                  show: {
                    opacity: 1,
                    transition: { staggerChildren: 0.1 }
                  }
                }}
                className="grid grid-cols-1 md:grid-cols-3 gap-8"
              >
                {scheduledMatches.map((match) => (
                  <motion.div key={match.id} variants={{ hidden: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0 } }}>
                    <MatchCard
                      id={match.id}
                      teamA={match.team_a?.name || "Team A"}
                      teamB={match.team_b?.name || "Team B"}
                      ground={match.ground?.name || "Stadium"}
                      date={new Date(match.match_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      time={match.match_time?.slice(0, 5) || "00:00"}
                      format={match.overs_type}
                    />
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <div className="space-y-12">
                <div className="text-center py-12 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-20" aria-hidden="true" />
                  <p className="text-muted-foreground font-bold italic">No upcoming encounters fixed yet.</p>
                  <Button className="mt-8 rounded-2xl font-black h-12 shadow-xl" asChild>
                    <Link href="/admin/matches/new" aria-label="Schedule a new match">Schedule Match</Link>
                  </Button>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="h-0.5 flex-grow bg-slate-100" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Sample Preview</span>
                    <div className="h-0.5 flex-grow bg-slate-100" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 opacity-60">
                    <MatchCard
                      id="sample-1"
                      teamA="Titans XI"
                      teamB="Royal Strikers"
                      ground="Standard Arena"
                      date="24 Jan"
                      time="10:00"
                      format="T20"
                    />
                    <div className="hidden md:block">
                      <MatchCard
                        id="sample-2"
                        teamA="Warriors CC"
                        teamB="Lions United"
                        ground="Green Park"
                        date="25 Jan"
                        time="14:30"
                        format="T10"
                      />
                    </div>
                    <div className="hidden md:block">
                      <MatchCard
                        id="sample-3"
                        teamA="Desert Storm"
                        teamB="Coastal Kings"
                        ground="Ocean view"
                        date="26 Jan"
                        time="09:00"
                        format="ODI"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Stats / CTA */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pt-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="bg-slate-900 rounded-[3rem] p-12 md:p-20 flex flex-col md:flex-row items-center justify-between text-white relative overflow-hidden shadow-2xl"
          >
            <div className="absolute top-0 right-0 w-1/3 h-full bg-primary/20 bg-primary/10 skew-x-12 translate-x-1/2" />
            <div className="space-y-6 mb-12 md:mb-0 md:max-w-xl relative z-10">
              <h2 className="text-4xl md:text-5xl font-black italic tracking-tighter leading-tight">Elevate Your <br />Cricket Ecosystem.</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                <CheckItem text="Live Real-time Scoring" />
                <CheckItem text="Pro Performance Tracking" />
                <CheckItem text="Automated League Fixtures" />
                <CheckItem text="Match Broadcast Center" />
              </div>
            </div>
            <Button size="lg" className="h-16 px-12 text-xl font-black rounded-2xl shadow-2xl relative z-10 bg-primary text-white hover:scale-105 transition-transform" asChild>
              <Link href="/teams/register">Join The Circuit</Link>
            </Button>
          </motion.div>
        </section>
      </div>
    </div>
  )
}

function CheckItem({ text }: { text: string }) {
  return (
    <div className="flex items-center space-x-3">
      <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
        <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
      </div>
      <span className="text-sm font-bold opacity-80 tracking-tight">{text}</span>
    </div>
  )
}

function FeatureCard({ icon: Icon, title, description, link, accent }: any) {
  const colors: any = {
    blue: "bg-blue-500",
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    indigo: "bg-indigo-500"
  }
  return (
    <Link href={link}>
      <Card className="h-full border-none shadow-xl hover:shadow-2xl transition-all hover:-translate-y-2 group rounded-[2.5rem] overflow-hidden">
        <CardContent className="p-8 space-y-6">
          <div className={`h-16 w-16 rounded-[1.5rem] flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform ${colors[accent]}`}>
            <Icon className="h-8 w-8" />
          </div>
          <div>
            <h3 className="text-xl font-black tracking-tight mb-2">{title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed font-medium">
              {description}
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

function MatchCard({ id, teamA, teamB, ground, date, time, format }: any) {
  return (
    <Card className="overflow-hidden border-none shadow-xl group hover:shadow-2xl transition-all rounded-[2.5rem] flex flex-col h-full bg-white">
      <div className="bg-slate-900 px-6 py-2 flex justify-between items-center text-[10px] font-black tracking-widest uppercase text-white/40">
        <span className="text-primary">{format} CLASH</span>
        <span>{date}</span>
      </div>
      <CardHeader className="text-center p-8 pb-4">
        <div className="flex justify-center items-center gap-6">
          <div className="space-y-3 flex-1">
            <div className="h-20 w-20 bg-slate-50 border-4 border-slate-100 rounded-[1.5rem] mx-auto flex items-center justify-center text-2xl font-black shadow-inner group-hover:scale-110 transition-transform">
              {teamA[0]}
            </div>
            <p className="font-black tracking-tighter text-sm truncate">{teamA}</p>
          </div>
          <div className="text-3xl font-black text-slate-100 italic">VS</div>
          <div className="space-y-3 flex-1">
            <div className="h-20 w-20 bg-slate-50 border-4 border-slate-100 rounded-[1.5rem] mx-auto flex items-center justify-center text-2xl font-black shadow-inner group-hover:scale-110 transition-transform">
              {teamB[0]}
            </div>
            <p className="font-black tracking-tighter text-sm truncate">{teamB}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 px-8 pb-8 flex-grow">
        <div className="h-px w-full bg-slate-100" />
        <div className="space-y-2">
          <div className="flex items-center text-xs text-muted-foreground gap-3 font-bold">
            <Clock className="h-3.5 w-3.5 text-primary" />
            <span>{time} HRS</span>
          </div>
          <div className="flex items-center text-xs text-muted-foreground gap-3 font-bold truncate">
            <MapPin className="h-3.5 w-3.5 text-primary" />
            <span>{ground}</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-0 border-t">
        <Button variant="ghost" className="w-full h-14 font-black uppercase tracking-widest text-[10px] rounded-none hover:bg-slate-50" asChild>
          <Link href={`/matches/${id}`}>Match Center</Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
