import { AnswersEditor } from '@/components/profile/AnswersEditor'
import { ExperienceEditor } from '@/components/profile/ExperienceEditor'
import { ProfileForm } from '@/components/profile/ProfileForm'
import { SkillsEditor } from '@/components/profile/SkillsEditor'

export function Profile() {
  return (
    <section aria-labelledby="profile-title" className="space-y-8">
      <div>
        <p className="mb-2 text-sm text-muted-foreground">
          Your verified experience, in one place
        </p>
        <h1
          id="profile-title"
          className="text-3xl font-semibold tracking-tight"
        >
          Profile
        </h1>
      </div>
      <ProfileForm />
      <ExperienceEditor />
      <SkillsEditor />
      <AnswersEditor />
    </section>
  )
}
