"use client"

import dynamic from "next/dynamic"

/**
 * Code-split the WebGL MetallicPaint shader off the initial hero bundle.
 * The hero headline/CTAs paint immediately; the metallic mark hydrates after.
 */
const MetallicPaint = dynamic(() => import("@/components/ui/metallic-paint"), {
  ssr: false,
  loading: () => (
    <div className="size-full rounded-full bg-gradient-to-br from-brand-teal/20 via-brand-blue/10 to-transparent blur-2xl" />
  ),
})

export default function MetallicLogo() {
  return (
    <MetallicPaint
      imageSrc="/marketing/logo.jpg"
      mouseAnimation
      speed={0.25}
      refraction={0.015}
      blur={0.02}
      brightness={2.2}
      contrast={0.8}
      liquid={0.8}
      lightColor="#2DD4BF"
      darkColor="#0f172a"
      tintColor="#38BDF8"
    />
  )
}
