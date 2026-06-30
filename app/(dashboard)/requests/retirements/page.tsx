import { redirect } from "next/navigation"
import { loadRetirementsReview } from "@/components/retirements/fetch-retirements"
import { RetirementsReviewClient } from "@/components/retirements/retirements-review-client"

export const dynamic = "force-dynamic"

export default async function RetirementsReviewPage() {
    const data = await loadRetirementsReview()
    if (!data) redirect("/login")

    return <RetirementsReviewClient retirements={data.retirements} isQa={data.isQa} />
}
