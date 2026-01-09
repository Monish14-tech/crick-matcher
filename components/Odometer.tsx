"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

interface OdometerProps {
    value: number
    label?: string
    digitsCount?: number
}

export function Odometer({ value, label, digitsCount = 4 }: OdometerProps) {
    const digits = value.toString().padStart(digitsCount, '0').split('')

    return (
        <div className="flex flex-col items-center gap-4">
            <div className="flex gap-1.5">
                {digits.map((digit, idx) => (
                    <Digit key={idx} digit={digit} />
                ))}
            </div>
            {label && <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">{label}</span>}
        </div>
    )
}

function Digit({ digit }: { digit: string }) {
    return (
        <div className="relative w-7 h-11 bg-slate-900 rounded-xl border border-white/5 shadow-2xl overflow-hidden flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/20 pointer-events-none z-10" />
            <AnimatePresence mode="popLayout">
                <motion.span
                    key={digit}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -20, opacity: 0 }}
                    transition={{ duration: 0.5, ease: "circOut" }}
                    className="text-xl font-black italic text-white"
                >
                    {digit}
                </motion.span>
            </AnimatePresence>
            <div className="absolute top-1/2 left-0 w-full h-px bg-white/5 z-20" />
        </div>
    )
}
