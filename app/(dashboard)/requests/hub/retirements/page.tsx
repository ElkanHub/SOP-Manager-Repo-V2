import { redirect } from "next/navigation"
import { loadRetirementsReview } from "@/components/retirements/fetch-retirements"
import { RetirementsReviewClient } from "@/components/retirements/retirements-review-client"

export const dynamic = "force-dynamic"

// Mirrors /requests/retirements — the sidebar links both routes to the same screen.
export default async function HubRetirementsReviewPage() {
    const data = await loadRetirementsReview()
    if (!data) redirect("/login")

    return <RetirementsReviewClient retirements={data.retirements} isQa={data.isQa} />
}
