import React from "react"

export function AnimatedGradientBackground() {
    return (
        <div className="absolute inset-0 overflow-hidden bg-slate-50 dark:bg-[#060D1A] -z-10">
            {/* The Aurora blobs */}
            {/* Top wide beam */}
            <div className="absolute -top-[20%] left-[-10%] w-[120%] h-[60%] bg-brand-blue/40 dark:bg-brand-blue/30 rounded-[100%] mix-blend-multiply filter blur-[100px] animate-aurora-1 dark:mix-blend-screen" />
            
            {/* Middle cross beam */}
            <div className="absolute top-[20%] -right-[20%] w-[100%] h-[50%] bg-brand-teal/40 dark:bg-brand-teal/30 rounded-[100%] mix-blend-multiply filter blur-[120px] animate-aurora-2 dark:mix-blend-screen" />
            
            {/* Bottom foundation beam */}
            <div className="absolute bottom-[-20%] left-[0%] w-[120%] h-[60%] bg-brand-navy/30 dark:bg-indigo-900/30 rounded-[100%] mix-blend-multiply filter blur-[140px] animate-aurora-3 dark:mix-blend-screen" />

            {/* A subtle overlay to ensure content contrast and create a premium glass-like wash over the spheres */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent dark:from-slate-900/40 dark:to-transparent backdrop-blur-[4px]" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent dark:from-background dark:via-background/40" />
        </div>
    )
}
