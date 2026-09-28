import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { optional, useProfile, useSaveProfile, type Profile } from './api'
import { ErrorMessage, Field, LoadingMessage } from './shared'

export function ProfileForm() {
  const profile = useProfile()
  // Owned here so the result survives the re-mount after a save.
  const save = useSaveProfile()
  return (
    <Card aria-labelledby="contact-title">
      <CardHeader>
        <CardTitle id="contact-title" role="heading" aria-level={2}>
          Contact details
        </CardTitle>
        <CardDescription>
          Who you are and how employers can reach you.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {profile.isPending ? (
          <LoadingMessage>Loading profile…</LoadingMessage>
        ) : profile.isError ? (
          <ErrorMessage error={profile.error} />
        ) : (
          // Re-mount when the saved profile changes so the fields start from it.
          <ProfileFields
            key={profile.data?.updated_at ?? 'new'}
            profile={profile.data}
            save={save}
          />
        )}
      </CardContent>
    </Card>
  )
}

function ProfileFields({
  profile,
  save,
}: {
  profile: Profile | null
  save: ReturnType<typeof useSaveProfile>
}) {
  const [name, setName] = useState(profile?.name ?? '')
  const [email, setEmail] = useState(profile?.email ?? '')
  const [phone, setPhone] = useState(profile?.phone ?? '')
  const [location, setLocation] = useState(profile?.location ?? '')
  const [links, setLinks] = useState(profile?.links.join('\n') ?? '')
  const [workAuthorization, setWorkAuthorization] = useState(
    profile?.work_authorization ?? '',
  )

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    save.mutate({
      name,
      email,
      phone: optional(phone),
      location: optional(location),
      links: links
        .split('\n')
        .map((link) => link.trim())
        .filter(Boolean),
      work_authorization: optional(workAuthorization),
    })
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" aria-label="Profile">
      {!profile && (
        <p className="text-sm text-muted-foreground">
          You haven't saved a profile yet. Fill in the fields below to create
          one.
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" name="name" error={save.error}>
          {(props) => (
            <Input
              {...props}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          )}
        </Field>
        <Field label="Email" name="email" error={save.error}>
          {(props) => (
            <Input
              {...props}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          )}
        </Field>
        <Field label="Phone" name="phone" error={save.error}>
          {(props) => (
            <Input
              {...props}
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          )}
        </Field>
        <Field label="Location" name="location" error={save.error}>
          {(props) => (
            <Input
              {...props}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          )}
        </Field>
        <Field
          label="Work authorization"
          name="work_authorization"
          error={save.error}
        >
          {(props) => (
            <Input
              {...props}
              value={workAuthorization}
              onChange={(e) => setWorkAuthorization(e.target.value)}
            />
          )}
        </Field>
        <Field label="Links (one per line)" name="links" error={save.error}>
          {(props) => (
            <Textarea
              {...props}
              value={links}
              onChange={(e) => setLinks(e.target.value)}
              rows={3}
            />
          )}
        </Field>
      </div>
      <ErrorMessage error={save.error} />
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? 'Saving…' : 'Save profile'}
        </Button>
        {save.isSuccess && (
          <span role="status" className="text-sm text-muted-foreground">
            Saved.
          </span>
        )}
      </div>
    </form>
  )
}
