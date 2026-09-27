import { Card, CardContent } from '@/components/ui/card'

export function Dashboard() {
  return (
    <section aria-labelledby="dashboard-title" className="space-y-6">
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
      <Card>
        <CardContent className="space-y-2">
          <h2 className="font-medium">A place for your next step</h2>
          <p className="text-sm text-muted-foreground">
            Job tracking and application progress will appear here.
          </p>
        </CardContent>
      </Card>
    </section>
  )
}
