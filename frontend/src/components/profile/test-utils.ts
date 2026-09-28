/**
 * Test helpers for the profile editors: an in-memory fake of the profile API
 * that plugs into the shared `fetchMock` (see `src/test/api-mock.ts`).
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { createElement, type ReactElement } from 'react'
import { fetchMock, json } from '@/test/api-mock'
import type {
  Answer,
  Bullet,
  BulletInput,
  Experience,
  ExperienceInput,
  Profile,
  ProfileInput,
  Skill,
  SkillInput,
} from './api'

export type RecordedRequest = { method: string; path: string; body: unknown }

type Override = {
  method: string
  path: string
  status: number
  body: unknown
}

const TIMESTAMP = '2026-01-01T00:00:00Z'
const stamps = { created_at: TIMESTAMP, updated_at: TIMESTAMP }

function experienceFrom(input: ExperienceInput, id: number): Experience {
  return {
    ...stamps,
    id,
    kind: input.kind,
    org: input.org,
    title: input.title,
    start_date: input.start_date ?? null,
    end_date: input.end_date ?? null,
    location: input.location ?? null,
  }
}

function bulletFrom(
  input: BulletInput,
  id: number,
  experienceId: number,
): Bullet {
  return {
    ...stamps,
    id,
    experience_id: experienceId,
    text: input.text,
    metrics: input.metrics ?? null,
    verified: input.verified ?? false,
    skill_ids: input.skill_ids ?? [],
  }
}

/**
 * An in-memory stand-in for the profile API, wired into `fetchMock`. It records
 * every request, and `failNext` makes the next matching request return an error.
 */
