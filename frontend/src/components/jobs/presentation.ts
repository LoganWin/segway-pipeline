import type { Status } from './queries'

// Display labels only. Transition policy always comes from the API.
export const statusLabels = {
  saved: 'Saved',
  preparing: 'Preparing',
  ready_for_review: 'Ready for review',
  applied: 'Applied',
  interviewing: 'Interviewing',
  offer: 'Offer',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
} satisfies Record<Status, string>

export const statuses = Object.keys(statusLabels) as Status[]

export function formatDate(value: string) {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}
