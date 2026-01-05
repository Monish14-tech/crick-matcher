import { Trophy, Github, Twitter, Linkedin, Heart } from "lucide-react"
import Link from "next/link"

export default function Footer() {
    return (
        <footer className="bg-slate-950 text-white pt-24 pb-12 relative overflow-hidden mt-auto">
            {/* Background Mesh */}
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-slate-950 to-slate-950 pointer-events-none" />

            <div className="max-w-7xl mx-auto px-6 relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-20">
                    <div className="col-span-1 md:col-span-1 space-y-4">
                        <div className="flex items-center space-x-3">
                            <div className="overflow-hidden rounded-xl border border-white/10">
                                <img
                                    src="https://img.freepik.com/premium-vector/logo-cricket-club-dark-blue-background_549850-1296.jpg?semt=ais_hybrid&w=740&q=80"
                                    alt="Crick Matcher Logo"
                                    className="h-10 w-10 object-cover"
                                />
                            </div>
                            <span className="text-2xl font-black tracking-tighter">Crick Matcher</span>
                        </div>
                        <p className="text-slate-400 font-medium leading-relaxed">
                            The definitive platform for professional cricket management. Built for the modern game.
                        </p>
                    </div>

                    <div>
                        <h4 className="font-bold mb-6 text-lg">Platform</h4>
                        <ul className="space-y-4 text-slate-400 font-medium">
                            <li><Link href="/schedule" className="hover:text-primary transition-colors">Schedule</Link></li>
                            <li><Link href="/teams" className="hover:text-primary transition-colors">Team Roster</Link></li>
                            <li><Link href="/tournament" className="hover:text-primary transition-colors">Tournaments</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-bold mb-6 text-lg">Admin</h4>
                        <ul className="space-y-4 text-slate-400 font-medium">
                            <li><Link href="/login" className="hover:text-primary transition-colors">Dashboard Login</Link></li>
                            <li><Link href="/admin/matches/new" className="hover:text-primary transition-colors">Fixture Manager</Link></li>
                            <li><Link href="/admin/teams" className="hover:text-primary transition-colors">Squad Control</Link></li>
                        </ul>
                    </div>


                </div>

                <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-slate-500 font-medium text-sm">
                        © {new Date().getFullYear()} Crick Matcher Inc. All rights reserved.
                    </p>
                    <p className="text-slate-500 font-medium text-sm flex items-center gap-2">
                        Developed by Monish Tech
                    </p>
                </div>
            </div>
        </footer>
    )
}

function SocialIcon({ icon: Icon }: any) {
    return (
        <a href="#" className="h-10 w-10 bg-white/5 rounded-full flex items-center justify-center hover:bg-primary hover:text-white transition-all">
            <Icon className="h-5 w-5" />
        </a>
    )
}