export function createFakeApi(
  initial: {
    profile?: Profile | null
    experiences?: Experience[]
    bullets?: Bullet[]
    skills?: Skill[]
    answers?: Answer[]
  } = {},
) {
  const state = {
    profile: initial.profile ?? null,
    experiences: [...(initial.experiences ?? [])],
    bullets: [...(initial.bullets ?? [])],
    skills: [...(initial.skills ?? [])],
    answers: [...(initial.answers ?? [])],
  }
  const requests: RecordedRequest[] = []
  const overrides: Override[] = []
  let nextId = 100

  function handle(method: string, path: string, body: unknown): Response {
    const override = overrides.findIndex(
      (o) => o.method === method && o.path === path,
    )
    if (override !== -1) {
      const [o] = overrides.splice(override, 1)
      return json(o!.body, o!.status)
    }
    const notFound = json({ detail: 'Not found' }, 404)
    let m: RegExpMatchArray | null

    if (path === '/api/profile') {
      if (method === 'GET')
        return state.profile ? json(state.profile) : notFound
      const input = body as ProfileInput
      state.profile = {
        ...stamps,
        name: input.name,
        email: input.email,
        phone: input.phone ?? null,
        location: input.location ?? null,
        links: input.links ?? [],
        work_authorization: input.work_authorization ?? null,
      }
      return json(state.profile)
    }
    if (path === '/api/experiences') {
      if (method === 'GET') return json(state.experiences)
      const created = experienceFrom(body as ExperienceInput, nextId++)
      state.experiences.push(created)
      return json(created, 201)
    }
    if ((m = path.match(/^\/api\/experiences\/(\d+)$/))) {
      const id = Number(m[1])
      const index = state.experiences.findIndex((e) => e.id === id)
      if (index === -1) return notFound
      if (method === 'DELETE') {
        state.experiences.splice(index, 1)
        state.bullets = state.bullets.filter((b) => b.experience_id !== id)
        return json(null, 204)
      }
      const updated = experienceFrom(body as ExperienceInput, id)
      state.experiences[index] = updated
      return json(updated)
    }
    if ((m = path.match(/^\/api\/experiences\/(\d+)\/bullets$/))) {
      const experienceId = Number(m[1])
      if (method === 'GET')
        return json(
          state.bullets.filter((b) => b.experience_id === experienceId),
        )
      const created = bulletFrom(body as BulletInput, nextId++, experienceId)
      state.bullets.push(created)
      return json(created, 201)
    }
    if ((m = path.match(/^\/api\/experiences\/(\d+)\/bullets\/(\d+)$/))) {
      const experienceId = Number(m[1])
      const id = Number(m[2])
      const index = state.bullets.findIndex(
        (b) => b.id === id && b.experience_id === experienceId,
      )
      if (index === -1) return notFound
      if (method === 'DELETE') {
        state.bullets.splice(index, 1)
        return json(null, 204)
      }
      const updated = bulletFrom(body as BulletInput, id, experienceId)
      state.bullets[index] = updated
      return json(updated)
    }
    const skillPath = path.match(/^\/api\/skills(?:\/(\d+))?$/)
    if (skillPath && (skillPath[1] ? method === 'PUT' : method === 'POST')) {
      const existingId = skillPath[1] ? Number(skillPath[1]) : undefined
      const index = state.skills.findIndex((s) => s.id === existingId)
      if (existingId !== undefined && index === -1) return notFound
      const input = body as SkillInput
      // Like the API: skill names are unique.
      if (
        state.skills.some((s) => s.name === input.name && s.id !== existingId)
      )
        return json({ detail: `Skill '${input.name}' already exists` }, 409)
      const skill: Skill = {
        ...stamps,
        id: existingId ?? nextId++,
        name: input.name,
        category: input.category ?? null,
        proficiency: input.proficiency ?? null,
      }
      if (existingId === undefined) state.skills.push(skill)
      else state.skills[index] = skill
      return json(skill, existingId === undefined ? 201 : 200)
    }
    if ((m = path.match(/^\/api\/skills\/(\d+)$/)) && method === 'DELETE') {
      const id = Number(m[1])
      if (!state.skills.some((s) => s.id === id)) return notFound
      state.skills = state.skills.filter((s) => s.id !== id)
      state.bullets = state.bullets.map((b) => ({
        ...b,
        skill_ids: b.skill_ids.filter((s) => s !== id),
      }))
      return json(null, 204)
    }
    if (path === '/api/skills' && method === 'GET') return json(state.skills)
    if (path === '/api/answers' && method === 'GET') return json(state.answers)
    return json({ detail: `Fake API has no route for ${method} ${path}` }, 501)
  }

  fetchMock.mockImplementation(async (request) => {
    const url = new URL(request.url)
    const text = await request.text()
    const body: unknown = text ? JSON.parse(text) : undefined
    requests.push({ method: request.method, path: url.pathname, body })
    return handle(request.method, url.pathname, body)
  })

  return {
    state,
    requests,
    /** Requests other than GETs, in order. */
    writes: () => requests.filter((r) => r.method !== 'GET'),
    failNext(method: string, path: string, status: number, body: unknown) {
      overrides.push({ method, path, status, body })
    },
  }
}

export function renderWithQueryClient(ui: ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(createElement(QueryClientProvider, { client }, ui))
}

export const fixtures = {
  experience(overrides: Partial<Experience> = {}): Experience {
    return {
      ...stamps,
      id: 1,
      kind: 'job',
      org: 'Acme Widgets Inc.',
      title: 'Software Engineer',
      start_date: '2022-01-01',
      end_date: null,
      location: 'Springfield',
      ...overrides,
    }
  },
  bullet(overrides: Partial<Bullet> = {}): Bullet {
    return {
      ...stamps,
      id: 10,
      experience_id: 1,
      text: 'Built a widget pipeline',
      metrics: 'cut build time 40%',
      verified: false,
      skill_ids: [],
      ...overrides,
    }
  },
  skill(overrides: Partial<Skill> = {}): Skill {
    return {
      ...stamps,
      id: 1,
      name: 'TypeScript',
      category: 'Language',
      proficiency: 'Advanced',
      ...overrides,
    }
  },
}
