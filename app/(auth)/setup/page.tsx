import Image from "next/image"
import Link from "next/link"
import { SetupForm } from "@/components/setup-form"
import { Suspense } from "react"
import SectionGrainient from "@/components/marketing/section-grainient"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Logo } from "@/components/ui/logo"

export default async function SetupPage() {
    // Check if an admin user already exists. If yes, redirect to login.
    const supabase = await createClient()
    const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true })
    if (count && count > 0) {
        redirect('/login')
    }

    return (
        <div className="grid min-h-svh lg:grid-cols-2">
            <div className="relative flex flex-col gap-4 p-6 md:p-10 overflow-hidden border-r">
                <SectionGrainient preset="hero" />
                <div className="relative z-10 flex justify-center gap-2 md:justify-start">
                    <Link href="/" className="flex items-center gap-2">
                        <Logo />
                        <span className="font-semibold tracking-tight">QMS-MANAJA</span>
                    </Link>
                </div>
                <div className="flex flex-1 items-center justify-center">
                    <div className="w-full max-w-xs">
                        <SetupForm />
                    </div>
                </div>
            </div>
            <div className="relative hidden lg:flex items-center justify-center p-12 overflow-hidden">
                <Image
                    src="/auth-img.webp"
                    alt="Authentication Background"
                    fill
                    priority
                    className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-brand-navy/90 to-brand-navy/40"></div>
                <div className="relative max-w-md text-white">
                    <h2 className="text-3xl font-bold mb-4">Initialize Your Workspace</h2>
                    <p className="text-lg opacity-80">
                        You are setting up the primary administrator account for QMS-MANAJA.
                        This account will have full access to manage users, edit settings, and oversee all operations.
                    </p>
                </div>
            </div>
        </div>
    )
}
