import { useId, useState, type ReactNode } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { errorMessage, fieldErrors } from './api'

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

/** The error's `detail` message; field-level 422 messages are shown by `Field`. */
export function ErrorMessage({ error }: { error: unknown }) {
  if (!error) return null
  return (
    <Alert variant="destructive">
      <AlertDescription>{errorMessage(error)}</AlertDescription>
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
  if (!confirming) {
    return (
      <Button
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
        type="button"
        variant="destructive"
        size="sm"
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
