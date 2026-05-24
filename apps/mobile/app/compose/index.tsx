import { ComplaintComposer } from '../../src/features/complaint/ComplaintComposer.tsx'

/**
 * `/compose` — entry route into the composer modal stack.
 *
 * In Phase 5 wave 1 the entire composer lives on a single screen (title +
 * body + category + constituency + photos). The multi-step layout
 * (compose/photos.tsx, compose/constituency.tsx, compose/review.tsx) from
 * the design doc lands in a later wave; the modal stack already exists
 * for it.
 */
export default function ComposeIndex() {
  return <ComplaintComposer />
}
