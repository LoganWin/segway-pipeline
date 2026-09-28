import { useHistory } from './queries'
import { formatDate, statusLabels } from './presentation'
import { QueryError } from './QueryError'

export function History({ applicationId }: { applicationId: number }) {
  const history = useHistory(applicationId)
  if (history.isPending) {
    return (
      <p role="status" className="text-sm text-muted-foreground">
        Loading history…
      </p>
    )
  }
  if (history.isError) {
    return (
      <QueryError error={history.error} retry={() => void history.refetch()} />
    )
  }
  if (!history.data.length) {
    return (
      <p className="text-sm text-muted-foreground">No status history yet.</p>
    )
  }

  return (
    <ol aria-label="Status history" className="space-y-5 border-l pl-5">
      {history.data.map((event) => (
        <li key={event.id} className="relative space-y-1">
          <span
            aria-hidden="true"
            className="absolute top-1.5 -left-[25px] size-2.5 rounded-full border-2 border-background bg-primary"
          />
          <p className="text-sm font-medium">
            {event.from_status
              ? `${statusLabels[event.from_status]} → ${statusLabels[event.to_status]}`
              : `Added as ${statusLabels[event.to_status]}`}
          </p>
          <time
            dateTime={event.at}
            className="block text-xs text-muted-foreground"
          >
            {formatDate(event.at)}
          </time>
          {event.note && (
            <p className="text-sm break-words whitespace-pre-wrap">
              {event.note}
            </p>
          )}
        </li>
      ))}
    </ol>
  )
}
