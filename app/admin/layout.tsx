"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Loader2 } from "lucide-react"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const [loading, setLoading] = useState(true)
    const router = useRouter()

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                router.replace('/login')
            } else {
                setLoading(false)
            }
        }
        checkAuth()

        // Listen for auth changes (e.g. sign out)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event: any, session: any) => {
            if (event === 'SIGNED_OUT' || !session) {
                router.replace('/login')
            }
        })

        return () => subscription.unsubscribe()
    }, [router])

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950 relative overflow-hidden">
                {/* Background Narrative Grid */}
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] pointer-events-none" />
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] -mr-64 -mt-32 opacity-50" />
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-[100px] -ml-48 -mb-24 opacity-30" />

                <div className="relative z-10 flex flex-col items-center gap-8">
                    <div className="relative">
                        <div className="h-24 w-24 rounded-[2rem] bg-white/5 border border-white/10 flex items-center justify-center relative overflow-hidden group">
                            <div className="absolute inset-0 border-2 border-primary/20 rounded-[2rem]" />
                            <div className="absolute inset-0 border-2 border-primary rounded-[2rem] border-t-transparent animate-spin [animation-duration:1.5s]" />
                            <Loader2 className="h-8 w-8 text-primary animate-pulse" />
                        </div>
                        <div className="absolute -inset-4 bg-primary/20 blur-2xl rounded-full opacity-50 animate-pulse" />
                    </div>

                    <div className="text-center space-y-3">
                        <div className="inline-flex items-center gap-2 bg-white/5 px-4 py-1.5 rounded-full border border-white/10">
                            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-ping" />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Security Clearance</span>
                        </div>
                        <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white">Verifying <span className="text-primary">Access...</span></h2>
                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em]">Synchronizing Arena Control Grid</p>
                    </div>
                </div>
            </div>
        )
    }

    return <>{children}</>
}
