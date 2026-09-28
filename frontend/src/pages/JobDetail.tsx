import { Link, useParams } from 'react-router'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { History } from '@/components/jobs/History'
import { JobForm } from '@/components/jobs/JobForm'
import { StatusControl } from '@/components/jobs/StatusControl'
import { QueryError } from '@/components/jobs/QueryError'
import { useJob } from '@/components/jobs/queries'

export function JobDetail() {
  const { id } = useParams<'id'>()
  const jobId = Number(id)
  const validId = Number.isSafeInteger(jobId) && jobId > 0
  const job = useJob(jobId)

  return (
    <section aria-labelledby="job-title" className="space-y-6">
      <Link to="/" className="text-sm text-muted-foreground underline underline-offset-4">Back to dashboard</Link>
      <h1 id="job-title" className="text-3xl font-semibold tracking-tight">Job details</h1>
      {!validId ? (
        <Card><CardContent className="space-y-2">
          <h2 className="font-medium">Job {id}</h2>
          <p role="alert">Invalid job ID. Choose a job from the dashboard.</p>
        </CardContent></Card>
      ) : job.isPending ? <p role="status">Loading job…</p> : job.isError ? (
        <QueryError error={job.error} retry={() => void job.refetch()} />
      ) : (
        <div key={job.data.id} className="space-y-6">
          <Card>
            <CardHeader><h2 className="break-words text-xl font-semibold">{job.data.title}</h2></CardHeader>
            <CardContent><JobForm job={job.data} /></CardContent>
          </Card>
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader><h2 className="text-lg font-semibold">Application status</h2></CardHeader>
              <CardContent><StatusControl application={job.data.application} /></CardContent>
            </Card>
            <Card>
              <CardHeader><h2 className="text-lg font-semibold">History</h2></CardHeader>
              <CardContent><History applicationId={job.data.application.id} /></CardContent>
            </Card>
          </div>
        </div>
      )}
    </section>
  )
}
