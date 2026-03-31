import { createServiceClient } from "./lib/supabase/server"

async function checkSignupStatus() {
    const service = await createServiceClient()
    const { data, error } = await service
        .from('profiles')
        .select('signup_status')

    if (error) {
        console.error("Error fetching profiles:", error)
        return
    }

    const counts = data.reduce((acc: any, p: any) => {
        acc[p.signup_status] = (acc[p.signup_status] || 0) + 1
        return acc
    }, {})

    console.log("Signup Status Counts:", counts)
}

checkSignupStatus()
