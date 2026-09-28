import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { JobForm } from '@/components/jobs/JobForm'
import { QueryError } from '@/components/jobs/QueryError'
import { useJobs, type Status } from '@/components/jobs/queries'
import {
  formatDate,
  statuses,
  statusLabels,
} from '@/components/jobs/presentation'

export function Dashboard() {
  const [status, setStatus] = useState<Status>()
  const [view, setView] = useState<'table' | 'board'>('table')
  const [adding, setAdding] = useState(false)
  const jobs = useJobs(status)
  const navigate = useNavigate()

  return (
    <section aria-labelledby="dashboard-title" className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="mb-2 text-sm text-muted-foreground">
            Your application workspace
          </p>
          <h1
            id="dashboard-title"
            className="text-3xl font-semibold tracking-tight"
          >
            Dashboard
          </h1>
        </div>
        <Button
          onClick={() => setAdding(!adding)}
          aria-expanded={adding}
          aria-controls="add-job-panel"
        >
          {/* A stable label: aria-expanded already says whether it's open. */}
          New job
        </Button>
      </div>
      {adding && (
        <Card id="add-job-panel">
          <CardHeader>
            <h2 className="text-lg font-semibold">Add a job</h2>
          </CardHeader>
          <CardContent>
            <JobForm onSaved={(job) => void navigate(`/jobs/${job.id}`)} />
          </CardContent>
        </Card>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <Label htmlFor="status-filter">Filter by status</Label>
          <NativeSelect
            id="status-filter"
            value={status ?? ''}
            onChange={(event) =>
              setStatus(statuses.find((item) => item === event.target.value))
            }
          >
            <NativeSelectOption value="">All statuses</NativeSelectOption>
            {statuses.map((item) => (
              <NativeSelectOption key={item} value={item}>
                {statusLabels[item]}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        <div role="group" aria-label="View" className="flex gap-2">
          <Button
            variant={view === 'table' ? 'secondary' : 'outline'}
            aria-pressed={view === 'table'}
            onClick={() => setView('table')}
          >
            Table
          </Button>
          <Button
            variant={view === 'board' ? 'secondary' : 'outline'}
            aria-pressed={view === 'board'}
            onClick={() => setView('board')}
          >
            Board
          </Button>
        </div>
      </div>
      {jobs.isPending ? (
        <p role="status">Loading jobs…</p>
      ) : jobs.isError ? (
        <QueryError error={jobs.error} retry={() => void jobs.refetch()} />
      ) : jobs.data.length === 0 ? (
        <Card>
          <CardContent className="space-y-2">
            <h2 className="font-medium">
              {status ? 'No jobs with this status' : 'No jobs yet'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {status
                ? 'Choose another status or add a job to get started.'
                : 'Add a job to start tracking your next opportunity.'}
            </p>
          </CardContent>
        </Card>
      ) : view === 'table' ? (
        <div className="rounded-lg border">
          <Table>
            <caption className="sr-only">
              Tracked jobs, most recently updated first
            </caption>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.data.map((job) => (
                <TableRow key={job.id}>
                  <TableCell className="max-w-48 whitespace-normal break-words">
                    {job.company || '—'}
                  </TableCell>
                  <TableCell className="max-w-72 whitespace-normal break-words">
                    <Link
                      to={`/jobs/${job.id}`}
                      className="font-medium underline underline-offset-4"
                    >
                      {job.title}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {statusLabels[job.application.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <time dateTime={job.updated_at}>
                      {formatDate(job.updated_at)}
                    </time>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(status ? [status] : statuses).map((item) => {
            const group = jobs.data.filter(
              (job) => job.application.status === item,
            )
            return (
              <section
                key={item}
                aria-labelledby={`board-${item}`}
                className="space-y-3 rounded-xl border bg-muted/40 p-4"
              >
                <h2
                  id={`board-${item}`}
                  className="flex items-center justify-between gap-2 text-sm font-semibold"
                >
                  {statusLabels[item]}{' '}
                  <Badge variant="outline">{group.length}</Badge>
                </h2>
                {group.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No jobs in this status.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {group.map((job) => (
                      <li
                        key={job.id}
                        className="space-y-2 rounded-lg border bg-card p-4"
                      >
                        <Link
                          to={`/jobs/${job.id}`}
                          className="block break-words font-medium underline underline-offset-4"
                        >
                          {job.title}
                        </Link>
                        <p className="break-words text-sm text-muted-foreground">
                          {job.company || 'Company not specified'}
                        </p>
                        <time
                          dateTime={job.updated_at}
                          className="text-xs text-muted-foreground"
                        >
                          {formatDate(job.updated_at)}
                        </time>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )
          })}
        </div>
      )}
    </section>
  )
}
