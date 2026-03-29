import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { WaitingRoomClient } from './waiting-room-client'

export default async function WaitingRoomPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('signup_status')
        .eq('id', user.id)
        .single()

    if (profile?.signup_status === 'approved') {
        redirect('/onboarding')
    }

    return <WaitingRoomClient userId={user.id} />
}
