import { Link, useParams } from 'react-router'
import { Card, CardContent } from '@/components/ui/card'

export function JobDetail() {
  const { id } = useParams<'id'>()
  return (
    <section aria-labelledby="job-title" className="space-y-6">
      <Link
        to="/"
        className="text-sm text-muted-foreground underline underline-offset-4"
      >
        Back to dashboard
      </Link>
      <h1 id="job-title" className="text-3xl font-semibold tracking-tight">
        Job details
      </h1>
      <Card>
        <CardContent className="space-y-2">
          <h2 className="font-medium">Job {id}</h2>
          <p className="text-sm text-muted-foreground">
            Job information and application history will appear here.
          </p>
        </CardContent>
      </Card>
    </section>
  )
}
