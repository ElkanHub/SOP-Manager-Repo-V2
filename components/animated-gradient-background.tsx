import React from "react"

export function AnimatedGradientBackground() {
    return (
        <div className="absolute inset-0 overflow-hidden bg-slate-50 dark:bg-[#060D1A] -z-10">
            {/* The gradient blobs */}
            <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-brand-blue rounded-full mix-blend-multiply filter blur-[120px] opacity-40 animate-blob dark:mix-blend-screen dark:opacity-20" />
            <div className="absolute top-[20%] right-[-10%] w-96 h-96 bg-brand-teal rounded-full mix-blend-multiply filter blur-[120px] opacity-40 animate-blob animation-delay-2000 dark:mix-blend-screen dark:opacity-20" />
            <div className="absolute bottom-[-10%] left-[20%] w-[500px] h-[500px] bg-brand-navy rounded-full mix-blend-multiply filter blur-[140px] opacity-30 animate-blob animation-delay-4000 dark:bg-indigo-900 dark:mix-blend-screen dark:opacity-20" />

            {/* A subtle overlay to ensure content contrast and create a premium glass-like wash over the spheres */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent dark:from-slate-900/40 dark:to-transparent backdrop-blur-[2px]" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent dark:from-background dark:via-background/70" />
        </div>
    )
}
