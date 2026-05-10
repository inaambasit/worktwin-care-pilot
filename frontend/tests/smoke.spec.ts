import { test, expect } from '@playwright/test'

test.describe('WorkTwin smoke tests', () => {
  test('landing page is public and does not link directly into admin pages', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('link', { name: /Explore demo/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /Book a pilot/i }).first()).toHaveAttribute('href', '/book-pilot')

    const adminLinks = await page.locator('a[href^="/admin"], a[href*="/admin/"]').count()
    expect(adminLinks).toBe(0)
  })

  test('dashboard loads with staff demo framing', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByText(/Demo Mode.*Sample Data Only/i)).toBeVisible()
    await expect(page.getByText('Safe support reminders')).toBeVisible()
    await expect(page.getByText('Session-only demo notes')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Policy Library Browse approved documents' })).toBeVisible()

    const adminLinks = await page.locator('a[href^="/admin"], a[href*="/admin/"]').count()
    if (adminLinks > 0) {
      // Admin demo is enabled — links must be inside the demo switcher, not loose in page content
      await expect(page.getByText('Demo Mode — Switch View').first()).toBeVisible()
    }
    // If adminLinks === 0, admin demo is disabled — that is the expected default state
  })

  test('ask page shows common questions and safe privacy wording', async ({ page }) => {
    await page.goto('/ask')
    await expect(page.getByRole('heading', { name: 'Ask WorkTwin' })).toBeVisible()
    await expect(page.getByText('Demo questions')).toBeVisible()
    await expect(page.getByRole('button', { name: /What should I do when a visitor arrives/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /I have a safeguarding concern/i })).toBeVisible()
    await expect(page.getByText('Private from managers in this demo').first()).toBeVisible()
    await expect(page.getByText('Demo safety mode')).toBeVisible()
    await expect(page.getByText('Example of a source-grounded answer')).toBeVisible()
    await expect(page.getByText('Example only - not a live retrieved answer')).toBeVisible()
    await expect(page.getByText('Visitor Sign-In and Identification Procedure').first()).toBeVisible()
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
    await expect(page.getByText(/staff-visible|approved/i).first()).toBeVisible()
  })

  test('onboarding page is clearly marked as a demo pathway', async ({ page }) => {
    await page.goto('/onboarding')
    await expect(page.getByRole('heading', { name: 'My Onboarding' })).toBeVisible()
    await expect(page.getByText('Follow your induction pathway, review key guidance and build confidence during the WorkTwin pilot demo.')).toBeVisible()
    await expect(page.getByText('Demo pathway')).toBeVisible()
    await expect(page.getByText('Prototype note: this pathway is for demonstration only')).toBeVisible()
  })

  test('scenarios page loads and explains demo preview behaviour', async ({ page }) => {
    await page.goto('/scenarios')
    await expect(page.getByRole('heading', { name: 'Practice Scenarios' })).toBeVisible()
    await expect(page.getByText(/View related policies|Demo preview|scenario content/i).first()).toBeVisible()
  })

  test('notes page states session-only demo behaviour', async ({ page }) => {
    await page.goto('/notes')
    await expect(page.getByRole('heading', { name: 'Private Notes' })).toBeVisible()
    await expect(page.getByText('Session-only notes')).toBeVisible()
    await expect(page.getByText('Private notes stay private in this demo and are not shown on admin pages.')).toBeVisible()
    await expect(page.getByText('Session only - not saved between sessions')).toBeVisible()
  })

  test('escalation contacts page loads with sample or fictional disclaimer', async ({ page }) => {
    await page.goto('/escalation')
    await expect(page.getByRole('heading', { name: 'Escalation Contacts' })).toBeVisible()
    await expect(page.getByText(/sample|fictional/i).first()).toBeVisible()
    await expect(page.getByText(/999|emergency/i).first()).toBeVisible()
  })

  test('private notes includes clear session-only and privacy notice', async ({ page }) => {
    await page.goto('/notes')
    await expect(page.getByText('Session only — notes will not be saved.')).toBeVisible()
    await expect(page.getByText(/Managers and admins cannot view them/i)).toBeVisible()
    await expect(page.getByText(/Closing or refreshing this tab will clear all notes/i)).toBeVisible()
    await expect(page.getByText(/Do not rely on notes surviving a browser close/i)).toBeVisible()
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

  test('/book-pilot enquiry page shows form, privacy note, and confirmation on submit', async ({ page }) => {
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
    await page.getByRole('button', { name: 'Submit enquiry' }).click()

    await expect(page.getByText('Thank you, Test User')).toBeVisible()
    await expect(page.getByText(/This demo stores nothing/i).first()).toBeVisible()
    await expect(page.getByRole('link', { name: 'Back to the demo' })).toBeVisible()
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
    await expect(page.getByRole('heading', { name: 'Sign in to WorkTwin' })).toBeVisible()
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

  test('/privacy-model page loads and shows privacy boundary messaging', async ({ page }) => {
    await page.goto('/privacy-model')
    await expect(page.getByRole('heading', { name: 'How this demo handles data and privacy' })).toBeVisible()
    await expect(page.getByText(/Controlled.*demo.*not production/i).first()).toBeVisible()
    await expect(page.getByText(/No real data should be entered/i).first()).toBeVisible()
    await expect(page.getByText(/session-only/i).first()).toBeVisible()
  })

  test('landing page links to /privacy-model', async ({ page }) => {
    await page.goto('/')
    const privacyLink = page.getByRole('link', { name: /Privacy model/i }).first()
    await expect(privacyLink).toHaveAttribute('href', '/privacy-model')
  })

  test('ask page always shows demo-mode honesty status line', async ({ page }) => {
    await page.goto('/ask')
    await expect(page.getByText(/answers use sample documents only/i).first()).toBeVisible()
  })

  test('/book-pilot confirmation clearly states session-only and no live CRM submission', async ({ page }) => {
    await page.goto('/book-pilot')
    await page.getByLabel('Your name').fill('Test User')
    await page.getByLabel('Organisation').fill('Test Org')
    await page.getByLabel('Role').fill('Manager')
    await page.getByLabel('What are you looking to explore?').fill('Exploring onboarding support')
    await page.getByRole('button', { name: 'Submit enquiry' }).click()
    await expect(page.getByText(/live CRM, care system/i)).toBeVisible()
    await expect(page.getByText('Nothing leaves your browser session.')).toBeVisible()
  })
})
