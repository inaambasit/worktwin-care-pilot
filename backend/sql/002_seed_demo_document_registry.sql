-- ============================================================
-- OPTIONAL DEMO SEED DATA — development / demo use only.
-- ============================================================
-- Do NOT run in production or with real client data.
-- Run ONLY after 001_document_registry.sql has been executed.
--
-- Inserts 12 sample policy metadata records that mirror the
-- in-memory demo data. These are placeholder records:
--   - storage_keys are placeholder paths; no real files exist.
--   - embedding_status is 'not_started' for all records;
--     no actual embeddings or RAG pipeline is active.
--   - No real Thumhara/QCS policy content is included.
--   - No personal data is included.
--
-- Uses ON CONFLICT (id) DO NOTHING — safe to re-run.
-- ============================================================

INSERT INTO document_registry (
    id,
    organisation_id,
    title,
    description,
    file_name,
    file_type,
    file_size_bytes,
    storage_key,
    vertical,
    category,
    tags,
    status,
    access_roles,
    is_sensitive,
    escalation_required,
    approved_for_ai_answers,
    contains_personal_data_warning,
    primary_language,
    available_languages,
    translation_status,
    human_review_required,
    version,
    review_due_date,
    embedding_status,
    created_by,
    created_at,
    updated_at,
    metadata
)
VALUES

-- 1. Staff Handbook
(
    'd0c00001-0000-4000-8000-000000000001',
    'demo-org',
    'Staff Handbook',
    'Comprehensive guide for all staff covering employment terms, conduct standards, key procedures and benefits.',
    'staff_handbook_v3.pdf', 'pdf', 1468006,
    'placeholder/demo-org/staff_handbook_v3.pdf',
    'care', 'HR',
    ARRAY['onboarding','conduct','employment','benefits'],
    'approved',
    ARRAY['All Staff'],
    false, false, true, false,
    'en', ARRAY['en','ur','pa'], 'complete',
    false, '3.0', '2026-01-12',
    'not_started', 'admin',
    '2025-01-12 00:00:00+00', '2025-01-12 00:00:00+00',
    '{}'::jsonb
),

-- 2. Medication Administration Policy
(
    'd0c00002-0000-4000-8000-000000000002',
    'demo-org',
    'Medication Administration Policy',
    'Procedure for safe medication administration including MAR chart guidance, controlled drugs handling and error reporting.',
    'medication_admin_policy_v2.pdf', 'pdf', 911360,
    'placeholder/demo-org/medication_admin_policy_v2.pdf',
    'care', 'Medication',
    ARRAY['medication','MAR','controlled drugs','safety'],
    'approved',
    ARRAY['Care Worker','Senior Carer','Nurse'],
    true, true, true, false,
    'en', ARRAY['en'], 'not_required',
    false, '2.1', '2026-01-20',
    'not_started', 'admin',
    '2025-01-20 00:00:00+00', '2025-01-20 00:00:00+00',
    '{}'::jsonb
),

-- 3. Safeguarding Policy and Procedure
(
    'd0c00003-0000-4000-8000-000000000003',
    'demo-org',
    'Safeguarding Policy and Procedure',
    'Adults and children safeguarding policy including reporting routes, designated lead contacts and CQC compliance requirements.',
    'safeguarding_policy_v4.pdf', 'pdf', 1153433,
    'placeholder/demo-org/safeguarding_policy_v4.pdf',
    'care', 'Safeguarding',
    ARRAY['safeguarding','CQC','reporting','adults','children'],
    'approved',
    ARRAY['All Staff'],
    true, true, false, false,
    'en', ARRAY['en','ur'], 'in_progress',
    true, '4.0', '2026-02-05',
    'not_started', 'admin',
    '2025-02-05 00:00:00+00', '2025-02-05 00:00:00+00',
    '{}'::jsonb
),

-- 4. Health and Safety Policy
(
    'd0c00004-0000-4000-8000-000000000004',
    'demo-org',
    'Health and Safety Policy',
    'Workplace health and safety policy covering risk assessments, manual handling, COSHH and lone working procedures.',
    'health_safety_policy_v2.pdf', 'pdf', 778240,
    'placeholder/demo-org/health_safety_policy_v2.pdf',
    'care', 'Health and Safety',
    ARRAY['H&S','risk assessment','manual handling','COSHH'],
    'under_review',
    ARRAY['All Staff'],
    false, false, false, false,
    'en', ARRAY['en'], 'not_required',
    true, '2.0', '2026-03-08',
    'not_started', 'admin',
    '2025-03-08 00:00:00+00', '2025-03-08 00:00:00+00',
    '{}'::jsonb
),

-- 5. Complaints Procedure
(
    'd0c00005-0000-4000-8000-000000000005',
    'demo-org',
    'Complaints Procedure',
    'Step-by-step procedure for handling service user and family complaints, including timelines, recording requirements and escalation routes.',
    'complaints_procedure_v1.pdf', 'pdf', 440320,
    'placeholder/demo-org/complaints_procedure_v1.pdf',
    'care', 'Complaints',
    ARRAY['complaints','feedback','service users','families'],
    'approved',
    ARRAY['All Staff'],
    false, false, true, false,
    'en', ARRAY['en','ur','pa','ar'], 'complete',
    false, '1.2', '2026-02-14',
    'not_started', 'admin',
    '2025-02-14 00:00:00+00', '2025-02-14 00:00:00+00',
    '{}'::jsonb
),

