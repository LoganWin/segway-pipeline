import { Link, NavLink, Outlet, Route, Routes } from 'react-router'
import { Dashboard } from '@/pages/Dashboard'
import { JobDetail } from '@/pages/JobDetail'
import { Profile } from '@/pages/Profile'
import { cn } from '@/lib/utils'

function AppShell() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-5">
          <Link to="/" className="text-lg font-semibold tracking-tight">
            Segway Pipeline
          </Link>
          <nav aria-label="Main navigation" className="flex gap-2">
            {[
              { to: '/', label: 'Dashboard' },
              { to: '/profile', label: 'Profile' },
            ].map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end
                className={({ isActive }) =>
                  cn(
                    'rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring',
                    isActive
                      ? 'bg-secondary text-secondary-foreground'
                      : 'text-muted-foreground',
                  )
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-10">
        <Outlet />
      </main>
    </div>
  )
}

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Dashboard />} />
        <Route path="jobs/:id" element={<JobDetail />} />
        <Route path="profile" element={<Profile />} />
        <Route
          path="*"
          element={
            <>
              <h1 className="text-2xl font-semibold">Page not found</h1>
              <Link to="/" className="mt-4 inline-block underline">
                Back to dashboard
              </Link>
            </>
          }
        />
      </Route>
    </Routes>
  )
}
