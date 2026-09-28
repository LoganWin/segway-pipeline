import { useId, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useTransition, type Application } from './queries'
import { statusLabels } from './presentation'

export function StatusControl({ application }: { application: Application }) {
  const prefix = useId()
  const [selected, setSelected] = useState('')
  const [note, setNote] = useState('')
  const transition = useTransition(application)
  const destination = application.allowed_transitions.find((status) => status === selected)

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!destination) return
    transition.mutate({ to_status: destination, note: note.trim() || null }, {
      onSuccess: () => { setSelected(''); setNote('') },
    })
  }

  return (
    <div className="space-y-4">
      <p>Current status: <Badge variant="secondary">{statusLabels[application.status]}</Badge></p>
      {application.allowed_transitions.length === 0 ? (
        <p className="text-sm text-muted-foreground">No status changes are available.</p>
      ) : (
        <form onSubmit={submit} aria-label="Change status" className="space-y-4">
          <fieldset disabled={transition.isPending} className="space-y-4">
            <legend className="sr-only">Status change</legend>
            <div className="space-y-2">
              <Label htmlFor={`${prefix}-status`}>New status</Label>
              <NativeSelect id={`${prefix}-status`} value={destination ?? ''} required
                onChange={(event) => { setSelected(event.target.value); transition.reset() }}>
                <NativeSelectOption value="" disabled>Choose a status</NativeSelectOption>
                {application.allowed_transitions.map((status) => (
                  <NativeSelectOption key={status} value={status}>{statusLabels[status]}</NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${prefix}-note`}>Note (optional)</Label>
              <Input id={`${prefix}-note`} value={note} onChange={(event) => setNote(event.target.value)} />
            </div>
          </fieldset>
          <Button type="submit" disabled={!destination || transition.isPending}>
            {transition.isPending ? 'Updating…' : 'Update status'}
          </Button>
        </form>
      )}
      {transition.isError && <p role="alert" className="text-sm text-destructive">{transition.error.message}</p>}
      {transition.isSuccess && <p role="status" className="text-sm">Status updated.</p>}
    </div>
  )
}
