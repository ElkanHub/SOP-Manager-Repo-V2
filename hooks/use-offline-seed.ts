"use client"

import { useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { seedLocal, setMeta, getMeta } from "@/lib/db/offline-records"

const SEED_INTERVAL_MS = 5 * 60 * 1000

export function useOfflineSeed(): void {
  const running = useRef(false)

  useEffect(() => {
    let cancelled = false

    async function seed(): Promise<void> {
      if (running.current) return
      if (typeof navigator !== "undefined" && !navigator.onLine) return

      const lastSeed = (await getMeta<string>("last_seed_at")) ?? null
      if (lastSeed) {
        const age = Date.now() - new Date(lastSeed).getTime()
        if (age < SEED_INTERVAL_MS) return
      }

      running.current = true
      try {
        const supabase = createClient()

        const [sopsRes, equipmentRes, deptRes, profilesRes] = await Promise.all([
          supabase
            .from("sops")
            .select("*")
            .order("updated_at", { ascending: false })
            .limit(500),
          supabase
            .from("equipment")
            .select("*")
            .order("updated_at", { ascending: false })
            .limit(500),
          supabase.from("departments").select("*"),
          supabase.from("profiles").select("*").eq("is_active", true),
        ])

        if (cancelled) return

        if (sopsRes.data) await seedLocal("sops", sopsRes.data)
        if (equipmentRes.data) await seedLocal("equipment", equipmentRes.data)
        if (deptRes.data) {
          await seedLocal(
            "departments",
            deptRes.data.map((d) => ({ ...d, id: (d as { name: string }).name })),
          )
        }
        if (profilesRes.data) await seedLocal("profiles", profilesRes.data)

        await setMeta("last_seed_at", new Date().toISOString())
      } catch {
        // Network or RLS error — silently fail; we'll try again next mount/online event
      } finally {
        running.current = false
      }
    }

    seed()

    const onOnline = () => seed()
    window.addEventListener("online", onOnline)
    return () => {
      cancelled = true
      window.removeEventListener("online", onOnline)
    }
  }, [])
}
