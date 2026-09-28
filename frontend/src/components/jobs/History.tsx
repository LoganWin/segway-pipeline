import { useHistory } from './queries'
import { formatDate, statusLabels } from './presentation'
import { QueryError } from './QueryError'

export function History({ applicationId }: { applicationId: number }) {
  const history = useHistory(applicationId)
  if (history.isPending) return <p role="status">Loading history…</p>
  if (history.isError) return <QueryError error={history.error} retry={() => void history.refetch()} />
  if (!history.data.length) return <p className="text-sm text-muted-foreground">No status history yet.</p>

  return (
    <ol aria-label="Status history" className="space-y-5 border-l pl-5">
      {history.data.map((event) => (
        <li key={event.id} className="space-y-1">
          <p className="text-sm font-medium">
            {event.from_status ? `${statusLabels[event.from_status]} → ` : 'Created → '}
            {statusLabels[event.to_status]}
          </p>
          <time dateTime={event.at} className="text-xs text-muted-foreground">{formatDate(event.at)}</time>
          {event.note && <p className="whitespace-pre-wrap break-words text-sm">{event.note}</p>}
        </li>
      ))}
    </ol>
  )
}
