// Typed path/method/role allowlist for the admin proxy.
// Pure module -- no Next.js imports -- safe to import in Playwright test files.
// Source of truth: docs/admin-proxy-hardening-plan.md Section 5.

export type AdminRole = 'organisation_admin' | 'worktwin_dev_admin'
type HttpMethod = 'GET' | 'POST' | 'PATCH'

export type RouteKey =
  | 'documents'
  | 'documents/upload'
  | 'documents/{id}'
  | 'documents/{id}/governance'
  | 'documents/{id}/generate-embeddings'
  | 'documents/search-vector'
  | 'documents/answer-debug'
  | 'debug/storage-config'

type AllowlistEntry = {
  readonly methods: readonly HttpMethod[]
  readonly roles: readonly AdminRole[]
}

export const ADMIN_ALLOWLIST: Readonly<Record<RouteKey, AllowlistEntry>> = {
  documents: {
    methods: ['GET'],
    roles: ['organisation_admin', 'worktwin_dev_admin'],
  },
  'documents/upload': {
    methods: ['POST'],
    roles: ['organisation_admin', 'worktwin_dev_admin'],
  },
  'documents/{id}': {
    methods: ['GET', 'PATCH'],
    roles: ['organisation_admin', 'worktwin_dev_admin'],
  },
  'documents/{id}/governance': {
    methods: ['PATCH'],
    roles: ['organisation_admin', 'worktwin_dev_admin'],
  },
  'documents/{id}/generate-embeddings': {
    methods: ['POST'],
    roles: ['organisation_admin', 'worktwin_dev_admin'],
  },
  'documents/search-vector': {
    methods: ['POST'],
    roles: ['worktwin_dev_admin'],
  },
  'documents/answer-debug': {
    methods: ['POST'],
    roles: ['worktwin_dev_admin'],
  },
  'debug/storage-config': {
    methods: ['GET'],
    roles: ['worktwin_dev_admin'],
  },
} as const

// UUID format (any version) and positive integer are accepted document ID formats.
// Path traversal characters (.., /, \) are excluded implicitly by both patterns.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const POS_INT_RE = /^[1-9][0-9]*$/

function isValidDocId(s: string): boolean {
  return UUID_RE.test(s) || POS_INT_RE.test(s)
}

export type ClassifyResult =
  | { match: 'found'; routeKey: RouteKey }
  | { match: 'not_found' }

// Maps raw URL path segments to an allowlist route key.
// Returns not_found for any path not in the allowlist.
// Document ID segments are validated conservatively before matching.
export function classifyPath(segments: string[]): ClassifyResult {
  const [seg0, seg1, seg2, seg3] = segments

  if (seg0 === 'documents') {
    if (seg1 === undefined) return { match: 'found', routeKey: 'documents' }

    // Literal sub-paths checked before wildcard {id} match to avoid shadowing
    if (seg1 === 'upload' && seg2 === undefined)
      return { match: 'found', routeKey: 'documents/upload' }
    if (seg1 === 'search-vector' && seg2 === undefined)
      return { match: 'found', routeKey: 'documents/search-vector' }
    if (seg1 === 'answer-debug' && seg2 === undefined)
      return { match: 'found', routeKey: 'documents/answer-debug' }

    // Dynamic {id} -- validate conservatively before matching sub-paths
    if (isValidDocId(seg1)) {
      if (seg2 === undefined) return { match: 'found', routeKey: 'documents/{id}' }
      if (seg2 === 'governance' && seg3 === undefined)
        return { match: 'found', routeKey: 'documents/{id}/governance' }
      if (seg2 === 'generate-embeddings' && seg3 === undefined)
        return { match: 'found', routeKey: 'documents/{id}/generate-embeddings' }
    }
  }

  if (seg0 === 'debug' && seg1 === 'storage-config' && seg2 === undefined)
    return { match: 'found', routeKey: 'debug/storage-config' }

  return { match: 'not_found' }
}
