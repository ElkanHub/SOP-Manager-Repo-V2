import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const path = searchParams.get("path")

  console.log("[Proxy] Request for path:", path)

  if (!path) {
    return new NextResponse("Missing file path", { status: 400 })
  }

  // Verify the user is authenticated securely on the server
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    console.error("[Proxy] Auth error or no user:", authError)
    return new NextResponse("Unauthorized", { status: 401 })
  }

  try {
    const { createServiceClient } = await import("@/lib/supabase/server")
    const svcClient = await createServiceClient()

    console.log("[Proxy] Downloading from bucket 'documents' path:", path)
    const { data, error } = await svcClient.storage
      .from("documents")
      .download(path)

    if (error || !data) {
      console.error("[Proxy] Download error from Supabase:", error)
      return new NextResponse(`Storage error: ${error?.message || "File not found"}`, { status: 404 })
    }

    const size = data.size
    console.log("[Proxy] Download successful. Size:", size, "bytes")

    if (size === 0) {
      console.warn("[Proxy] Warning: Downloaded file size is 0 bytes")
    }

    const arrayBuffer = await data.arrayBuffer()

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        // Force revalidation to fix the 304 issue and ensure fresh data
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
        "Content-Disposition": `inline; filename="${path.split('/').pop() || 'document.docx'}"`
      },
    })
  } catch (err) {
    console.error("[Proxy] Unexpected error:", err)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}
