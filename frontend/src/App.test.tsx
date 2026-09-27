import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { App } from '@/App'

function renderApp(path = '/') {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('application shell', () => {
  it('renders the dashboard and navigates to the profile', async () => {
    const user = userEvent.setup()
    renderApp()
    expect(
      screen.getByRole('link', { name: 'Segway Pipeline' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Dashboard' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    await user.click(screen.getByRole('link', { name: 'Profile' }))
    expect(screen.getByRole('heading', { name: 'Profile' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Profile' })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  it('opens a job detail URL and returns to the dashboard', async () => {
    const user = userEvent.setup()
    renderApp('/jobs/example-job')
    expect(
      screen.getByRole('heading', { name: 'Job details' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Job example-job' }),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Back to dashboard' }))
    expect(
      screen.getByRole('heading', { name: 'Dashboard' }),
    ).toBeInTheDocument()
  })

  it('handles unknown routes inside the shell', () => {
    renderApp('/missing')
    expect(
      screen.getByRole('navigation', { name: 'Main navigation' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Page not found' }),
    ).toBeInTheDocument()
  })
})
