import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { errorMessage, errorMessages, fieldErrors } from './api'
import { useReturnFocus } from './focus'

/** A labelled control with its 422 messages underneath. */
export function Field({
  label,
  name,
  error,
  children,
  className,
}: {
  label: string
  name: string
  error: unknown
  children: (props: {
    id: string
    'aria-invalid': boolean
    'aria-describedby': string | undefined
  }) => ReactNode
  className?: string
}) {
  const id = useId()
  const messages = fieldErrors(error, name)
  const errorId = `${id}-error`
  return (
    <div className={className ?? 'space-y-1.5'}>
      <Label htmlFor={id}>{label}</Label>
      {children({
        id,
        'aria-invalid': messages.length > 0,
        'aria-describedby': messages.length > 0 ? errorId : undefined,
      })}
      {messages.length > 0 && (
        <p id={errorId} className="text-sm text-destructive">
          {messages.join(' ')}
        </p>
      )}
    </div>
  )
}

/**
 * The error's `detail` message. Field-level 422 messages are shown by `Field`;
 * pass `withFields` where no form shows them, to list them here instead.
 */
export function ErrorMessage({
  error,
  withFields = false,
}: {
  error: unknown
  withFields?: boolean
}) {
  if (!error) return null
  const messages = withFields ? errorMessages(error) : [errorMessage(error)]
  return (
    <Alert variant="destructive">
      <AlertDescription>
        {messages.length === 1 ? (
          messages[0]
        ) : (
          <ul className="list-disc pl-4">
            {messages.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        )}
      </AlertDescription>
    </Alert>
  )
}

export function LoadingMessage({ children }: { children: ReactNode }) {
  return (
    <p role="status" className="text-sm text-muted-foreground">
      {children}
    </p>
  )
}

export function EmptyMessage({ children }: { children: ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>
}

/** A delete button that asks for confirmation inline before calling `onConfirm`. */
export function DeleteButton({
  label,
  onConfirm,
  pending,
}: {
  label: string
  onConfirm: () => void
  pending?: boolean
}) {
  const [confirming, setConfirming] = useState(false)
  const triggerRef = useReturnFocus<HTMLButtonElement>(confirming)
  const confirmRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (confirming) confirmRef.current?.focus()
  }, [confirming])

  if (!confirming) {
    return (
      <Button
        ref={triggerRef}
        type="button"
        variant="ghost"
        size="sm"
        aria-label={label}
        onClick={() => setConfirming(true)}
      >
        Delete
      </Button>
    )
  }
  return (
    <span className="inline-flex gap-1">
      <Button
        ref={confirmRef}
        type="button"
        variant="destructive"
        size="sm"
        aria-label={`Confirm ${label.toLowerCase()}`}
        disabled={pending}
        onClick={() => {
          setConfirming(false)
          onConfirm()
        }}
      >
        Confirm delete
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setConfirming(false)}
      >
        Cancel
      </Button>
    </span>
  )
}
