import Link from "next/link"
import { Home, ArrowLeft, Search } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function NotFound() {
    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 text-center">
            <div className="relative mb-8">
                <div className="absolute inset-0 blur-3xl bg-primary/20 rounded-full animate-pulse" />
                <h1 className="text-9xl font-black tracking-tighter text-slate-900 relative">404</h1>
            </div>

            <div className="space-y-4 max-w-md mx-auto mb-12">
                <h2 className="text-3xl font-black italic tracking-tighter uppercase">Lost in the Outfield?</h2>
                <p className="text-muted-foreground font-medium">
                    The page you're looking for seems to have been caught or hit out of the park. Let's get you back on the pitch.
                </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" className="rounded-2xl font-black px-8 h-14 shadow-2xl shadow-primary/20" asChild>
                    <Link href="/">
                        <Home className="mr-2 h-5 w-5" /> Back Home
                    </Link>
                </Button>
                <Button size="lg" variant="outline" className="rounded-2xl font-black px-8 h-14 border-2" asChild>
                    <Link href="/schedule">
                        <Search className="mr-2 h-5 w-5" /> Find Matches
                    </Link>
                </Button>
            </div>

            <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 opacity-40 grayscale pointer-events-none">
                <div className="text-xs font-black uppercase tracking-widest">Innings</div>
                <div className="text-xs font-black uppercase tracking-widest">Wickets</div>
                <div className="text-xs font-black uppercase tracking-widest">Overs</div>
                <div className="text-xs font-black uppercase tracking-widest">Runs</div>
            </div>
        </div>
    )
}
