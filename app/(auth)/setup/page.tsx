import Image from "next/image"
import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { SetupForm } from "@/components/setup-form"
import { GalleryVerticalEndIcon } from "lucide-react"

export default async function SetupPage() {
    const supabase = await createClient()
    const { data: hasAdmin } = await supabase.rpc('has_any_admin')

    if (hasAdmin) {
        redirect('/login')
    }

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
                        You are setting up the primary administrator account for SOP-Guard Pro.
                        This account will have full access to manage users, edit settings, and oversee all operations.
                    </p>
                </div>
            </div>
        </div>
    )
}