-- 6. Infection Control Procedure
(
    'd0c00006-0000-4000-8000-000000000006',
    'demo-org',
    'Infection Control Procedure',
    'Standard precautions for infection prevention and control, PPE guidance, hand hygiene, and outbreak management protocols.',
    'infection_control_v3.pdf', 'pdf', 696320,
    'placeholder/demo-org/infection_control_v3.pdf',
    'care', 'Health and Safety',
    ARRAY['infection control','PPE','hygiene','outbreak'],
    'approved',
    ARRAY['All Staff'],
    false, false, true, false,
    'en', ARRAY['en'], 'not_required',
    false, '3.1', '2026-03-01',
    'not_started', 'admin',
    '2025-03-01 00:00:00+00', '2025-03-01 00:00:00+00',
    '{}'::jsonb
),

-- 7. Mental Capacity Act Guidance
(
    'd0c00007-0000-4000-8000-000000000007',
    'demo-org',
    'Mental Capacity Act Guidance',
    'Practical guidance on applying the Mental Capacity Act 2005 in care settings, including best interests decisions and advocacy.',
    'mental_capacity_act_guidance_v2.pdf', 'pdf', 532480,
    'placeholder/demo-org/mental_capacity_act_guidance_v2.pdf',
    'care', 'Training',
    ARRAY['MCA','mental capacity','best interests','DoLS','advocacy'],
    'approved',
    ARRAY['Care Worker','Senior Carer','Nurse'],
    false, false, true, false,
    'en', ARRAY['en'], 'pending',
    false, '2.0', '2025-11-22',
    'not_started', 'admin',
    '2024-11-22 00:00:00+00', '2024-11-22 00:00:00+00',
    '{}'::jsonb
),

-- 8. Incident Reporting Procedure
(
    'd0c00008-0000-4000-8000-000000000008',
    'demo-org',
    'Incident Reporting Procedure',
    'Process for reporting accidents, near misses, and incidents including RIDDOR obligations, Datix recording and duty of candour.',
    'incident_reporting_v2.pdf', 'pdf', 348160,
    'placeholder/demo-org/incident_reporting_v2.pdf',
    'care', 'Health and Safety',
    ARRAY['incident','accident','RIDDOR','duty of candour'],
    'approved',
    ARRAY['All Staff'],
    false, false, true, false,
    'en', ARRAY['en'], 'not_required',
    false, '2.0', '2026-04-03',
    'not_started', 'admin',
    '2025-04-03 00:00:00+00', '2025-04-03 00:00:00+00',
    '{}'::jsonb
),

-- 9. Disciplinary and Grievance Policy
(
    'd0c00009-0000-4000-8000-000000000009',
    'demo-org',
    'Disciplinary and Grievance Policy',
    'Formal procedure for handling disciplinary matters and employee grievances, in line with ACAS Code of Practice.',
    'disciplinary_grievance_v2.pdf', 'pdf', 624640,
    'placeholder/demo-org/disciplinary_grievance_v2.pdf',
    'care', 'HR',
    ARRAY['disciplinary','grievance','ACAS','HR'],
    'approved',
    ARRAY['Manager','HR Coordinator'],
    true, true, false, true,
    'en', ARRAY['en'], 'not_required',
    true, '2.0', '2026-01-10',
    'not_started', 'admin',
    '2025-01-10 00:00:00+00', '2025-01-10 00:00:00+00',
    '{}'::jsonb
),

-- 10. End of Life Care Policy
(
    'd0c00010-0000-4000-8000-000000000010',
    'demo-org',
    'End of Life Care Policy',
    'Guidance on providing compassionate end of life care, including DNACPR decisions, Lasting Power of Attorney and family communication.',
    'end_of_life_care_v1.pdf', 'pdf', 491520,
    'placeholder/demo-org/end_of_life_care_v1.pdf',
    'care', 'Training',
    ARRAY['end of life','DNACPR','palliative','LPA'],
    'under_review',
    ARRAY['Senior Carer','Nurse','Manager'],
    true, false, false, false,
    'en', ARRAY['en'], 'not_required',
    true, '1.0', '2026-03-15',
    'not_started', 'admin',
    '2025-03-15 00:00:00+00', '2025-03-15 00:00:00+00',
    '{}'::jsonb
),

-- 11. Rota and Leave Management SOP
(
    'd0c00011-0000-4000-8000-000000000011',
    'demo-org',
    'Rota and Leave Management SOP',
    'Standard operating procedure for rota planning, annual leave requests, shift swaps and absence recording.',
    'rota_leave_sop_draft.docx', 'docx', 215040,
    'placeholder/demo-org/rota_leave_sop_draft.docx',
    'care', 'HR',
    ARRAY['rota','leave','absence','shift'],
    'draft',
    ARRAY['Manager','HR Coordinator'],
    false, false, false, false,
    'en', ARRAY['en'], 'not_required',
    true, '0.1', '2026-04-22',
    'not_started', 'admin',
    '2025-04-22 00:00:00+00', '2025-04-22 00:00:00+00',
    '{}'::jsonb
),

-- 12. New Staff Induction Checklist
(
    'd0c00012-0000-4000-8000-000000000012',
    'demo-org',
    'New Staff Induction Checklist',
    'Structured onboarding checklist for new starters covering mandatory training, policy sign-offs, DBS checks and buddy assignment.',
    'induction_checklist_v2.pdf', 'pdf', 184320,
    'placeholder/demo-org/induction_checklist_v2.pdf',
    'care', 'Onboarding',
    ARRAY['induction','onboarding','DBS','mandatory training'],
    'approved',
    ARRAY['All Staff','Manager'],
    false, false, true, false,
    'en', ARRAY['en','ur','pa','bn'], 'in_progress',
    false, '2.0', '2026-06-01',
    'not_started', 'admin',
    '2025-03-20 00:00:00+00', '2025-03-20 00:00:00+00',
    '{}'::jsonb
)

ON CONFLICT (id) DO NOTHING;
