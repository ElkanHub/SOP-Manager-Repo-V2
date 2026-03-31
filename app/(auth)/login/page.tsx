import Image from "next/image"
import Link from "next/link"
import { LoginForm } from "@/components/login-form"
import { GalleryVerticalEndIcon } from "lucide-react"
import { Suspense } from "react"
import { AnimatedGradientBackground } from "@/components/animated-gradient-background"

export default function LoginPage() {
    return (
        <div className="grid min-h-svh lg:grid-cols-2">
            <div className="relative flex flex-col gap-4 p-6 md:p-10 overflow-hidden border-r">
                <AnimatedGradientBackground />
                <div className="relative z-10 flex justify-center gap-2 md:justify-start">
                    <Link href="/" className="flex items-center gap-2 font-medium">
                        <div className="flex size-6 items-center justify-center rounded-md bg-brand-navy text-primary-foreground">
                            <GalleryVerticalEndIcon className="size-4" />
                        </div>
                        SOP-Guard Pro
                    </Link>
                </div>
                <div className="relative z-10 flex flex-1 items-center justify-center">
                    <div className="w-full max-w-xs">
                        <Suspense fallback={<div className="text-center text-muted-foreground">Loading form...</div>}>
                            <LoginForm />
                        </Suspense>
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
                    <h2 className="text-3xl font-bold mb-4">Welcome Back</h2>
                    <p className="text-lg opacity-80">
                        Log in to your SOP-Guard Pro account to manage standard operating procedures,
                        approve change controls, and stay updated.
                    </p>
                </div>
            </div>
        </div>
    )
}
