// Milestone 4S.90N-F2 -- Unit tests for the pure admin-proxy response-strip helper.
// No HTTP calls -- all tests import stripAdminProxyResponseForRole directly.
import { test, expect } from '@playwright/test'
import { stripAdminProxyResponseForRole } from '../lib/admin-proxy-response-strip'

// Full document object returned by the backend (all fields present)
const FULL_DOCUMENT = {
  id: 'doc-uuid-1',
  title: 'Assessment Policy',
  status: 'active',
  governance_status: 'approved',
  approved_for_embedding: true,
  approved_for_source_grounded_answers: true,
  approved_for_staff_visibility: true,
  embedding_status: 'embedded',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-05-01T00:00:00Z',
  // internal fields that organisation_admin must not receive
  storage_key: 's3://bucket/key',
  extracted_text_preview: 'First 200 chars...',
  extracted_character_count: 5000,
  extracted_page_count: 12,
  governance_reviewed_by: 'admin@example.com',
  governance_notes: 'Reviewed by compliance team',
  source_owner: 'NHS Trust',
  source_licence_notes: 'CC BY 4.0',
  personal_data_warnings: ['contains names'],
  metadata: { custom_tag: 'value' },
  registry_warning: 'duplicate detected',
}

const UI_FIELDS = [
  'id',
  'title',
  'status',
  'governance_status',
  'approved_for_embedding',
  'approved_for_source_grounded_answers',
  'approved_for_staff_visibility',
  'embedding_status',
  'created_at',
  'updated_at',
] as const

