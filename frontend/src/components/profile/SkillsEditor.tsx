import { useState, type FormEvent } from 'react'
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
import {
  optional,
  useCreateSkill,
  useDeleteSkill,
  useSkills,
  useUpdateSkill,
  type Skill,
  type SkillInput,
} from './api'
import {
  DeleteButton,
  EmptyMessage,
  ErrorMessage,
  Field,
  LoadingMessage,
} from './shared'
import { useReturnFocus } from './focus'

export function SkillsEditor() {
  const skills = useSkills()
  const create = useCreateSkill()
  const [adding, setAdding] = useState(false)
  const addRef = useReturnFocus<HTMLButtonElement>(adding)

  return (
    <Card aria-labelledby="skills-title">
      <CardHeader>
        <CardTitle id="skills-title" role="heading" aria-level={2}>
          Skills
        </CardTitle>
        <CardDescription>
          Skills you can tag on experience bullets.
        </CardDescription>
        {!adding && (
          <CardAction>
            <Button
              ref={addRef}
              type="button"
              variant="outline"
              onClick={() => setAdding(true)}
            >
              Add skill
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {adding && (
          <SkillForm
            submitLabel="Create skill"
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
        )}
        {skills.isPending ? (
          <LoadingMessage>Loading skills…</LoadingMessage>
        ) : skills.isError ? (
          <ErrorMessage error={skills.error} />
        ) : skills.data.length === 0 ? (
          <EmptyMessage>No skills yet.</EmptyMessage>
        ) : (
          <ul className="divide-y">
            {skills.data.map((skill) => (
              <SkillItem key={skill.id} skill={skill} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

function SkillItem({ skill }: { skill: Skill }) {
  const update = useUpdateSkill()
  const remove = useDeleteSkill()
  const [editing, setEditing] = useState(false)
  const editRef = useReturnFocus<HTMLButtonElement>(editing)

  if (editing) {
    return (
      <li className="py-3">
        <SkillForm
          initial={skill}
          submitLabel="Save skill"
          pending={update.isPending}
          error={update.error}
          onCancel={() => {
            setEditing(false)
            update.reset()
          }}
          onSubmit={(body) =>
            update.mutate(
              { id: skill.id, body },
              { onSuccess: () => setEditing(false) },
            )
          }
        />
      </li>
    )
  }

  const details = [skill.category, skill.proficiency].filter(Boolean)
  return (
    <li aria-label={`Skill: ${skill.name}`} className="space-y-2 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">{skill.name}</p>
          {details.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {details.join(' · ')}
            </p>
          )}
        </div>
        <div className="flex gap-1">
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
            label={`Delete skill ${skill.name}`}
            pending={remove.isPending}
            onConfirm={() => remove.mutate(skill.id)}
          />
        </div>
      </div>
      <ErrorMessage error={remove.error} />
    </li>
  )
}

function SkillForm({
  initial,
  submitLabel,
  pending,
  error,
  onSubmit,
  onCancel,
}: {
  initial?: Skill
  submitLabel: string
  pending: boolean
  error: unknown
  onSubmit: (body: SkillInput) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [category, setCategory] = useState(initial?.category ?? '')
  const [proficiency, setProficiency] = useState(initial?.proficiency ?? '')

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    onSubmit({
      name,
      category: optional(category),
      proficiency: optional(proficiency),
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      aria-label={initial ? 'Edit skill' : 'New skill'}
      className="space-y-3"
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Skill name" name="name" error={error}>
          {(props) => (
            <Input
              {...props}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          )}
        </Field>
        <Field label="Category" name="category" error={error}>
          {(props) => (
            <Input
              {...props}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
          )}
        </Field>
        <Field label="Proficiency" name="proficiency" error={error}>
          {(props) => (
            <Input
              {...props}
              value={proficiency}
              onChange={(e) => setProficiency(e.target.value)}
            />
          )}
        </Field>
      </div>
      <ErrorMessage error={error} />
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? 'Saving…' : submitLabel}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
