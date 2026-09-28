import {
  notifyManager,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
} from '@tanstack/react-query'
import { api } from '@/api/client'
import type { components } from '@/api/schema'

type Schemas = components['schemas']

export type Profile = Schemas['ProfileResponse']
export type ProfileInput = Schemas['ProfileRequest']
export type Experience = Schemas['ExperienceResponse']
export type ExperienceInput = Schemas['ExperienceRequest']
export type ExperienceKind = Schemas['ExperienceKind']
export type Bullet = Schemas['BulletResponse']
export type BulletInput = Schemas['BulletRequest']
export type Skill = Schemas['SkillResponse']
export type SkillInput = Schemas['SkillRequest']
export type Answer = Schemas['AnswerResponse']
export type AnswerInput = Schemas['AnswerRequest']
type ValidationIssue = Schemas['ValidationError']

export const EXPERIENCE_KINDS: readonly ExperienceKind[] = [
  'job',
  'project',
  'education',
]

/**
 * A failed API call. `fieldErrors` holds 422 messages keyed by the request-body
 * field they point at (`loc` without the leading "body"); anything that can't be
 * tied to a field is in `message`.
 */
export class ApiError extends Error {
  readonly status: number
  readonly fieldErrors: Readonly<Record<string, string[]>>
  /** Messages not tied to a field (for a 422, `message` falls back to a generic hint without them). */
  readonly generalMessages: readonly string[]

  constructor(
    status: number,
    message: string,
    fieldErrors: Record<string, string[]> = {},
    generalMessages: string[] = [message],
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fieldErrors = fieldErrors
    this.generalMessages = generalMessages
  }
}

function isValidationIssue(value: unknown): value is ValidationIssue {
  return (
    typeof value === 'object' &&
    value !== null &&
    'loc' in value &&
    Array.isArray(value.loc) &&
    'msg' in value &&
    typeof value.msg === 'string'
  )
}

/** Turns an ErrorResponse (404/409) or HTTPValidationError (422) body into an ApiError. */
export function toApiError(status: number, body: unknown): ApiError {
  const detail =
    typeof body === 'object' && body !== null && 'detail' in body
      ? body.detail
      : undefined
  if (typeof detail === 'string' && detail) return new ApiError(status, detail)
  // Entries that aren't `{loc: [...], msg: string}` are skipped; if none are
  // left, fall back to the generic message below.
  const issues = Array.isArray(detail) ? detail.filter(isValidationIssue) : []
  if (issues.length > 0) {
    const byField: Record<string, string[]> = {}
    const general: string[] = []
    for (const issue of issues) {
      const path = issue.loc.slice(issue.loc[0] === 'body' ? 1 : 0)
      const field = path.join('.')
      if (issue.loc[0] === 'body' && field) {
        byField[field] = [...(byField[field] ?? []), issue.msg]
      } else {
        general.push(field ? `${field}: ${issue.msg}` : issue.msg)
      }
    }
    const message =
      general.length > 0
        ? general.join('; ')
        : 'Please correct the highlighted fields.'
    return new ApiError(status, message, byField, general)
  }
  return new ApiError(status, `Request failed (HTTP ${status}).`)
}

/** The 422 messages for one request-body field (empty if there are none). */
export function fieldErrors(error: unknown, field: string): string[] {
  return error instanceof ApiError ? (error.fieldErrors[field] ?? []) : []
}

/** Trims a text input; empty means "not set". */
export function optional(value: string): string | null {
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong.'
}

/**
 * Every message in the error, with field-level 422 messages spelled out as
 * `field: message`. For places where no form shows the fields.
 */
export function errorMessages(error: unknown): string[] {
  if (!(error instanceof ApiError)) return [errorMessage(error)]
  const fields = Object.entries(error.fieldErrors).flatMap(([field, msgs]) =>
    msgs.map((msg) => `${field}: ${msg}`),
  )
  if (fields.length === 0) return [error.message]
  return [...error.generalMessages, ...fields]
}

type FetchResult<T> = { data?: T; error?: unknown; response: Response }

async function unwrap<T>(request: Promise<FetchResult<T>>): Promise<T> {
  const { data, error, response } = await request
  if (!response.ok) throw toApiError(response.status, error)
  return data as T
}

export const profileKeys = {
  profile: ['profile'] as const,
  experiences: ['experiences'] as const,
  bullets: (experienceId: number) => ['bullets', experienceId] as const,
  allBullets: ['bullets'] as const,
  skills: ['skills'] as const,
  answers: ['answers'] as const,
}

function useInvalidate() {
  const queryClient = useQueryClient()
  return (...keys: QueryKey[]) =>
    Promise.all(
      keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
    )
}

// Profile ------------------------------------------------------------------

/** Resolves to `null` while no profile has been saved yet (GET returns 404). */
export function useProfile() {
  return useQuery({
    queryKey: profileKeys.profile,
    queryFn: async (): Promise<Profile | null> => {
      const { data, error, response } = await api.GET('/api/profile')
      if (response.status === 404) return null
      if (!response.ok || !data) throw toApiError(response.status, error)
      return data
    },
  })
}

export function useSaveProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: ProfileInput) =>
      unwrap(api.PUT('/api/profile', { body })),
    onSuccess: (profile) =>
      queryClient.setQueryData(profileKeys.profile, profile),
  })
}

