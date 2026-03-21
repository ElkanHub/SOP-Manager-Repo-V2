import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const path = searchParams.get("path")

  if (!path) {
    return new NextResponse("Missing file path", { status: 400 })
  }

  // Verify the user is authenticated securely on the server
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  try {
    // We elevate to service role to securely download the file buffer directly 
    // from Supabase storage, completely bypassing browser CORS restrictions.
    const { createServiceClient } = await import("@/lib/supabase/server")
    const svcClient = await createServiceClient()

    const { data, error } = await svcClient.storage
      .from("documents")
      .download(path)

    if (error || !data) {
      console.error("Proxy Download Error:", error)
      return new NextResponse("Failed to download document from storage", { status: 404 })
    }

    const arrayBuffer = await data.arrayBuffer()

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        // Allow the browser to cache this specific proxy call for 1 hour to heavily optimize load times
        "Cache-Control": "private, max-age=3600",
        "Content-Disposition": `inline; filename="${path.split('/').pop() || 'document.docx'}"`
      },
    })
  } catch (err) {
    console.error("Proxy Execution Error:", err)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}
