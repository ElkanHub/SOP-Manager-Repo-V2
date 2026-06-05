"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Canvas, ThreeEvent, useFrame } from "@react-three/fiber"
import { Environment, Lightformer, useTexture } from "@react-three/drei"
import {
  BallCollider,
  CuboidCollider,
  Physics,
  RapierRigidBody,
  RigidBody,
  RigidBodyProps,
  useRopeJoint,
  useSphericalJoint,
} from "@react-three/rapier"
import * as THREE from "three"

interface LanyardProps {
  className?: string
  position?: [number, number, number]
  gravity?: [number, number, number]
  fov?: number
  transparent?: boolean
}

export default function Lanyard({
  className = "h-[260px] w-full",
  position = [0, 0, 18],
  gravity = [0, -38, 0],
  fov = 24,
  transparent = true,
}: LanyardProps) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  return (
    <div className={`relative isolate overflow-hidden ${className}`}>
      <Canvas
        camera={{ position, fov }}
        dpr={[1, isMobile ? 1.25 : 1.8]}
        gl={{ alpha: transparent, antialias: true }}
        onCreated={({ gl }) => gl.setClearColor(new THREE.Color(0x000000), transparent ? 0 : 1)}
      >
        <ambientLight intensity={1.2} />
        <Physics gravity={gravity} timeStep={isMobile ? 1 / 30 : 1 / 60}>
          <SwingingBadge isMobile={isMobile} />
        </Physics>
        <Environment blur={0.65}>
          <Lightformer intensity={2} color="white" position={[0, -1, 5]} rotation={[0, 0, Math.PI / 3]} scale={[80, 0.1, 1]} />
          <Lightformer intensity={4} color="#9be7df" position={[-4, 2, 6]} rotation={[0, Math.PI / 3, Math.PI / 3]} scale={[20, 8, 1]} />
          <Lightformer intensity={3} color="#bcd6ff" position={[4, -1, 4]} rotation={[0, -Math.PI / 4, Math.PI / 3]} scale={[18, 6, 1]} />
        </Environment>
      </Canvas>
    </div>
  )
}

