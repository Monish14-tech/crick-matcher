"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

interface OdometerProps {
    value: number
    label: string
}

export function Odometer({ value, label }: OdometerProps) {
    const digits = value.toString().padStart(6, '0').split('')

    return (
        <div className="flex flex-col items-center gap-4">
            <div className="flex gap-1">
                {digits.map((digit, idx) => (
                    <Digit key={idx} digit={digit} />
                ))}
            </div>
            <span className="text-xs font-black uppercase tracking-[0.2em] text-cyan-400/60">{label}</span>
        </div>
    )
}

function Digit({ digit }: { digit: string }) {
    return (
        <div className="relative w-8 h-12 bg-slate-950 rounded-lg border border-cyan-500/20 shadow-[inset_0_2px_10px_rgba(0,0,0,0.8)] overflow-hidden flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/40 pointer-events-none z-10" />
            <AnimatePresence mode="popLayout">
                <motion.span
                    key={digit}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -20, opacity: 0 }}
                    transition={{ duration: 0.4, ease: [0.45, 0, 0.55, 1] }}
                    className="text-2xl font-mono font-black text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]"
                >
                    {digit}
                </motion.span>
            </AnimatePresence>
            <div className="absolute top-1/2 left-0 w-full h-[1px] bg-white/5 z-20" />
        </div>
    )
}
