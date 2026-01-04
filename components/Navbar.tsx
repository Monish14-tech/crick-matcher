"use client"

import Link from "next/link"
import { Trophy, Calendar, MapPin, Users, Menu, X, Home } from "lucide-react"
import { useState } from "react"
import { Button } from "./ui/button"

export default function Navbar() {
    const [isOpen, setIsOpen] = useState(false)

    const navLinks = [
        { name: "Home", href: "/", icon: Home },
        { name: "Schedule", href: "/schedule", icon: Calendar },
        { name: "Teams", href: "/teams", icon: Users },
        { name: "Tournament", href: "/tournament", icon: Trophy },
    ]

    return (
        <nav className="fixed top-0 w-full z-50 bg-white/60 dark:bg-slate-950/60 backdrop-blur-xl border-b border-white/20 shadow-sm support-[backdrop-filter]:bg-background/60">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-20 items-center">
                    <div className="flex items-center">
                        <Link href="/" className="flex items-center space-x-3 group">
                            <div className="overflow-hidden rounded-xl border border-white/20">
                                <img
                                    src="https://img.freepik.com/premium-vector/logo-cricket-club-dark-blue-background_549850-1296.jpg?semt=ais_hybrid&w=740&q=80"
                                    alt="Crick Matcher Logo"
                                    className="h-10 w-10 object-cover"
                                />
                            </div>
                            <span className="text-2xl font-black tracking-tighter text-gradient">
                                Crick Matcher
                            </span>
                        </Link>
                    </div>

                    {/* Desktop Nav */}
                    <div className="hidden md:flex items-center space-x-8">
                        {navLinks.map((link) => (
                            <Link
                                key={link.name}
                                href={link.href}
                                className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors flex items-center space-x-1.5"
                            >
                                <link.icon className="h-4 w-4" />
                                <span>{link.name}</span>
                            </Link>
                        ))}
                        <Button className="rounded-full px-6 font-bold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all hover:scale-105" asChild>
                            <Link href="/admin">Admin Portal</Link>
                        </Button>
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="md:hidden flex items-center">
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            className="text-muted-foreground hover:text-primary transition-colors"
                        >
                            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Nav */}
            {isOpen && (
                <div className="md:hidden border-b border-border bg-background/95 backdrop-blur-md">
                    <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                        {navLinks.map((link) => (
                            <Link
                                key={link.name}
                                href={link.href}
                                onClick={() => setIsOpen(false)}
                                className="block px-3 py-2 rounded-md text-base font-medium text-muted-foreground hover:text-primary hover:bg-accent flex items-center space-x-2"
                            >
                                <link.icon className="h-5 w-5" />
                                <span>{link.name}</span>
                            </Link>
                        ))}
                        <div className="pt-4 pb-2">
                            <Button className="w-full justify-start rounded-full font-bold" variant="default" asChild>
                                <Link href="/admin">Admin Portal</Link>
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </nav>
    )
}
