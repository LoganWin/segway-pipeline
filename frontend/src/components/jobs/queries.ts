import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import type { components } from '@/api/schema'

export type Job = components['schemas']['JobResponse']
export type JobWrite = components['schemas']['JobWrite']
export type Application = components['schemas']['ApplicationResponse']
export type Status = components['schemas']['ApplicationStatus']
type ApiError =
  | components['schemas']['ErrorResponse']
  | components['schemas']['HTTPValidationError']

function apiError(error: ApiError | undefined, status: number) {
  const detail = error?.detail
  return new Error(
    typeof detail === 'string'
      ? detail
      : detail?.map((item) => `${item.loc.join('.')}: ${item.msg}`).join('; ') ||
          `Request failed (${status}). Please try again.`,
  )
}

export function useJobs(status?: Status) {
  return useQuery({
    queryKey: ['jobs', 'list', status],
    queryFn: async ({ signal }) => {
      const { data, error, response } = await api.GET('/api/jobs', {
        params: { query: { status } },
        signal,
      })
      if (!data) throw apiError(error, response.status)
      return data
    },
  })
}

export function useJob(id: number) {
  return useQuery({
    queryKey: ['jobs', 'detail', id],
    enabled: Number.isSafeInteger(id) && id > 0,
    retry: false,
    queryFn: async ({ signal }) => {
      const { data, error, response } = await api.GET('/api/jobs/{job_id}', {
        params: { path: { job_id: id } },
        signal,
      })
      if (!data) throw apiError(error, response.status)
      return data
    },
  })
}

export function useSaveJob(id?: number) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (body: JobWrite) => {
      const { data, error, response } =
        id === undefined
          ? await api.POST('/api/jobs', { body })
          : await api.PUT('/api/jobs/{job_id}', {
              params: { path: { job_id: id } },
              body,
            })
      if (!data) throw apiError(error, response.status)
      return data
    },
    onSuccess: async (job) => {
      client.setQueryData(['jobs', 'detail', job.id], job)
      await client.invalidateQueries({ queryKey: ['jobs'] })
    },
  })
}

export function useHistory(applicationId: number) {
  return useQuery({
    queryKey: ['history', applicationId],
    retry: false,
    queryFn: async ({ signal }) => {
      const { data, error, response } = await api.GET(
        '/api/applications/{application_id}/history',
        { params: { path: { application_id: applicationId } }, signal },
      )
      if (!data) throw apiError(error, response.status)
      return data
    },
  })
}

export function useTransition(application: Application) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (body: components['schemas']['TransitionRequest']) => {
      const { data, error, response } = await api.POST(
        '/api/applications/{application_id}/transition',
        { params: { path: { application_id: application.id } }, body },
      )
      if (!data) throw apiError(error, response.status)
      return data
    },
    onSuccess: (application) => {
      client.setQueryData<Job>(['jobs', 'detail', application.job_id], (job) =>
        job ? { ...job, application } : job,
      )
    },
    // Refresh after conflicts too: another client may have changed the status.
    onSettled: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ['jobs'] }),
        client.invalidateQueries({ queryKey: ['history', application.id] }),
      ])
    },
  })
}