function SwingingBadge({ isMobile }: { isMobile: boolean }) {
  const fixed = useRef<RapierRigidBody>(null!)
  const j1 = useRef<RapierRigidBody>(null!)
  const j2 = useRef<RapierRigidBody>(null!)
  const j3 = useRef<RapierRigidBody>(null!)
  const card = useRef<RapierRigidBody>(null!)
  const band = useRef<THREE.Mesh>(null)
  const j1Lerped = useRef(new THREE.Vector3())
  const j2Lerped = useRef(new THREE.Vector3())

  const segmentProps: RigidBodyProps = {
    type: "dynamic",
    canSleep: true,
    colliders: false,
    angularDamping: 4,
    linearDamping: 4,
  }

  const logoTexture = useTexture("/marketing/logo.jpg")

  const strapMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: "#0f766e",
    roughness: 0.55,
    metalness: 0.15,
  }), [])

  const [curve] = useState(
    () => new THREE.CatmullRomCurve3([
      new THREE.Vector3(),
      new THREE.Vector3(),
      new THREE.Vector3(),
      new THREE.Vector3(),
    ]),
  )

  const vec = useMemo(() => new THREE.Vector3(), [])
  const dir = useMemo(() => new THREE.Vector3(), [])
  const ang = useMemo(() => new THREE.Vector3(), [])
  const [dragged, setDragged] = useState<false | THREE.Vector3>(false)
  const [hovered, setHovered] = useState(false)

  useRopeJoint(fixed, j1, [[0, 0, 0], [0, 0, 0], 0.85])
  useRopeJoint(j1, j2, [[0, 0, 0], [0, 0, 0], 0.85])
  useRopeJoint(j2, j3, [[0, 0, 0], [0, 0, 0], 0.85])
  useSphericalJoint(j3, card, [[0, 0, 0], [0, 1.18, 0]])

  useEffect(() => {
    if (!hovered) return
    document.body.style.cursor = dragged ? "grabbing" : "grab"
    return () => {
      document.body.style.cursor = "auto"
    }
  }, [dragged, hovered])

  useFrame((state, delta) => {
    if (!fixed.current || !j1.current || !j2.current || !j3.current || !card.current || !band.current) return

    if (dragged) {
      vec.set(state.pointer.x, state.pointer.y, 0.5).unproject(state.camera)
      dir.copy(vec).sub(state.camera.position).normalize()
      vec.add(dir.multiplyScalar(state.camera.position.length()))
      ;[card, j1, j2, j3, fixed].forEach((ref) => ref.current?.wakeUp())
      card.current.setNextKinematicTranslation({
        x: vec.x - dragged.x,
        y: vec.y - dragged.y,
        z: vec.z - dragged.z,
      })
    }

    ;[
      { ref: j1, lerped: j1Lerped },
      { ref: j2, lerped: j2Lerped },
    ].forEach(({ ref, lerped }) => {
      const body = ref.current
      if (!body) return
      const current = body.translation()
      const currentVector = new THREE.Vector3(current.x, current.y, current.z)
      const distance = Math.max(0.1, Math.min(1, lerped.current.distanceTo(currentVector)))
      lerped.current.lerp(currentVector, delta * (4 + distance * 34))
    })

    const fixedTranslation = fixed.current.translation()
    const j3Translation = j3.current.translation()
    curve.points[0].set(j3Translation.x, j3Translation.y, j3Translation.z)
    curve.points[1].copy(j2Lerped.current)
    curve.points[2].copy(j1Lerped.current)
    curve.points[3].set(fixedTranslation.x, fixedTranslation.y, fixedTranslation.z)

    band.current.geometry.dispose()
    band.current.geometry = new THREE.TubeGeometry(curve, isMobile ? 14 : 24, 0.035, 8, false)

    const angularVelocity = card.current.angvel()
    const rotation = card.current.rotation()
    ang.set(angularVelocity.x, angularVelocity.y, angularVelocity.z)
    card.current.setAngvel({ x: ang.x, y: ang.y - rotation.y * 0.2, z: ang.z }, true)
  })

  const onPointerDown = (event: ThreeEvent<PointerEvent>) => {
    if (!card.current) return
    event.stopPropagation()
    const pointerTarget = event.target as EventTarget & { setPointerCapture?: (pointerId: number) => void }
    pointerTarget.setPointerCapture?.(event.pointerId)
    const translation = card.current.translation()
    setDragged(new THREE.Vector3().copy(event.point).sub(new THREE.Vector3(translation.x, translation.y, translation.z)))
  }

  const onPointerUp = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()
    const pointerTarget = event.target as EventTarget & { releasePointerCapture?: (pointerId: number) => void }
    pointerTarget.releasePointerCapture?.(event.pointerId)
    setDragged(false)
  }

  return (
    <>
      <group position={[-0.95, 2.75, 0]}>
        <RigidBody ref={fixed} {...segmentProps} type="fixed" />
        <RigidBody position={[0.38, -0.18, 0]} ref={j1} {...segmentProps}>
          <BallCollider args={[0.08]} />
        </RigidBody>
        <RigidBody position={[0.78, -0.42, 0]} ref={j2} {...segmentProps}>
          <BallCollider args={[0.08]} />
        </RigidBody>
        <RigidBody position={[1.08, -0.82, 0]} ref={j3} {...segmentProps}>
          <BallCollider args={[0.08]} />
        </RigidBody>
        <RigidBody
          position={[1.35, -1.65, 0]}
          ref={card}
          {...segmentProps}
          type={dragged ? "kinematicPosition" : "dynamic"}
        >
          <CuboidCollider args={[0.62, 0.86, 0.035]} />
          <group
            onPointerOver={() => setHovered(true)}
            onPointerOut={() => setHovered(false)}
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
          >
            <mesh position={[0, 0, 0]}>
              <boxGeometry args={[1.24, 1.72, 0.075]} />
              <meshPhysicalMaterial color="#f8fafc" roughness={0.35} clearcoat={0.85} clearcoatRoughness={0.18} />
            </mesh>
            <mesh position={[0, 0.12, 0.043]}>
              <planeGeometry args={[0.92, 0.44]} />
              <meshBasicMaterial map={logoTexture} toneMapped={false} />
            </mesh>
            <mesh position={[0, -0.42, 0.047]}>
              <planeGeometry args={[0.95, 0.34]} />
              <meshBasicMaterial color="#0f172a" transparent opacity={0.08} />
            </mesh>
            <mesh position={[0, 0.72, 0.07]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.16, 0.026, 12, 28]} />
              <meshStandardMaterial color="#64748b" metalness={0.7} roughness={0.25} />
            </mesh>
          </group>
        </RigidBody>
      </group>
      <mesh ref={band} material={strapMaterial}>
        <tubeGeometry args={[curve, 16, 0.035, 8, false]} />
      </mesh>
    </>
  )
}
