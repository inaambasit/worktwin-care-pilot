import { test, expect } from '@playwright/test'

test.describe('WorkTwin smoke tests', () => {
  test('landing page is public and does not link directly into admin pages', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('link', { name: /Explore pilot preview/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /Book a pilot/i }).first()).toHaveAttribute('href', '/book-pilot')

    const adminLinks = await page.locator('a[href^="/admin"], a[href*="/admin/"]').count()
    expect(adminLinks).toBe(0)
  })

  test('dashboard loads with staff demo framing', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByText('Controlled Pilot — No Real Data', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Safe support reminders')).toBeVisible()
    await expect(page.getByText('Session-only pilot notes')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Policy Library Browse approved documents' })).toBeVisible()

    const adminLinks = await page.locator('a[href^="/admin"], a[href*="/admin/"]').count()
    if (adminLinks > 0) {
      // Admin demo is enabled — links must be inside the demo switcher, not loose in page content
      await expect(page.getByText('Host View — Switch Area').first()).toBeVisible()
    }
    // If adminLinks === 0, admin demo is disabled — that is the expected default state

    // 4S.109C — identity display. In demo mode (no verified Supabase session)
    // the layout must show the clearly-demo fallback, never the old hardcoded
    // "Pilot User" / "PU" placeholder.
    await expect(page.getByText('Demo user').first()).toBeVisible()
    await expect(page.getByText('Welcome back, Demo user')).toBeVisible()
    await expect(page.getByText('Pilot User')).toHaveCount(0)
    await expect(page.getByText('PU', { exact: true })).toHaveCount(0)
  })

  test('ask page shows common questions and safe privacy wording', async ({ page }) => {
    await page.goto('/ask')
    await expect(page.getByRole('heading', { name: 'Ask WorkTwin' })).toBeVisible()
    await expect(page.getByText('Pilot questions')).toBeVisible()
    await expect(page.getByRole('button', { name: /What should I do when a visitor arrives/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Example safeguarding concern: who should I contact/i })).toBeVisible()
    await expect(page.getByText('Example of an approved-source answer')).toBeVisible()
    await expect(page.getByText('Pilot example only - not a live retrieved answer')).toBeVisible()
    await expect(page.getByText('Visitor Sign-In and Identification Procedure').first()).toBeVisible()
    await expect(page.getByText('Do not enter real staff, service-user, medication, safeguarding, HR, complaint, care-plan or confidential data.')).toBeVisible()
    await expect(page.getByText('Ask example policy and procedure questions in plain English.')).toBeVisible()
    await expect(page.getByText('Ask an example policy question')).toBeVisible()
    await expect(page.getByText('Questions are not shown to managers in this controlled pilot, but this is not a care record, HR record, safeguarding record, medication record or confidential reporting route.').first()).toBeVisible()
    // Safety panel is now a collapsed disclosure — verify summary is visible, then expand and confirm the safety copy is present
    await expect(page.getByText('About this pilot')).toBeVisible()
    await page.getByText('About this pilot').click()
    await expect(page.getByText('High-risk or real-world concerns are not for AI decision-making and should be escalated.')).toBeVisible()
  })

  test('ask page returns a visitor answer when common question is clicked', async ({ page }) => {
    await page.goto('/ask')
    await page.getByRole('button', { name: /What should I do when a visitor arrives/i }).click()

    await expect(page.getByText(/Could not reach WorkTwin/i)).not.toBeVisible({ timeout: 30000 })

    await expect(
      page.getByText(/Visitor Sign-In and Identification Procedure|visitor log|visitor arrives/i).first()
    ).toBeVisible({ timeout: 30000 })
  })

  test('policy library loads as a staff-facing page', async ({ page }) => {
    await page.goto('/policies')
    await expect(page.getByRole('heading', { name: 'Policy Library' })).toBeVisible()
    // Page must show approved staff-visible documents framing
    await expect(page.getByText(/approved staff-visible documents/i).first()).toBeVisible()
    // Governance/safety qualifier: Ask only answers where checks allow
    await expect(page.getByText(/governance and safety checks allow/i).first()).toBeVisible()
    // No overclaiming that all visible docs are always AI-answerable
    await expect(page.getByText(/only documents shown here are used to answer staff questions/i)).not.toBeVisible()
  })

  test('onboarding page is clearly marked as a controlled pilot pathway', async ({ page }) => {
    await page.goto('/onboarding')
    await expect(page.getByRole('heading', { name: 'My Onboarding' })).toBeVisible()
    await expect(page.getByText('Follow an example induction pathway, review key guidance and build confidence during the controlled WorkTwin pilot.')).toBeVisible()
    await expect(page.getByText('Pilot pathway')).toBeVisible()
    await expect(page.getByText('Pilot note: this pathway is for controlled pilot preview only')).toBeVisible()
    await expect(page.getByText('Example tasks completed').first()).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Example pathway weeks' })).toBeVisible()
    await expect(page.getByText('This example pathway is not a live training record, compliance sign-off or replacement for required Thumhara Centre training.')).toBeVisible()
    await expect(page.getByText('Medication awareness: know when to escalate to a trained lead')).toBeVisible()
    await expect(page.getByText('Week 4 - Review and next steps')).toBeVisible()
  })

  test('scenarios page shows guidance-led product copy and safety framing', async ({ page }) => {
    await page.goto('/scenarios')
    await expect(page.getByRole('heading', { name: 'Scenario Guidance' })).toBeVisible()
    await expect(page.getByText('Guidance hub')).toBeVisible()
    await expect(page.getByText(/Get safe shift-time guidance for real care situations/)).toBeVisible()
    await expect(page.getByText('of 11 reviewed')).toBeVisible()
    await expect(page.getByText('Medication-related concern: knowing when to escalate')).toBeVisible()
    await expect(page.getByText('Open guidance').first()).toBeVisible()
    await expect(page.getByText('Controlled pilot').first()).toBeVisible()
    await expect(page.getByText('No real service-user data')).toBeVisible()
    await expect(page.getByText(/Fictional demo scenarios.*controlled pilot only.*not competency assessments/)).toBeVisible()
    // Fictional profile trust pass — labels must be visible alongside names
    await expect(page.getByText('Ada Rahman')).toBeVisible()
    await expect(page.getByText('George Miller')).toBeVisible()
    await expect(page.getByText('Fictional demo profile').first()).toBeVisible()
    await expect(page.getByText('This is a fictional example, not a real service-user record.').first()).toBeVisible()
  })

  test('notes page states session-only controlled pilot behaviour', async ({ page }) => {
    await page.goto('/notes')
    await expect(page.getByRole('heading', { name: 'Private Notes' })).toBeVisible()
    await expect(page.getByText('Session-only notes')).toBeVisible()
    await expect(page.getByText('These example notes stay in this browser session only and are not shown on admin pages.')).toBeVisible()
    // Hero now states notes are not submitted to a manager and not sent to a care system
    await expect(page.getByText(/not submitted to a manager/i).first()).toBeVisible()
    await expect(page.getByText(/not sent to a care system/i).first()).toBeVisible()
    // Safe-support reminders bullet retains the detailed do-not-enter instruction
    await expect(page.getByText(/Do not enter real staff.*service-user.*confidential/i).first()).toBeVisible()
    await expect(page.getByText('Not a formal record').first()).toBeVisible()
    await expect(page.getByText('Not care, HR or compliance evidence')).toBeVisible()
    await expect(page.getByText('Session only - not a formal record')).toBeVisible()
    await expect(page.getByText('These example session notes are not shown to managers in this controlled pilot.')).toBeVisible()
  })

  test('escalation contacts page loads with sample or fictional disclaimer', async ({ page }) => {
    await page.goto('/escalation')
    await expect(page.getByRole('heading', { name: 'Escalation Contacts' })).toBeVisible()
    await expect(page.getByText(/sample|fictional/i).first()).toBeVisible()
    await expect(page.getByText(/999|emergency/i).first()).toBeVisible()
    // 999 must remain callable
    await expect(page.locator('a[href="tel:999"]').first()).toBeVisible()
    // Demo contacts must be labelled — no non-999 tel links
    await expect(page.getByText(/demo contacts only/i).first()).toBeVisible()
    const nonEmergencyTelLinks = await page.locator('a[href^="tel:"]:not([href="tel:999"])').count()
    expect(nonEmergencyTelLinks).toBe(0)
  })

  test('private notes includes clear session-only and privacy notice', async ({ page }) => {
    await page.goto('/notes')
    await expect(page.getByText('Session only — notes will not be saved.')).toBeVisible()
    await expect(page.getByText(/Managers and admins cannot view them/i)).toBeVisible()
    await expect(page.getByText(/Closing or refreshing this tab will clear all notes/i)).toBeVisible()
    await expect(page.getByText(/Do not rely on notes surviving a browser close/i)).toBeVisible()
    // Session-only reminder appears above the note input
    await expect(page.getByText('Stays in this browser session only. Use example reflections only.')).toBeVisible()
    // Button avoids implying permanent storage
    await expect(page.getByRole('button', { name: /Keep in session/i })).toBeVisible()
  })

  test('private notes has no horizontal scroll at 375px width', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/notes')
    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    )
    expect(overflows).toBe(false)
  })

  test('mobile drawer can open and close at 375px width', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/dashboard')
    const drawer = page.locator('#mobile-nav-drawer')
    await expect(drawer).toHaveAttribute('aria-hidden', 'true')
    await page.locator('[aria-controls="mobile-nav-drawer"]').click()
    await expect(drawer).toHaveAttribute('aria-hidden', 'false')
    await page.getByRole('button', { name: 'Close menu' }).click()
    await expect(drawer).toHaveAttribute('aria-hidden', 'true')
  })

  test('/book-pilot enquiry page shows form, privacy note, and routes to /book-pilot/sent on submit', async ({ page }) => {
    await page.goto('/book-pilot')
    await expect(page.getByRole('heading', { name: 'Book a WorkTwin Care Pilot' })).toBeVisible()
    await expect(page.getByLabel('Your name')).toBeVisible()
    await expect(page.getByLabel('Organisation')).toBeVisible()
    await expect(page.getByLabel('Role')).toBeVisible()
    await expect(page.getByLabel('What are you looking to explore?')).toBeVisible()
    await expect(page.getByText(/Please do not include service-user details/i)).toBeVisible()

    await page.getByLabel('Your name').fill('Test User')
    await page.getByLabel('Organisation').fill('Test Org')
    await page.getByLabel('Role').fill('Manager')
    await page.getByLabel('What are you looking to explore?').fill('Exploring onboarding support')
    await page.getByRole('button', { name: 'Preview enquiry' }).click()

    await expect(page).toHaveURL('/book-pilot/sent')
    await expect(page.getByRole('heading', { name: 'Preview enquiry noted' })).toBeVisible()
    await expect(page.getByText(/session-only enquiry preview/i)).toBeVisible()
    await expect(page.getByText(/Your preview enquiry has not been sent/i)).toBeVisible()
    await expect(page.getByText(/This controlled pilot preview stores nothing/i).first()).toBeVisible()
    await expect(page.getByRole('link', { name: 'Back to the pilot overview' })).toBeVisible()
  })

  test('admin pages reflect enabled or disabled state', async ({ page }) => {
    await page.goto('/admin')
    const isDisabled = await page.getByRole('heading', { name: 'Admin demo disabled' }).isVisible()

    if (isDisabled) {
      await expect(page.getByText('This public deployment does not expose admin demo screens')).toBeVisible()
      await page.goto('/admin/documents')
      await expect(page.getByRole('heading', { name: 'Admin demo disabled' })).toBeVisible()
      await expect(page.getByText('This public deployment does not expose admin demo screens')).toBeVisible()
    } else {
      await expect(page.getByRole('heading', { name: 'Admin Overview' })).toBeVisible()
      await expect(page.getByText('Admin demo area — not visible to staff')).toBeVisible()
      await page.goto('/admin/documents')
      await expect(page.getByRole('heading', { name: 'Document Registry' })).toBeVisible()
    }
  })

  test('/login shows magic link request form', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: 'Sign in to WorkTwin Care Pilot' })).toBeVisible()
    await expect(page.getByLabel('Work email address')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Send sign-in link' })).toBeVisible()
    await expect(page.getByText(/WorkTwin Care Pilot is in controlled preparation/i)).toBeVisible()
  })

  test('/login/sent shows check-your-email confirmation', async ({ page }) => {
    await page.goto('/login/sent')
    await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible()
    await expect(page.getByText(/secure sign-in link/i).first()).toBeVisible()
    await expect(page.getByRole('link', { name: 'Back to sign in' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'WorkTwin home' })).toBeVisible()
  })

  // --- 4S.103B: Invite-only login smoke tests ---

  test('/login is invite-only: says invited pilot staff only and access must already be set up', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByText(/invited pilot staff only/i).first()).toBeVisible()
    await expect(page.getByText(/access must be set up by the organisation/i).first()).toBeVisible()
  })

  test('/login does not imply public self-registration', async ({ page }) => {
    await page.goto('/login')
    // Page must say that entering an unknown address does not create a new account
    await expect(page.getByText(/does not create a new account/i).first()).toBeVisible()
    // The "Explore the pilot preview" link must not appear — it implies open access
    await expect(page.getByRole('link', { name: /explore the pilot preview/i })).not.toBeVisible()
  })

  test('/login/sent states the link only works where access has already been set up', async ({ page }) => {
    await page.goto('/login/sent')
    await expect(page.getByText(/only work where access has already been set up/i).first()).toBeVisible()
  })

  test('/privacy-model page loads and shows privacy boundary messaging', async ({ page }) => {
    await page.goto('/privacy-model')
    await expect(page.getByRole('heading', { name: 'How this controlled pilot handles data and privacy' })).toBeVisible()
    await expect(page.getByText(/Controlled.*pilot preview.*not production/i).first()).toBeVisible()
    await expect(page.getByText(/No real data should be entered/i).first()).toBeVisible()
    await expect(page.getByText(/session-only/i).first()).toBeVisible()
  })

  test('landing page preview boundary block shows what-this-is wording', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('What this preview is — and is not')).toBeVisible()
    await expect(page.getByText('Controlled care-sector preview')).toBeVisible()
    await expect(page.getByText('No real staff, service-user or care data is connected')).toBeVisible()
    await expect(page.getByText(/Admin tools and integrations are disabled/i)).toBeVisible()
    const privacyLink = page.getByRole('link', { name: /Privacy model/i }).first()
    await expect(privacyLink).toHaveAttribute('href', '/privacy-model')
  })

  test('landing page links to /privacy-model', async ({ page }) => {
    await page.goto('/')
    const privacyLink = page.getByRole('link', { name: /Privacy model/i }).first()
    await expect(privacyLink).toHaveAttribute('href', '/privacy-model')
  })

  test('/book-pilot links to /privacy-model', async ({ page }) => {
    await page.goto('/book-pilot')
    const privacyLink = page.getByRole('link', { name: /Privacy model/i }).first()
    await expect(privacyLink).toHaveAttribute('href', '/privacy-model')
  })

  test('/book-pilot/sent links to /privacy-model', async ({ page }) => {
    await page.goto('/book-pilot/sent')
    const privacyLink = page.getByRole('link', { name: /Privacy model/i }).first()
    await expect(privacyLink).toHaveAttribute('href', '/privacy-model')
  })

  test('staff portal has a visible link to /privacy-model on /dashboard', async ({ page }) => {
    await page.goto('/dashboard')
    const privacyLink = page.getByRole('link', { name: /Privacy model/i }).first()
    await expect(privacyLink).toHaveAttribute('href', '/privacy-model')
  })

  test('ask page always shows controlled-pilot honesty status line', async ({ page }) => {
    await page.goto('/ask')
    await expect(page.getByText(/answers use approved pilot documents only/i).first()).toBeVisible()
  })

  test('/book-pilot/sent confirmation clearly states session-only and no live CRM submission', async ({ page }) => {
    await page.goto('/book-pilot')
    await page.getByLabel('Your name').fill('Test User')
    await page.getByLabel('Organisation').fill('Test Org')
    await page.getByLabel('Role').fill('Manager')
    await page.getByLabel('What are you looking to explore?').fill('Exploring onboarding support')
    await page.getByRole('button', { name: 'Preview enquiry' }).click()
    await expect(page).toHaveURL('/book-pilot/sent')
    await expect(page.getByText(/live CRM, care system/i)).toBeVisible()
    await expect(page.getByText('Nothing leaves your browser session.')).toBeVisible()
  })

  test('dashboard mobile journey shows controlled pilot framing and journey links at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/dashboard')
    // Controlled pilot / no-real-data framing — scope to main to avoid hidden header spans
    await expect(page.locator('main').getByText('Controlled Pilot', { exact: true }).first()).toBeVisible()
    await expect(page.locator('main').getByText('No real data', { exact: true }).first()).toBeVisible()
    // Dashboard points staff toward all four main journey destinations — scope to main to avoid closed drawer links
    await expect(page.locator('main a[href="/ask"]').first()).toBeVisible()
    await expect(page.locator('main a[href="/policies"]').first()).toBeVisible()
    await expect(page.locator('main a[href="/scenarios"]').first()).toBeVisible()
    await expect(page.locator('main a[href="/escalation"]').first()).toBeVisible()
  })

  test('onboarding mobile journey shows example progress framing and guidance links at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/onboarding')
    // Example/demo onboarding progress wording visible
    await expect(page.getByText('Example tasks completed').first()).toBeVisible()
    await expect(page.getByText('Example progress only').first()).toBeVisible()
    // Not presented as a live HR/training/competency record
    await expect(page.getByText(/not a live HR, training or competency record/i)).toBeVisible()
    // Page points staff toward Ask WorkTwin, Policy Library and Scenario Guidance — scope to main to avoid closed drawer links
    await expect(page.locator('main a[href="/ask"]').first()).toBeVisible()
    await expect(page.locator('main a[href="/policies"]').first()).toBeVisible()
    await expect(page.locator('main a[href="/scenarios"]').first()).toBeVisible()
  })

  test('scenarios mobile shows fictional guidance cards and no horizontal scroll at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/scenarios')
    await expect(page.getByRole('heading', { name: 'Scenario Guidance' })).toBeVisible()
    // Fictional demo / controlled pilot safety framing
    await expect(page.getByText('No real service-user data').first()).toBeVisible()
    // Fictional service-user guidance cards present
    await expect(page.getByText('Fictional service-user guidance cards')).toBeVisible()
    await expect(page.getByText('Ada Rahman')).toBeVisible()
    await expect(page.getByText('George Miller')).toBeVisible()
    // Fictional profile trust pass — label and disclaimer visible on both cards
    await expect(page.getByText('Fictional demo profile').first()).toBeVisible()
    await expect(page.getByText('This is a fictional example, not a real service-user record.').first()).toBeVisible()
    // No horizontal overflow at 375px
    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    )
    expect(overflows).toBe(false)
  })

  test('/scenarios/access-refusal mobile shows 999 emergency access and practice-mode note at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/scenarios/access-refusal')
    // 999 call link and immediate-danger label visible on the mobile safety strip
    await expect(page.locator('a[href="tel:999"]').first()).toBeVisible()
    await expect(page.getByText(/Immediate danger/i).first()).toBeVisible()
    // Practice-mode note: reflections are not submitted to any real care system
    await expect(page.getByText(/not submitted to any real care system/i)).toBeVisible()
    // Demo contacts labelled — no non-999 tel links
    await expect(page.getByText(/Demo contact only/i).first()).toBeVisible()
    const nonEmergencyTelLinks = await page.locator('a[href^="tel:"]:not([href="tel:999"])').count()
    expect(nonEmergencyTelLinks).toBe(0)
  })

  // --- 4S.101J: Mobile safety smoke tests ---

  test('ask page has no horizontal scroll and shows pilot honesty and privacy wording at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/ask')
    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    )
    expect(overflows).toBe(false)
    // Controlled-pilot honesty status line must remain visible at mobile width
    await expect(page.getByText(/Controlled pilot mode/i).first()).toBeVisible()
    await expect(page.getByText(/answers use approved pilot documents only/i).first()).toBeVisible()
    // No-real-data privacy wording must remain visible
    await expect(
      page.getByText(/Do not enter real staff.*service-user.*medication.*safeguarding.*HR.*complaint.*care-plan.*confidential data/i).first()
    ).toBeVisible()
  })

  test('policy library mobile modal opens, shows safety wording and closes at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/policies')
    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    )
    expect(overflows).toBe(false)
    // Governance/safety wording in the hero is always present
    await expect(page.getByText(/governance and safety checks allow/i).first()).toBeVisible()
    // Wait for at least one policy card (button containing an h3 heading) to appear after load or fallback
    await expect(page.locator('button:has(h3)').first()).toBeVisible({ timeout: 10000 })
    await page.locator('button:has(h3)').first().click()
    // Modal footer Close button is visible and tappable
    await expect(page.getByRole('button', { name: 'Close', exact: true })).toBeVisible()
    // Modal contains pilot safety wording
    await expect(page.getByText(/controlled pilot preview/i).first()).toBeVisible()
    // Close the modal
    await page.getByRole('button', { name: 'Close', exact: true }).click()
    // Page remains usable after close
    await expect(page.getByRole('heading', { name: 'Policy Library' })).toBeVisible()
  })

  test('escalation contacts mobile safety at 375px shows 999 link, demo labelling and no non-999 tel links', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/escalation')
    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    )
    expect(overflows).toBe(false)
    // 999 emergency link visible and callable
    await expect(page.locator('a[href="tel:999"]').first()).toBeVisible()
    // Sample contacts are labelled as demo-only / not live routes
    await expect(page.getByText(/demo contacts only/i).first()).toBeVisible()
    // No non-999 tel links present (sample numbers are plain text, not hyperlinks)
    const nonEmergencyTelLinks = await page.locator('a[href^="tel:"]:not([href="tel:999"])').count()
    expect(nonEmergencyTelLinks).toBe(0)
  })

  test('stale "Practice Scenarios" label is not visible in main content on key staff pages', async ({ page }) => {
    for (const path of ['/', '/dashboard', '/scenarios', '/onboarding']) {
      await page.goto(path)
      await expect(
        page.locator('main').getByText('Practice Scenarios', { exact: true })
      ).not.toBeVisible()
    }
  })

  test('/scenarios/access-refusal keeps recording boundary wording safe', async ({ page }) => {
    await page.goto('/scenarios/access-refusal')
    // "Review my record" must not appear — WorkTwin is for reflection/guidance, not care record entry
    await expect(page.locator('main').getByText('Review my record')).not.toBeVisible()
    // Recording boundary wording must be present: reflections are not submitted to a care system
    await expect(page.getByText(/not submitted to any real care system/i).first()).toBeVisible()
    // Both assertions hold after reload
    await page.reload()
    await expect(page.locator('main').getByText('Review my record')).not.toBeVisible()
    await expect(page.getByText(/not submitted to any real care system/i).first()).toBeVisible()
  })
})
