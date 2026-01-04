"use client"
import { Trophy, CalendarClock, Hammer } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function TournamentPage() {
    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full text-center space-y-8">
                <div className="relative mx-auto w-32 h-32 flex items-center justify-center">
                    <div className="absolute inset-0 bg-primary/10 rounded-full animate-ping opacity-20" />
                    <div className="relative bg-white overflow-hidden rounded-[2.5rem] shadow-xl border border-slate-100">
                        <img
                            src="https://img.freepik.com/premium-vector/logo-cricket-club-dark-blue-background_549850-1296.jpg?semt=ais_hybrid&w=740&q=80"
                            alt="Tournament Logo"
                            className="h-28 w-28 object-cover"
                        />
                    </div>
                </div>

                <div className="space-y-4">
                    <h1 className="text-4xl font-black italic tracking-tighter text-slate-900">
                        Tournament Mode
                    </h1>
                    <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-amber-50 text-amber-600 text-[10px] font-black uppercase tracking-widest border border-amber-100">
                        <CalendarClock className="h-3 w-3 mr-2" /> Under Construction
                    </div>
                </div>

                <p className="text-muted-foreground font-medium leading-relaxed px-4">
                    Our admin team is currently organizing the next big championship. Brackets and fixtures will appear here once finalized.
                </p>

                <div className="pt-8 flex flex-col sm:flex-row gap-4 justify-center">
                    <Button variant="default" className="rounded-xl font-bold shadow-lg shadow-primary/20" asChild>
                        <Link href="/">Back to Dashboard</Link>
                    </Button>
                    <Button variant="outline" className="rounded-xl font-bold border-slate-200" asChild>
                        <Link href="/schedule">View Friendly Matches</Link>
                    </Button>
                </div>
            </div>
        </div>
    )
}
