import Link from "next/link"
import { SignupForm } from "@/components/signup-form"
import { GalleryVerticalEndIcon } from "lucide-react"
import { Suspense } from "react"

export default function SignupPage() {
    return (
        <div className="grid min-h-svh lg:grid-cols-2">
            <div className="flex flex-col gap-4 p-6 md:p-10 bg-background">
                <div className="flex justify-center gap-2 md:justify-start">
                    <Link href="/" className="flex items-center gap-2 font-medium">
                        <div className="flex size-6 items-center justify-center rounded-md bg-brand-navy text-primary-foreground">
                            <GalleryVerticalEndIcon className="size-4" />
                        </div>
                        SOP-Guard Pro
                    </Link>
                </div>
                <div className="flex flex-1 items-center justify-center">
                    <div className="w-full max-w-xs">
                        <Suspense fallback={<div className="text-center text-muted-foreground">Loading form...</div>}>
                            <SignupForm />
                        </Suspense>
                    </div>
                </div>
            </div>
            <div className="relative hidden lg:flex items-center justify-center p-12" style={{ backgroundImage: 'url(/auth-img.png)', backgroundSize: 'cover', backgroundPosition: 'center' }}>
                <div className="absolute inset-0 bg-gradient-to-r from-brand-navy/90 to-brand-navy/40"></div>
                <div className="relative max-w-md text-white">
                    <h2 className="text-3xl font-bold mb-4">Join SOP-Guard Pro</h2>
                    <p className="text-lg opacity-80">
                        Create a new account to get started with your organisation's standard operating procedures.
                        Note: Organizations must already be provisioned by an administrator.
                    </p>
                </div>
            </div>
        </div>
    )
}
