"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { motion } from "framer-motion"

export function SlidingTeams() {
    const [teams, setTeams] = useState<{ id: string, name: string, logo_url: string }[]>([])

    useEffect(() => {
        async function fetchTeams() {
            const { data } = await supabase
                .from('teams')
                .select('id, name, logo_url')

            if (data) setTeams(data)
        }
        fetchTeams()
    }, [])

    if (teams.length === 0) return null

    // Duplicate teams to create a seamless loop
    const duplicatedTeams = [...teams, ...teams, ...teams]

    return (
        <div className="w-full bg-slate-950/50 backdrop-blur-xl border-y border-white/5 py-6 overflow-hidden relative">
            <div className="absolute left-0 top-0 w-32 h-full bg-gradient-to-r from-slate-950 to-transparent z-10" />
            <div className="absolute right-0 top-0 w-32 h-full bg-gradient-to-l from-slate-950 to-transparent z-10" />

            <motion.div
                className="flex items-center gap-12 whitespace-nowrap"
                animate={{
                    x: [0, -1000],
                }}
                transition={{
                    duration: 30,
                    repeat: Infinity,
                    ease: "linear",
                }}
            >
                {duplicatedTeams.map((team, idx) => (
                    <div key={`${team.id}-${idx}`} className="flex items-center gap-4 group cursor-pointer">
                        <div className="w-12 h-12 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-center overflow-hidden group-hover:border-primary/50 transition-colors">
                            {team.logo_url ? (
                                <img src={team.logo_url} alt={team.name} className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-xl font-black text-white/20">{team.name[0]}</span>
                            )}
                        </div>
                        <span className="text-sm font-black uppercase tracking-widest text-white/40 group-hover:text-white transition-colors">
                            {team.name}
                        </span>
                    </div>
                ))}
            </motion.div>
        </div>
    )
}
