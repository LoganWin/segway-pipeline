import { useEffect, useRef } from 'react'

/**
 * A ref for the control that opens something (a form, a confirmation). When
 * `open` goes from true to false, focus returns to that control, since the
 * focused element inside the closed part has just unmounted.
 */
export function useReturnFocus<T extends HTMLElement>(open: boolean) {
  const ref = useRef<T>(null)
  const wasOpen = useRef(open)
  useEffect(() => {
    if (wasOpen.current && !open) ref.current?.focus()
    wasOpen.current = open
  }, [open])
  return ref
}
