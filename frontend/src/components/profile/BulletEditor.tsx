import { useId, useState, type FormEvent } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  bulletInput,
  fieldErrors,
  optional,
  useBullets,
  useCreateBullet,
  useDeleteBullet,
  useSkills,
  useUpdateBullet,
  type Bullet,
  type BulletInput,
  type Skill,
} from './api'
import {
  DeleteButton,
  EmptyMessage,
  ErrorMessage,
  Field,
  LoadingMessage,
} from './shared'

/** The bullets of one experience: list, add, edit, delete, verify and tag with skills. */
export function BulletEditor({ experienceId }: { experienceId: number }) {
  const bullets = useBullets(experienceId)
  const skills = useSkills()
  const create = useCreateBullet(experienceId)
  const [adding, setAdding] = useState(false)

  const skillList = skills.data ?? []

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium">Bullets</h4>
      {bullets.isPending ? (
        <LoadingMessage>Loading bullets…</LoadingMessage>
      ) : bullets.isError ? (
        <ErrorMessage error={bullets.error} />
      ) : bullets.data.length === 0 ? (
        <EmptyMessage>No bullets yet.</EmptyMessage>
      ) : (
        <ul className="space-y-2">
          {bullets.data.map((bullet) => (
            <BulletItem
              key={bullet.id}
              bullet={bullet}
              experienceId={experienceId}
              skills={skillList}
            />
          ))}
        </ul>
      )}
      {skills.isError && <ErrorMessage error={skills.error} />}
      {adding ? (
        <BulletForm
          skills={skillList}
          submitLabel="Add bullet"
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
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setAdding(true)}
        >
          Add bullet
        </Button>
      )}
    </div>
  )
}

function BulletItem({
  bullet,
  experienceId,
  skills,
}: {
  bullet: Bullet
  experienceId: number
  skills: Skill[]
}) {
  const update = useUpdateBullet(experienceId)
  const remove = useDeleteBullet(experienceId)
  const [editing, setEditing] = useState(false)
  const verifiedId = useId()

  const skillNames = new Map(skills.map((skill) => [skill.id, skill.name]))

  if (editing) {
    return (
      <li className="rounded-md border p-3">
        <BulletForm
          initial={bullet}
          skills={skills}
          submitLabel="Save bullet"
          pending={update.isPending}
          error={update.error}
          onCancel={() => {
            setEditing(false)
            update.reset()
          }}
          onSubmit={(body) =>
            update.mutate(
              { id: bullet.id, body },
              { onSuccess: () => setEditing(false) },
            )
          }
        />
      </li>
    )
  }

  return (
    <li
      aria-label={`Bullet: ${bullet.text}`}
      className="space-y-2 rounded-md border p-3"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-sm">{bullet.text}</p>
          {bullet.metrics && (
            <p className="text-xs text-muted-foreground">
              Metrics: {bullet.metrics}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setEditing(true)}
          >
            Edit
          </Button>
          <DeleteButton
            label="Delete bullet"
            pending={remove.isPending}
            onConfirm={() => remove.mutate(bullet.id)}
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Switch
            id={verifiedId}
            checked={bullet.verified}
            disabled={update.isPending}
            // PUT replaces the whole bullet, so send every field with the new flag.
            onCheckedChange={(verified) =>
              update.mutate({
                id: bullet.id,
                body: { ...bulletInput(bullet), verified },
              })
            }
          />
          <Label htmlFor={verifiedId} className="text-xs">
            Verified
          </Label>
        </div>
        {bullet.skill_ids.map((id) => (
          <Badge key={id} variant="secondary">
            {skillNames.get(id) ?? `Skill #${id}`}
          </Badge>
        ))}
      </div>
      <ErrorMessage error={update.error ?? remove.error} />
    </li>
  )
}

function BulletForm({
  initial,
  skills,
  submitLabel,
  pending,
  error,
  onSubmit,
  onCancel,
}: {
  initial?: Bullet
  skills: Skill[]
  submitLabel: string
  pending: boolean
  error: unknown
  onSubmit: (body: BulletInput) => void
  onCancel: () => void
}) {
  const [text, setText] = useState(initial?.text ?? '')
  const [metrics, setMetrics] = useState(initial?.metrics ?? '')
  const [verified, setVerified] = useState(initial?.verified ?? false)
  const [skillIds, setSkillIds] = useState<number[]>(initial?.skill_ids ?? [])
  const verifiedId = useId()

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    onSubmit({
      text,
      metrics: optional(metrics),
      verified,
      skill_ids: skillIds,
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      aria-label={initial ? 'Edit bullet' : 'New bullet'}
      className="space-y-3"
    >
      <Field label="Bullet text" name="text" error={error}>
        {(props) => (
          <Textarea
            {...props}
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            required
          />
        )}
      </Field>
      <Field label="Metrics" name="metrics" error={error}>
        {(props) => (
          <Input
            {...props}
            value={metrics}
            onChange={(e) => setMetrics(e.target.value)}
          />
        )}
      </Field>
      <div className="flex items-center gap-2">
        <Checkbox
          id={verifiedId}
          checked={verified}
          onCheckedChange={(checked) => setVerified(checked === true)}
        />
        <Label htmlFor={verifiedId}>Verified</Label>
      </div>
      <SkillPicker
        skills={skills}
        selected={skillIds}
        onChange={setSkillIds}
        errors={fieldErrors(error, 'skill_ids')}
      />
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

/** Multi-select of skills, as a group of checkboxes. */
function SkillPicker({
  skills,
  selected,
  onChange,
  errors,
}: {
  skills: Skill[]
  selected: number[]
  onChange: (ids: number[]) => void
  errors: string[]
}) {
  const baseId = useId()
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">Skills</legend>
      {skills.length === 0 ? (
        <EmptyMessage>
          No skills yet. Add some in the Skills section to tag this bullet.
        </EmptyMessage>
      ) : (
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {skills.map((skill) => {
            const id = `${baseId}-${skill.id}`
            return (
              <div key={skill.id} className="flex items-center gap-2">
                <Checkbox
                  id={id}
                  checked={selected.includes(skill.id)}
                  onCheckedChange={(checked) =>
                    onChange(
                      checked === true
                        ? [...selected, skill.id]
                        : selected.filter((s) => s !== skill.id),
                    )
                  }
                />
                <Label htmlFor={id} className="font-normal">
                  {skill.name}
                </Label>
              </div>
            )
          })}
        </div>
      )}
      {errors.length > 0 && (
        <p className="text-sm text-destructive">{errors.join(' ')}</p>
      )}
    </fieldset>
  )
}
