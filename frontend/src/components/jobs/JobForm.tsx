import { useId, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useSaveJob, type Job, type JobWrite } from './queries'

type Values = {
  title: string
  company: string
  url: string
  location: string
  description: string
}
type Field = keyof Values

// The API requires only a non-empty title (JobWrite); the URL and the rest are optional.
const fields: {
  name: Exclude<Field, 'description'>
  label: string
  required: boolean
  type?: string
}[] = [
  { name: 'title', label: 'Title', required: true },
  { name: 'company', label: 'Company', required: false },
  { name: 'url', label: 'URL', required: false, type: 'url' },
  { name: 'location', label: 'Location', required: false },
]

function initialValues(job?: Job): Values {
  return {
    title: job?.title ?? '',
    company: job?.company ?? '',
    url: job?.url ?? '',
    location: job?.location ?? '',
    description: job?.description ?? '',
  }
}

function missingFields(values: Values): Partial<Record<Field, string>> {
  const errors: Partial<Record<Field, string>> = {}
  if (!values.title.trim()) errors.title = 'Enter a job title.'
  return errors
}

export function JobForm({
  job,
  onSaved,
}: {
  job?: Job
  onSaved?: (job: Job) => void
}) {
  const prefix = useId()
  const [values, setValues] = useState(() => initialValues(job))
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({})
  const save = useSaveJob(job?.id)

  function update(field: Field, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
    if (!save.isPending) save.reset()
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const found = missingFields(values)
    setErrors(found)
    if (Object.keys(found).length) return
    const body: JobWrite = {
      title: values.title.trim(),
      url: values.url.trim(),
      company: values.company.trim(),
      location: values.location.trim() || null,
      description: values.description,
      // PUT replaces the job, so keep fields this form doesn't edit.
      source: job?.source ?? null,
      ats_type: job?.ats_type ?? null,
    }
    save.mutate(body, { onSuccess: (saved) => onSaved?.(saved) })
  }

  const id = (field: Field) => `${prefix}-${field}`

  return (
    <form
      onSubmit={submit}
      noValidate
      className="space-y-4"
      aria-label={job ? 'Edit job' : 'Add job'}
    >
      <fieldset disabled={save.isPending} className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-sm text-muted-foreground sm:col-span-2">
          Fields marked * are required.
        </legend>
        {fields.map(({ name, label, required, type }) => (
          <div key={name} className="space-y-2">
            <Label htmlFor={id(name)}>
              {label}
              {required && (
                <span aria-hidden="true" className="text-destructive">
                  *
                </span>
              )}
            </Label>
            <Input
              id={id(name)}
              name={name}
              type={type ?? 'text'}
              required={required}
              aria-invalid={errors[name] ? true : undefined}
              aria-describedby={errors[name] ? `${id(name)}-error` : undefined}
              value={values[name]}
              onChange={(event) => update(name, event.target.value)}
            />
            {errors[name] && (
              <p id={`${id(name)}-error`} className="text-sm text-destructive">
                {errors[name]}
              </p>
            )}
          </div>
        ))}
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor={id('description')}>Description</Label>
          <Textarea
            id={id('description')}
            name="description"
            rows={8}
            placeholder="Paste the job description here"
            value={values.description}
            onChange={(event) => update('description', event.target.value)}
          />
        </div>
      </fieldset>
      {save.isError && (
        <p role="alert" className="text-sm text-destructive">
          {save.error.message}
        </p>
      )}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? 'Saving…' : job ? 'Save changes' : 'Add job'}
        </Button>
        <p role="status" className="text-sm text-muted-foreground">
          {save.isSuccess ? 'Job saved.' : ''}
        </p>
      </div>
    </form>
  )
}
