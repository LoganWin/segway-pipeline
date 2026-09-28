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
import { Textarea } from '@/components/ui/textarea'
import {
  useAnswers,
  useCreateAnswer,
  useDeleteAnswer,
  useUpdateAnswer,
  type Answer,
  type AnswerInput,
} from './api'
import {
  DeleteButton,
  EmptyMessage,
  ErrorMessage,
  Field,
  LoadingMessage,
} from './shared'

export function AnswersEditor() {
  const answers = useAnswers()
  const create = useCreateAnswer()
  const [adding, setAdding] = useState(false)

  return (
    <Card aria-labelledby="answers-title">
      <CardHeader>
        <CardTitle id="answers-title" role="heading" aria-level={2}>
          Reusable answers
        </CardTitle>
        <CardDescription>
          Answers to common application questions, keyed for reuse.
        </CardDescription>
        {!adding && (
          <CardAction>
            <Button
              type="button"
              variant="outline"
              onClick={() => setAdding(true)}
            >
              Add answer
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {adding && (
          <AnswerForm
            submitLabel="Create answer"
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
        {answers.isPending ? (
          <LoadingMessage>Loading answers…</LoadingMessage>
        ) : answers.isError ? (
          <ErrorMessage error={answers.error} />
        ) : answers.data.length === 0 ? (
          <EmptyMessage>No reusable answers yet.</EmptyMessage>
        ) : (
          <ul className="divide-y">
            {answers.data.map((answer) => (
              <AnswerItem key={answer.id} answer={answer} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

function AnswerItem({ answer }: { answer: Answer }) {
  const update = useUpdateAnswer()
  const remove = useDeleteAnswer()
  const [editing, setEditing] = useState(false)

  if (editing) {
    return (
      <li className="py-3">
        <AnswerForm
          initial={answer}
          submitLabel="Save answer"
          pending={update.isPending}
          error={update.error}
          onCancel={() => {
            setEditing(false)
            update.reset()
          }}
          onSubmit={(body) =>
            update.mutate(
              { id: answer.id, body },
              { onSuccess: () => setEditing(false) },
            )
          }
        />
      </li>
    )
  }

  return (
    <li
      aria-label={`Answer: ${answer.question_key}`}
      className="space-y-2 py-3"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="font-mono text-xs text-muted-foreground">
            {answer.question_key}
          </p>
          <p className="text-sm whitespace-pre-line">{answer.text}</p>
        </div>
        <div className="flex gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setEditing(true)}
          >
            Edit
          </Button>
          <DeleteButton
            label={`Delete answer ${answer.question_key}`}
            pending={remove.isPending}
            onConfirm={() => remove.mutate(answer.id)}
          />
        </div>
      </div>
      <ErrorMessage error={remove.error} />
    </li>
  )
}

function AnswerForm({
  initial,
  submitLabel,
  pending,
  error,
  onSubmit,
  onCancel,
}: {
  initial?: Answer
  submitLabel: string
  pending: boolean
  error: unknown
  onSubmit: (body: AnswerInput) => void
  onCancel: () => void
}) {
  const [questionKey, setQuestionKey] = useState(initial?.question_key ?? '')
  const [text, setText] = useState(initial?.text ?? '')

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    onSubmit({ question_key: questionKey, text })
  }

  return (
    <form
      onSubmit={handleSubmit}
      aria-label={initial ? 'Edit answer' : 'New answer'}
      className="space-y-3"
    >
      <Field label="Question key" name="question_key" error={error}>
        {(props) => (
          <Input
            {...props}
            value={questionKey}
            onChange={(e) => setQuestionKey(e.target.value)}
            placeholder="e.g. why_this_company"
            required
          />
        )}
      </Field>
      <Field label="Answer" name="text" error={error}>
        {(props) => (
          <Textarea
            {...props}
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            required
          />
        )}
      </Field>
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
