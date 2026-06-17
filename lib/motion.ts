import type { Variants, Transition } from "motion/react"

/**
 * Shared motion presets so list/panel entrances feel consistent across the app.
 * Use with `motion/react`:
 *
 *   <motion.ul variants={listContainer} initial="hidden" animate="show">
 *     {items.map(i => <motion.li key={i.id} variants={listItem}>…</motion.li>)}
 *   </motion.ul>
 *
 * Wrap lists that can change in <AnimatePresence> and give items `exit="exit"`
 * to animate removals.
 */

export const EASE_OUT: Transition["ease"] = [0.22, 1, 0.36, 1]

export const listContainer: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.04, delayChildren: 0.02 },
  },
}

export const listItem: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: EASE_OUT } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.18, ease: EASE_OUT } },
}

/** Simple fade+rise for a single panel/card mount. */
export const fadeRise: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: EASE_OUT } },
}
