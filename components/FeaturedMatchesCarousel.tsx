"use client"

import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"

interface FeaturedMatch {
    id: number
    title: string
    subtitle: string
    image: string
    teams: string
    date: string
    link: string
}

const featuredMatches: FeaturedMatch[] = [
    {
        id: 1,
        title: "CUSTOM MATCHES",
        subtitle: "Your Rules, Your Game",
        image: "/premier_league_match.png",
        teams: "Create T10, T20, or custom over matches instantly",
        date: "Create Now",
        link: "/admin"
    },
    {
        id: 2,
        title: "PRO SERIES",
        subtitle: "Elite Competition",
        image: "/pro_series_match.png",
        teams: "Join the league of professional squads",
        date: "View Teams",
        link: "/admin"
    },
    {
        id: 3,
        title: "TOURNAMENT",
        subtitle: "Championship Glory",
        image: "/championship_match.png",
        teams: "Battle for the ultimate trophy",
        date: "View Bracket",
        link: "/tournament"
    }
]

export function FeaturedMatchesCarousel() {
    const router = useRouter()
    const [currentIndex, setCurrentIndex] = useState(0)
    const [direction, setDirection] = useState(0)

    // Auto-slide every 5 seconds
    useEffect(() => {
        const timer = setInterval(() => {
            handleNext()
        }, 5000)

        return () => clearInterval(timer)
    }, [currentIndex])

    const handleNext = () => {
        setDirection(1)
        setCurrentIndex((prev) => (prev + 1) % featuredMatches.length)
    }

    const handlePrev = () => {
        setDirection(-1)
        setCurrentIndex((prev) => (prev - 1 + featuredMatches.length) % featuredMatches.length)
    }

    const handleDotClick = (index: number) => {
        setDirection(index > currentIndex ? 1 : -1)
        setCurrentIndex(index)
    }

    const slideVariants = {
        enter: (direction: number) => ({
            x: direction > 0 ? 1000 : -1000,
            opacity: 0
        }),
        center: {
            zIndex: 1,
            x: 0,
            opacity: 1
        },
        exit: (direction: number) => ({
            zIndex: 0,
            x: direction < 0 ? 1000 : -1000,
            opacity: 0
        })
    }

    const swipeConfidenceThreshold = 10000
    const swipePower = (offset: number, velocity: number) => {
        return Math.abs(offset) * velocity
    }

    return (
        <div className="relative w-full h-full min-h-[400px] md:h-[500px]">
            <AnimatePresence initial={false} custom={direction}>
                <motion.div
                    key={currentIndex}
                    custom={direction}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{
                        x: { type: "spring", stiffness: 300, damping: 30 },
                        opacity: { duration: 0.2 }
                    }}
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={1}
                    onDragEnd={(e, { offset, velocity }) => {
                        const swipe = swipePower(offset.x, velocity.x)

                        if (swipe < -swipeConfidenceThreshold) {
                            handleNext()
                        } else if (swipe > swipeConfidenceThreshold) {
                            handlePrev()
                        }
                    }}
                    onTap={() => {
                        router.push(featuredMatches[currentIndex].link)
                    }}
                    className="absolute inset-0 rounded-[3rem] overflow-hidden shadow-2xl border-[8px] border-white cursor-pointer"
                >
                    {/* Background Image */}
                    <div
                        className="absolute inset-0 bg-cover bg-center"
                        style={{
                            backgroundImage: `url(${featuredMatches[currentIndex].image})`
                        }}
                    />

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

                    {/* Content */}
                    <div className="absolute inset-0 flex flex-col justify-end p-8 md:p-10 pointer-events-none">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="space-y-2 md:space-y-4"
                        >
                            {/* Title & Subtitle */}
                            <div>
                                <p className="text-sm md:text-base font-bold text-primary tracking-widest uppercase mb-1 drop-shadow-md">
                                    {featuredMatches[currentIndex].subtitle}
                                </p>
                                <h3 className="text-3xl md:text-5xl font-black italic tracking-tighter text-white leading-[0.9] drop-shadow-2xl">
                                    {featuredMatches[currentIndex].title}
                                </h3>
                            </div>

                            {/* Teams */}
                            <p className="text-sm font-medium text-white/90 line-clamp-1 drop-shadow-md">
                                {featuredMatches[currentIndex].teams}
                            </p>

                            {/* Date & CTA */}
                            <div className="flex items-center justify-between pt-2">
                                <div className="flex items-center gap-2 text-white/90 font-bold text-xs uppercase tracking-widest drop-shadow-md">
                                    <div className="h-1 w-8 bg-primary rounded-full shadow-lg" />
                                    {featuredMatches[currentIndex].date}
                                </div>
                                <div className="pointer-events-auto">
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        className="rounded-xl font-black text-xs h-10 px-6 shadow-xl hover:scale-105 transition-transform z-50 relative cursor-pointer"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            e.preventDefault();
                                            router.push(featuredMatches[currentIndex].link);
                                        }}
                                        onPointerDown={(e) => e.stopPropagation()}
                                    >
                                        Try Now <Play className="ml-1 h-3 w-3 fill-current" />
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </motion.div>
            </AnimatePresence>

            {/* Navigation Arrows */}
            <div className="absolute top-1/2 -translate-y-1/2 -left-4 -right-4 flex justify-between pointer-events-none z-10">
                <Button
                    variant="outline"
                    size="icon"
                    onClick={handlePrev}
                    className="h-10 w-10 rounded-full bg-white shadow-lg pointer-events-auto hover:scale-110 transition-transform border-none hover:bg-slate-50"
                >
                    <ChevronLeft className="h-5 w-5 text-slate-900" />
                </Button>
                <Button
                    variant="outline"
                    size="icon"
                    onClick={handleNext}
                    className="h-10 w-10 rounded-full bg-white shadow-lg pointer-events-auto hover:scale-110 transition-transform border-none hover:bg-slate-50"
                >
                    <ChevronRight className="h-5 w-5 text-slate-900" />
                </Button>
            </div>

            {/* Dots Indicator */}
            <div className="absolute -bottom-6 left-0 right-0 flex justify-center gap-2">
                {featuredMatches.map((_, index) => (
                    <button
                        key={index}
                        onClick={() => handleDotClick(index)}
                        className={`h-1.5 rounded-full transition-all duration-300 ${index === currentIndex
                            ? "w-8 bg-primary"
                            : "w-2 bg-slate-200/50 hover:bg-slate-300"
                            }`}
                        aria-label={`Go to slide ${index + 1}`}
                    />
                ))}
            </div>
        </div>
    )
}