// Experiences ---------------------------------------------------------------

export function useExperiences() {
  return useQuery({
    queryKey: profileKeys.experiences,
    queryFn: () => unwrap(api.GET('/api/experiences')),
  })
}

export function useCreateExperience() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (body: ExperienceInput) =>
      unwrap(api.POST('/api/experiences', { body })),
    onSuccess: () => invalidate(profileKeys.experiences),
  })
}

export function useUpdateExperience() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: ExperienceInput }) =>
      unwrap(
        api.PUT('/api/experiences/{experience_id}', {
          params: { path: { experience_id: id } },
          body,
        }),
      ),
    onSuccess: () => invalidate(profileKeys.experiences),
  })
}

export function useDeleteExperience() {
  const queryClient = useQueryClient()
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (id: number) =>
      unwrap(
        api.DELETE('/api/experiences/{experience_id}', {
          params: { path: { experience_id: id } },
        }),
      ),
    onSuccess: (_data, id) => {
      // Its bullets went with it, and refetching them would 404, so forget them
      // instead of invalidating. Drop the experience from the list first and
      // remove the bullets only after that update has rendered: removing a
      // query while its list is still mounted makes that list fetch it again.
      queryClient.setQueryData<Experience[]>(profileKeys.experiences, (list) =>
        list?.filter((experience) => experience.id !== id),
      )
      notifyManager.schedule(() =>
        queryClient.removeQueries({ queryKey: profileKeys.bullets(id) }),
      )
      return invalidate(profileKeys.experiences)
    },
  })
}

// Bullets --------------------------------------------------------------------

export function useBullets(experienceId: number) {
  return useQuery({
    queryKey: profileKeys.bullets(experienceId),
    queryFn: () =>
      unwrap(
        api.GET('/api/experiences/{experience_id}/bullets', {
          params: { path: { experience_id: experienceId } },
        }),
      ),
  })
}

export function useCreateBullet(experienceId: number) {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (body: BulletInput) =>
      unwrap(
        api.POST('/api/experiences/{experience_id}/bullets', {
          params: { path: { experience_id: experienceId } },
          body,
        }),
      ),
    onSuccess: () => invalidate(profileKeys.bullets(experienceId)),
  })
}

/** PUT replaces the whole bullet, so `body` must carry every field, including `skill_ids`. */
export function useUpdateBullet(experienceId: number) {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: BulletInput }) =>
      unwrap(
        api.PUT('/api/experiences/{experience_id}/bullets/{bullet_id}', {
          params: { path: { experience_id: experienceId, bullet_id: id } },
          body,
        }),
      ),
    onSuccess: () => invalidate(profileKeys.bullets(experienceId)),
  })
}

export function useDeleteBullet(experienceId: number) {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (id: number) =>
      unwrap(
        api.DELETE('/api/experiences/{experience_id}/bullets/{bullet_id}', {
          params: { path: { experience_id: experienceId, bullet_id: id } },
        }),
      ),
    onSuccess: () => invalidate(profileKeys.bullets(experienceId)),
  })
}

/** The fields a bullet PUT/POST needs, taken from a saved bullet. */
export function bulletInput(bullet: Bullet): BulletInput {
  return {
    text: bullet.text,
    metrics: bullet.metrics,
    verified: bullet.verified,
    skill_ids: bullet.skill_ids,
  }
}

// Skills -----------------------------------------------------------------------

export function useSkills() {
  return useQuery({
    queryKey: profileKeys.skills,
    queryFn: () => unwrap(api.GET('/api/skills')),
  })
}

export function useCreateSkill() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (body: SkillInput) => unwrap(api.POST('/api/skills', { body })),
    onSuccess: () => invalidate(profileKeys.skills),
  })
}

export function useUpdateSkill() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: SkillInput }) =>
      unwrap(
        api.PUT('/api/skills/{skill_id}', {
          params: { path: { skill_id: id } },
          body,
        }),
      ),
    onSuccess: () => invalidate(profileKeys.skills),
  })
}

export function useDeleteSkill() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (id: number) =>
      unwrap(
        api.DELETE('/api/skills/{skill_id}', {
          params: { path: { skill_id: id } },
        }),
      ),
    // Deleting a skill unlinks it from every bullet.
    onSuccess: () => invalidate(profileKeys.skills, profileKeys.allBullets),
  })
}

// Reusable answers --------------------------------------------------------------

export function useAnswers() {
  return useQuery({
    queryKey: profileKeys.answers,
    queryFn: () => unwrap(api.GET('/api/answers')),
  })
}

export function useCreateAnswer() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (body: AnswerInput) =>
      unwrap(api.POST('/api/answers', { body })),
    onSuccess: () => invalidate(profileKeys.answers),
  })
}

export function useUpdateAnswer() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: AnswerInput }) =>
      unwrap(
        api.PUT('/api/answers/{answer_id}', {
          params: { path: { answer_id: id } },
          body,
        }),
      ),
    onSuccess: () => invalidate(profileKeys.answers),
  })
}

export function useDeleteAnswer() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (id: number) =>
      unwrap(
        api.DELETE('/api/answers/{answer_id}', {
          params: { path: { answer_id: id } },
        }),
      ),
    onSuccess: () => invalidate(profileKeys.answers),
  })
}
