// Milestone 4S.90N-F2 -- Role-aware response stripping for the admin proxy.
// Pure module -- no Next.js imports -- safe to import in Playwright test files.
// Only strips for organisation_admin; worktwin_dev_admin receives the full body.
import type { RouteKey } from './admin-proxy-allowlist'

const DOCUMENT_INTERNAL_FIELDS = [
  'storage_key',
  'extracted_text_preview',
  'extracted_character_count',
  'extracted_page_count',
  'governance_reviewed_by',
  'governance_notes',
  'source_owner',
  'source_licence_notes',
  'personal_data_warnings',
  'metadata',
] as const

const UPLOAD_TOP_LEVEL_INTERNAL_FIELDS = [
  'storage_key',
  'extracted_text_preview',
  'registry_error',
  'extraction_storage_error',
  'chunking_error',
  'extraction_warnings',
] as const

const EMBEDDINGS_INTERNAL_FIELDS = [
  'embedding_model',
  'embedding_dimensions',
  'total_tokens',
  'estimated_cost_note',
] as const

function omitFields(
  obj: Record<string, unknown>,
  fields: readonly string[],
): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    if (!fields.includes(key)) result[key] = value
  }
  return result
}

function stripDocumentObject(doc: unknown): unknown {
  if (typeof doc !== 'object' || doc === null || Array.isArray(doc)) return doc
  return omitFields(doc as Record<string, unknown>, DOCUMENT_INTERNAL_FIELDS)
}

function stripDocumentWithRegistryWarning(doc: unknown): unknown {
  const stripped = stripDocumentObject(doc)
  if (typeof stripped !== 'object' || stripped === null || Array.isArray(stripped)) return stripped
  return omitFields(stripped as Record<string, unknown>, ['registry_warning'])
}

function stripListBody(body: unknown): unknown {
  if (Array.isArray(body)) {
    return body.map(stripDocumentWithRegistryWarning)
  }
  if (typeof body === 'object' && body !== null) {
    const obj = body as Record<string, unknown>
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj)) {
      if (Array.isArray(value)) {
        result[key] = value.map(stripDocumentWithRegistryWarning)
      } else {
        result[key] = value
      }
    }
    // registry_warning on the container itself
    delete result['registry_warning']
    return result
  }
  return body
}

export function stripAdminProxyResponseForRole(
  body: unknown,
  routeKey: RouteKey,
  role: string,
): unknown {
  if (role === 'worktwin_dev_admin') return body

  switch (routeKey) {
    case 'documents':
      return stripListBody(body)

    case 'documents/{id}':
    case 'documents/{id}/governance':
      return stripDocumentObject(body)

    case 'documents/upload': {
      if (typeof body !== 'object' || body === null || Array.isArray(body)) return body
      let result = omitFields(body as Record<string, unknown>, UPLOAD_TOP_LEVEL_INTERNAL_FIELDS)
      if (typeof result['document'] === 'object' && result['document'] !== null) {
        result = { ...result, document: stripDocumentObject(result['document']) }
      }
      return result
    }

    case 'documents/{id}/generate-embeddings': {
      if (typeof body !== 'object' || body === null || Array.isArray(body)) return body
      return omitFields(body as Record<string, unknown>, EMBEDDINGS_INTERNAL_FIELDS)
    }

    default:
      return body
  }
}
