import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import type { components } from '@/api/schema'

type Schemas = components['schemas']
export type Job = Schemas['JobResponse']
export type JobWrite = Schemas['JobWrite']
export type Application = Schemas['ApplicationResponse']
export type Status = Schemas['ApplicationStatus']
export type TransitionRequest = Schemas['TransitionRequest']
type ApiErrorBody = Schemas['ErrorResponse'] | Schemas['HTTPValidationError']

/**
 * Turn an API error body into a readable message: the `detail` string of a
 * 404/409 `ErrorResponse`, or each `{loc, msg}` of a FastAPI 422.
 */
export function apiErrorMessage(body: unknown, status: number): string {
  const detail = (body as ApiErrorBody | undefined)?.detail
  if (typeof detail === 'string' && detail) return detail
  if (Array.isArray(detail) && detail.length) {
    return detail
      .map(({ loc, msg }) => {
        const field = loc.filter((part) => part !== 'body').join('.')
        return field ? `${field}: ${msg}` : msg
      })
      .join('; ')
  }
  return `Request failed (${status}). Please try again.`
}

async function unwrap<T>(
  request: Promise<{ data?: T; error?: unknown; response: Response }>,
): Promise<T> {
  const { data, error, response } = await request
  if (!response.ok || data === undefined) {
    throw new Error(apiErrorMessage(error, response.status))
  }
  return data
}

export const jobKeys = {
  all: ['jobs'] as const,
  list: (status?: Status) => ['jobs', 'list', status ?? 'all'] as const,
  detail: (id: number) => ['jobs', 'detail', id] as const,
  history: (applicationId: number) => ['history', applicationId] as const,
}

export function useJobs(status?: Status) {
  return useQuery({
    queryKey: jobKeys.list(status),
    queryFn: ({ signal }) =>
      unwrap(
        api.GET('/api/jobs', {
          params: { query: status ? { status } : {} },
          signal,
        }),
      ),
  })
}

export function useJob(id: number) {
  return useQuery({
    queryKey: jobKeys.detail(id),
    enabled: Number.isSafeInteger(id) && id > 0,
    retry: false,
    queryFn: ({ signal }) =>
      unwrap(
        api.GET('/api/jobs/{job_id}', {
          params: { path: { job_id: id } },
          signal,
        }),
      ),
  })
}

/** Create a job (no id) or replace an existing job's fields (id). */
export function useSaveJob(id?: number) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: JobWrite) =>
      unwrap(
        id === undefined
          ? api.POST('/api/jobs', { body })
          : api.PUT('/api/jobs/{job_id}', {
              params: { path: { job_id: id } },
              body,
            }),
      ),
    onSuccess: async (job) => {
      client.setQueryData(jobKeys.detail(job.id), job)
      await client.invalidateQueries({ queryKey: jobKeys.all })
    },
  })
}

export function useHistory(applicationId: number) {
  return useQuery({
    queryKey: jobKeys.history(applicationId),
    retry: false,
    queryFn: ({ signal }) =>
      unwrap(
        api.GET('/api/applications/{application_id}/history', {
          params: { path: { application_id: applicationId } },
          signal,
        }),
      ),
  })
}

export function useChangeStatus(application: Application) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: TransitionRequest) =>
      unwrap(
        api.POST('/api/applications/{application_id}/transition', {
          params: { path: { application_id: application.id } },
          body,
        }),
      ),
    onSuccess: (updated) => {
      client.setQueryData<Job>(jobKeys.detail(updated.job_id), (job) =>
        job ? { ...job, application: updated } : job,
      )
    },
    // Refresh after conflicts too: another client may have changed the status.
    onSettled: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: jobKeys.all }),
        client.invalidateQueries({
          queryKey: jobKeys.history(application.id),
        }),
      ]),
  })
}
