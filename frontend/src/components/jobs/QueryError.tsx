import { Button } from '@/components/ui/button'

export function QueryError({
  error,
  retry,
}: {
  error: Error
  retry: () => void
}) {
  return (
    <div
      role="alert"
      className="space-y-3 rounded-md border border-destructive p-4"
    >
      <p>{error.message}</p>
      <Button variant="outline" onClick={retry}>
        Try again
      </Button>
    </div>
  )
}
