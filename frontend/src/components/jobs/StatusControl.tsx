import { useId, useState, type FormEvent } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { useChangeStatus, type Application } from './queries'
import { statusLabels } from './presentation'

/**
 * Moves an application to another status. The choices are exactly the
 * API's `allowed_transitions`; the transition policy lives only on the server.
 */
export function StatusControl({ application }: { application: Application }) {
  const prefix = useId()
  const [selected, setSelected] = useState('')
  const [note, setNote] = useState('')
  const change = useChangeStatus(application)
  const destination = application.allowed_transitions.find(
    (status) => status === selected,
  )

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!destination) return
    change.mutate(
      { to_status: destination, note: note.trim() || null },
      {
        onSuccess: () => {
          setSelected('')
          setNote('')
        },
      },
    )
  }

  return (
    <div className="space-y-4">
      <p className="flex items-center gap-2 text-sm">
        Current status:
        <Badge variant="secondary">{statusLabels[application.status]}</Badge>
      </p>
      {application.allowed_transitions.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          This application is closed; no further status changes are available.
        </p>
      ) : (
        <form
          onSubmit={submit}
          aria-label="Change status"
          className="space-y-4"
        >
          <fieldset disabled={change.isPending} className="space-y-4">
            <legend className="sr-only">Status change</legend>
            <div className="space-y-2">
              <Label htmlFor={`${prefix}-status`}>New status</Label>
              <NativeSelect
                id={`${prefix}-status`}
                value={destination ?? ''}
                onChange={(event) => {
                  setSelected(event.target.value)
                  change.reset()
                }}
              >
                <NativeSelectOption value="" disabled>
                  Choose a status
                </NativeSelectOption>
                {application.allowed_transitions.map((status) => (
                  <NativeSelectOption key={status} value={status}>
                    {statusLabels[status]}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${prefix}-note`}>Note (optional)</Label>
              <Input
                id={`${prefix}-note`}
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </div>
          </fieldset>
          <Button type="submit" disabled={!destination || change.isPending}>
            {change.isPending ? 'Updating…' : 'Update status'}
          </Button>
        </form>
      )}
      {change.isError && (
        <p role="alert" className="text-sm text-destructive">
          {change.error.message}
        </p>
      )}
      <p role="status" className="text-sm text-muted-foreground">
        {change.isSuccess ? 'Status updated.' : ''}
      </p>
    </div>
  )
}
