import createClient from 'openapi-fetch'
import type { paths } from './schema'

// Relative URLs use the Vite /api proxy in development and the same origin in production.
export const api = createClient<paths>({ baseUrl: '/' })
