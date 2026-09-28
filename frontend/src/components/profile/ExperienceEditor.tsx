import { useState, type FormEvent } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import {
  EXPERIENCE_KINDS,
  optional,
  useCreateExperience,
  useDeleteExperience,
  useExperiences,
  useUpdateExperience,
  type Experience,
  type ExperienceInput,
  type ExperienceKind,
} from './api'
import { BulletEditor } from './BulletEditor'
import {
  DeleteButton,
  EmptyMessage,
  ErrorMessage,
  Field,
  LoadingMessage,
} from './shared'
import { useReturnFocus } from './focus'

const KIND_LABELS: Record<ExperienceKind, string> = {
  job: 'Job',
  project: 'Project',
  education: 'Education',
}

/** All experiences, each with its bullets underneath. */
export function ExperienceEditor() {
  const experiences = useExperiences()
  const create = useCreateExperience()
  const [adding, setAdding] = useState(false)
  const addRef = useReturnFocus<HTMLButtonElement>(adding)

  return (
    <section aria-labelledby="experiences-title" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="experiences-title" className="text-xl font-semibold">
          Experiences
        </h2>
        {!adding && (
          <Button ref={addRef} type="button" onClick={() => setAdding(true)}>
            Add experience
          </Button>
        )}
      </div>
      {adding && (
        <Card>
          <CardContent>
            <ExperienceForm
              submitLabel="Create experience"
              pending={create.isPending}
              error={create.error}
              onCancel={() => {
                setAdding(false)
                create.reset()
              }}
              onSubmit={(body) =>
                create.mutate(body, { onSuccess: () => setAdding(false) })
              }
            />
          </CardContent>
        </Card>
      )}
      {experiences.isPending ? (
        <LoadingMessage>Loading experiences…</LoadingMessage>
      ) : experiences.isError ? (
        <ErrorMessage error={experiences.error} />
      ) : experiences.data.length === 0 ? (
        !adding && (
          <EmptyMessage>
            No experiences yet. Add your jobs, projects and education.
          </EmptyMessage>
        )
      ) : (
        <div className="space-y-4">
          {experiences.data.map((experience) => (
            <ExperienceItem key={experience.id} experience={experience} />
          ))}
        </div>
      )}
    </section>
  )
}

function formatDates(experience: Experience): string | null {
  const { start_date: start, end_date: end } = experience
  if (!start && !end) return null
  return `${start ?? '?'} – ${end ?? 'present'}`
}

function ExperienceItem({ experience }: { experience: Experience }) {
  const update = useUpdateExperience()
  const remove = useDeleteExperience()
  const [editing, setEditing] = useState(false)
  const editRef = useReturnFocus<HTMLButtonElement>(editing)
  const dates = formatDates(experience)
  const details = [dates, experience.location].filter(Boolean).join(' · ')

  return (
    <Card
      role="article"
      aria-label={`${experience.title} at ${experience.org}`}
    >
      {editing ? (
        <CardContent>
          <ExperienceForm
            initial={experience}
            submitLabel="Save experience"
            pending={update.isPending}
            error={update.error}
            onCancel={() => {
              setEditing(false)
              update.reset()
            }}
            onSubmit={(body) =>
              update.mutate(
                { id: experience.id, body },
                { onSuccess: () => setEditing(false) },
              )
            }
          />
        </CardContent>
      ) : (
        <CardHeader>
          <CardTitle role="heading" aria-level={3}>
            {experience.title}
          </CardTitle>
          <CardDescription className="flex flex-wrap items-center gap-2">
            <span>{experience.org}</span>
            <Badge variant="outline">{KIND_LABELS[experience.kind]}</Badge>
            {details && <span>{details}</span>}
          </CardDescription>
          <CardAction className="flex gap-1">
            <Button
              ref={editRef}
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setEditing(true)}
            >
              Edit
            </Button>
            <DeleteButton
              label="Delete experience"
              pending={remove.isPending}
              onConfirm={() => remove.mutate(experience.id)}
            />
          </CardAction>
        </CardHeader>
      )}
      <CardContent className="space-y-3">
        <ErrorMessage error={remove.error} />
        <BulletEditor experienceId={experience.id} />
      </CardContent>
    </Card>
  )
}

function ExperienceForm({
  initial,
  submitLabel,
  pending,
  error,
  onSubmit,
  onCancel,
}: {
  initial?: Experience
  submitLabel: string
  pending: boolean
  error: unknown
  onSubmit: (body: ExperienceInput) => void
  onCancel: () => void
}) {
  const [kind, setKind] = useState<ExperienceKind>(initial?.kind ?? 'job')
  const [org, setOrg] = useState(initial?.org ?? '')
  const [title, setTitle] = useState(initial?.title ?? '')
  const [startDate, setStartDate] = useState(initial?.start_date ?? '')
  const [endDate, setEndDate] = useState(initial?.end_date ?? '')
  const [location, setLocation] = useState(initial?.location ?? '')

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    onSubmit({
      kind,
      org,
      title,
      start_date: optional(startDate),
      end_date: optional(endDate),
      location: optional(location),
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      aria-label={initial ? 'Edit experience' : 'New experience'}
      className="space-y-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Kind" name="kind" error={error}>
          {(props) => (
            <NativeSelect
              {...props}
              value={kind}
              onChange={(e) =>
                setKind(
                  EXPERIENCE_KINDS.find((k) => k === e.target.value) ?? 'job',
                )
              }
            >
              {EXPERIENCE_KINDS.map((k) => (
                <NativeSelectOption key={k} value={k}>
                  {KIND_LABELS[k]}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          )}
        </Field>
        <Field label="Organization" name="org" error={error}>
          {(props) => (
            <Input
              {...props}
              value={org}
              onChange={(e) => setOrg(e.target.value)}
              required
              autoFocus
            />
          )}
        </Field>
        <Field label="Title" name="title" error={error}>
          {(props) => (
            <Input
              {...props}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          )}
        </Field>
        <Field label="Location" name="location" error={error}>
          {(props) => (
            <Input
              {...props}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          )}
        </Field>
        <Field label="Start date" name="start_date" error={error}>
          {(props) => (
            <Input
              {...props}
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          )}
        </Field>
        <Field label="End date" name="end_date" error={error}>
          {(props) => (
            <Input
              {...props}
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          )}
        </Field>
      </div>
      <ErrorMessage error={error} />
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : submitLabel}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
