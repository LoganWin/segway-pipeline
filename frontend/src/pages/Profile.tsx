import { Card, CardContent } from '@/components/ui/card'

export function Profile() {
  return (
    <section aria-labelledby="profile-title" className="space-y-6">
      <h1 id="profile-title" className="text-3xl font-semibold tracking-tight">
        Profile
      </h1>
      <Card>
        <CardContent className="space-y-2">
          <h2 className="font-medium">Your experience, in one place</h2>
          <p className="text-sm text-muted-foreground">
            Your profile, verified experience, skills, and reusable answers will
            appear here.
          </p>
        </CardContent>
      </Card>
    </section>
  )
}