const INTERNAL_DOCUMENT_FIELDS = [
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

// ---------------------------------------------------------------------------
// organisation_admin -- documents list
// ---------------------------------------------------------------------------

test.describe('stripAdminProxyResponseForRole -- organisation_admin list', () => {
  test('strips internal document fields from array list response', () => {
    const body = [FULL_DOCUMENT, { ...FULL_DOCUMENT, id: 'doc-uuid-2' }]
    const result = stripAdminProxyResponseForRole(body, 'documents', 'organisation_admin')
    expect(Array.isArray(result)).toBe(true)
    const docs = result as Record<string, unknown>[]
    for (const doc of docs) {
      for (const field of INTERNAL_DOCUMENT_FIELDS) {
        expect(doc).not.toHaveProperty(field)
      }
    }
  })

  test('strips registry_warning from each document in array list response', () => {
    const body = [FULL_DOCUMENT]
    const result = stripAdminProxyResponseForRole(body, 'documents', 'organisation_admin') as Record<string, unknown>[]
    expect(result[0]).not.toHaveProperty('registry_warning')
  })

  test('strips internal fields from object-wrapped list response (documents property)', () => {
    const body = { documents: [FULL_DOCUMENT], total: 1 }
    const result = stripAdminProxyResponseForRole(body, 'documents', 'organisation_admin') as Record<string, unknown>
    const docs = result['documents'] as Record<string, unknown>[]
    for (const field of INTERNAL_DOCUMENT_FIELDS) {
      expect(docs[0]).not.toHaveProperty(field)
    }
    expect(docs[0]).not.toHaveProperty('registry_warning')
  })

  test('strips registry_warning from top-level list container', () => {
    const body = { documents: [FULL_DOCUMENT], registry_warning: 'global warning', total: 1 }
    const result = stripAdminProxyResponseForRole(body, 'documents', 'organisation_admin') as Record<string, unknown>
    expect(result).not.toHaveProperty('registry_warning')
  })

  test('UI fields are preserved in array list response', () => {
    const body = [FULL_DOCUMENT]
    const result = stripAdminProxyResponseForRole(body, 'documents', 'organisation_admin') as Record<string, unknown>[]
    for (const field of UI_FIELDS) {
      expect(result[0]).toHaveProperty(field)
    }
  })

  test('UI fields are preserved in object-wrapped list response', () => {
    const body = { documents: [FULL_DOCUMENT], total: 1 }
    const result = stripAdminProxyResponseForRole(body, 'documents', 'organisation_admin') as Record<string, unknown>
    const docs = result['documents'] as Record<string, unknown>[]
    for (const field of UI_FIELDS) {
      expect(docs[0]).toHaveProperty(field)
    }
  })

  test('non-array properties on list container are preserved', () => {
    const body = { documents: [FULL_DOCUMENT], total: 42, page: 1 }
    const result = stripAdminProxyResponseForRole(body, 'documents', 'organisation_admin') as Record<string, unknown>
    expect(result['total']).toBe(42)
    expect(result['page']).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// worktwin_dev_admin -- body is unchanged for all routes
// ---------------------------------------------------------------------------

test.describe('stripAdminProxyResponseForRole -- worktwin_dev_admin passthrough', () => {
  test('list response is returned unchanged', () => {
    const body = [FULL_DOCUMENT]
    const result = stripAdminProxyResponseForRole(body, 'documents', 'worktwin_dev_admin')
    expect(result).toBe(body)
  })

  test('single document response is returned unchanged', () => {
    const result = stripAdminProxyResponseForRole(FULL_DOCUMENT, 'documents/{id}', 'worktwin_dev_admin')
    expect(result).toBe(FULL_DOCUMENT)
  })

  test('upload response is returned unchanged', () => {
    const body = { document: FULL_DOCUMENT, storage_key: 's3://bucket/key', registry_error: 'err' }
    const result = stripAdminProxyResponseForRole(body, 'documents/upload', 'worktwin_dev_admin')
    expect(result).toBe(body)
  })

  test('generate-embeddings response is returned unchanged', () => {
    const body = { embedding_model: 'text-embed-3', embedding_dimensions: 1536, total_tokens: 200, estimated_cost_note: '$0.001' }
    const result = stripAdminProxyResponseForRole(body, 'documents/{id}/generate-embeddings', 'worktwin_dev_admin')
    expect(result).toBe(body)
  })

  test('all internal fields are present in unchanged list response', () => {
    const body = [FULL_DOCUMENT]
    const result = stripAdminProxyResponseForRole(body, 'documents', 'worktwin_dev_admin') as Record<string, unknown>[]
    for (const field of INTERNAL_DOCUMENT_FIELDS) {
      expect(result[0]).toHaveProperty(field)
    }
    expect(result[0]).toHaveProperty('registry_warning')
  })
})

// ---------------------------------------------------------------------------
// organisation_admin -- single document
// ---------------------------------------------------------------------------

test.describe('stripAdminProxyResponseForRole -- organisation_admin single document', () => {
  test('strips internal fields from documents/{id} response', () => {
    const result = stripAdminProxyResponseForRole(FULL_DOCUMENT, 'documents/{id}', 'organisation_admin') as Record<string, unknown>
    for (const field of INTERNAL_DOCUMENT_FIELDS) {
      expect(result).not.toHaveProperty(field)
    }
  })

  test('UI fields preserved in documents/{id} response', () => {
    const result = stripAdminProxyResponseForRole(FULL_DOCUMENT, 'documents/{id}', 'organisation_admin') as Record<string, unknown>
    for (const field of UI_FIELDS) {
      expect(result).toHaveProperty(field)
    }
  })

  test('strips internal fields from documents/{id}/governance response', () => {
    const result = stripAdminProxyResponseForRole(FULL_DOCUMENT, 'documents/{id}/governance', 'organisation_admin') as Record<string, unknown>
    for (const field of INTERNAL_DOCUMENT_FIELDS) {
      expect(result).not.toHaveProperty(field)
    }
  })

  test('UI fields preserved in documents/{id}/governance response', () => {
    const result = stripAdminProxyResponseForRole(FULL_DOCUMENT, 'documents/{id}/governance', 'organisation_admin') as Record<string, unknown>
    for (const field of UI_FIELDS) {
      expect(result).toHaveProperty(field)
    }
  })
})

// ---------------------------------------------------------------------------
// organisation_admin -- upload response
// ---------------------------------------------------------------------------

test.describe('stripAdminProxyResponseForRole -- organisation_admin upload', () => {
  const UPLOAD_RESPONSE = {
    document: FULL_DOCUMENT,
    storage_key: 's3://bucket/uploads/file.pdf',
    extracted_text_preview: 'First lines of the doc...',
    registry_error: null,
    extraction_storage_error: null,
    chunking_error: null,
    extraction_warnings: ['low resolution'],
    message: 'Upload successful',
  }

  test('strips top-level internal fields from upload response', () => {
    const result = stripAdminProxyResponseForRole(UPLOAD_RESPONSE, 'documents/upload', 'organisation_admin') as Record<string, unknown>
    expect(result).not.toHaveProperty('storage_key')
    expect(result).not.toHaveProperty('extracted_text_preview')
    expect(result).not.toHaveProperty('registry_error')
    expect(result).not.toHaveProperty('extraction_storage_error')
    expect(result).not.toHaveProperty('chunking_error')
    expect(result).not.toHaveProperty('extraction_warnings')
  })

  test('strips document internal fields from embedded document object', () => {
    const result = stripAdminProxyResponseForRole(UPLOAD_RESPONSE, 'documents/upload', 'organisation_admin') as Record<string, unknown>
    const doc = result['document'] as Record<string, unknown>
    for (const field of INTERNAL_DOCUMENT_FIELDS) {
      expect(doc).not.toHaveProperty(field)
    }
  })

  test('UI fields preserved in embedded document object', () => {
    const result = stripAdminProxyResponseForRole(UPLOAD_RESPONSE, 'documents/upload', 'organisation_admin') as Record<string, unknown>
    const doc = result['document'] as Record<string, unknown>
    for (const field of UI_FIELDS) {
      expect(doc).toHaveProperty(field)
    }
  })

  test('non-internal top-level fields preserved in upload response', () => {
    const result = stripAdminProxyResponseForRole(UPLOAD_RESPONSE, 'documents/upload', 'organisation_admin') as Record<string, unknown>
    expect(result).toHaveProperty('message')
    expect(result['message']).toBe('Upload successful')
  })
})

// ---------------------------------------------------------------------------
// organisation_admin -- generate-embeddings
// ---------------------------------------------------------------------------

test.describe('stripAdminProxyResponseForRole -- organisation_admin generate-embeddings', () => {
  const EMBEDDINGS_RESPONSE = {
    status: 'completed',
    embedding_status: 'embedded',
    embedding_model: 'text-embedding-3-small',
    embedding_dimensions: 1536,
    total_tokens: 4200,
    estimated_cost_note: 'Estimated $0.001',
    document_id: 'doc-uuid-1',
  }

  test('strips embedding_model from generate-embeddings response', () => {
    const result = stripAdminProxyResponseForRole(EMBEDDINGS_RESPONSE, 'documents/{id}/generate-embeddings', 'organisation_admin') as Record<string, unknown>
    expect(result).not.toHaveProperty('embedding_model')
  })

  test('strips embedding_dimensions from generate-embeddings response', () => {
    const result = stripAdminProxyResponseForRole(EMBEDDINGS_RESPONSE, 'documents/{id}/generate-embeddings', 'organisation_admin') as Record<string, unknown>
    expect(result).not.toHaveProperty('embedding_dimensions')
  })

  test('strips total_tokens from generate-embeddings response', () => {
    const result = stripAdminProxyResponseForRole(EMBEDDINGS_RESPONSE, 'documents/{id}/generate-embeddings', 'organisation_admin') as Record<string, unknown>
    expect(result).not.toHaveProperty('total_tokens')
  })

  test('strips estimated_cost_note from generate-embeddings response', () => {
    const result = stripAdminProxyResponseForRole(EMBEDDINGS_RESPONSE, 'documents/{id}/generate-embeddings', 'organisation_admin') as Record<string, unknown>
    expect(result).not.toHaveProperty('estimated_cost_note')
  })

  test('non-internal fields preserved in generate-embeddings response', () => {
    const result = stripAdminProxyResponseForRole(EMBEDDINGS_RESPONSE, 'documents/{id}/generate-embeddings', 'organisation_admin') as Record<string, unknown>
    expect(result).toHaveProperty('status')
    expect(result).toHaveProperty('embedding_status')
    expect(result).toHaveProperty('document_id')
    expect(result['embedding_status']).toBe('embedded')
  })
})

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

test.describe('stripAdminProxyResponseForRole -- edge cases', () => {
  test('non-JSON-object body for documents/{id} is returned as-is', () => {
    const result = stripAdminProxyResponseForRole('not an object', 'documents/{id}', 'organisation_admin')
    expect(result).toBe('not an object')
  })

  test('null body for documents/{id} is returned as-is', () => {
    const result = stripAdminProxyResponseForRole(null, 'documents/{id}', 'organisation_admin')
    expect(result).toBeNull()
  })

  test('unrelated route body is returned unchanged for organisation_admin', () => {
    const body = { some: 'data', storage_key: 'should-stay' }
    const result = stripAdminProxyResponseForRole(body, 'documents/search-vector', 'organisation_admin')
    expect(result).toBe(body)
  })

  test('empty array list response returns empty array', () => {
    const result = stripAdminProxyResponseForRole([], 'documents', 'organisation_admin')
    expect(result).toEqual([])
  })
})
