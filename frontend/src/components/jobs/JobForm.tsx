import { useId, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useSaveJob, type Job, type JobWrite } from './queries'

export function JobForm({ job, onSaved }: { job?: Job; onSaved?: (job: Job) => void }) {
  const prefix = useId()
  const [values, setValues] = useState<JobWrite>({
    title: job?.title ?? '',
    company: job?.company ?? '',
    url: job?.url ?? '',
    location: job?.location ?? '',
    description: job?.description ?? '',
    source: job?.source ?? null,
    ats_type: job?.ats_type ?? null,
  })
  const [validation, setValidation] = useState('')
  const save = useSaveJob(job?.id)

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!values.title.trim()) {
      setValidation('Enter a job title.')
      return
    }
    setValidation('')
    save.mutate({ ...values, title: values.title.trim(), url: values.url.trim() }, {
      onSuccess: (saved) => onSaved?.(saved),
    })
  }

  return (
    <form onSubmit={submit} className="space-y-4" aria-label={job ? 'Edit job' : 'Add job'}>
      <p className="text-sm text-muted-foreground">Only title is required.</p>
      <fieldset disabled={save.isPending} className="grid gap-4 sm:grid-cols-2">
        <legend className="sr-only">Job fields</legend>
        {([
          ['title', 'Title'],
          ['company', 'Company'],
          ['url', 'URL'],
          ['location', 'Location'],
        ] as const).map(([field, label]) => (
          <div key={field} className="space-y-2">
            <Label htmlFor={`${prefix}-${field}`}>{label}{field === 'title' ? ' (required)' : ''}</Label>
            <Input
              id={`${prefix}-${field}`}
              name={field}
              required={field === 'title'}
              value={values[field] ?? ''}
              onChange={(event) => {
                setValues({ ...values, [field]: event.target.value })
                setValidation('')
                save.reset()
              }}
            />
          </div>
        ))}
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor={`${prefix}-description`}>Description</Label>
          <Textarea id={`${prefix}-description`} name="description" rows={8}
            placeholder="Paste the job description here"
            value={values.description}
            onChange={(event) => {
              setValues({ ...values, description: event.target.value })
              save.reset()
            }}
          />
        </div>
      </fieldset>
      {validation && <p role="alert" className="text-sm text-destructive">{validation}</p>}
      {save.isError && <p role="alert" className="text-sm text-destructive">{save.error.message}</p>}
      {save.isSuccess && <p role="status" className="text-sm">Job saved.</p>}
      <Button type="submit" disabled={save.isPending}>
        {save.isPending ? 'Saving…' : job ? 'Save changes' : 'Add job'}
      </Button>
    </form>
  )
}
