import { test, expect } from '@playwright/test'

test.describe('WorkTwin smoke tests', () => {
  test('landing page is public and does not link directly into admin pages', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('link', { name: /Explore demo/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /Book a pilot/i }).first()).toHaveAttribute('href', /mailto:/)

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
    expect(adminLinks).toBe(0)
  })

  test('ask page shows common questions and safe privacy wording', async ({ page }) => {
    await page.goto('/ask')
    await expect(page.getByRole('heading', { name: 'Ask WorkTwin' })).toBeVisible()
    await expect(page.getByText('Common questions')).toBeVisible()
    await expect(page.getByRole('button', { name: /What should I do when a visitor arrives/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /I have a safeguarding concern/i })).toBeVisible()
    await expect(page.getByText('Private from managers in this demo').first()).toBeVisible()
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
    await expect(page.getByText('Notes are private in this demo')).toBeVisible()
    await expect(page.getByText('notes are stored in this browser session only')).toBeVisible()
    await expect(page.getByText(/Not persisted between sessions|session storage/i)).toBeVisible()
  })

  test('escalation contacts page loads with sample or fictional disclaimer', async ({ page }) => {
    await page.goto('/escalation')
    await expect(page.getByRole('heading', { name: 'Escalation Contacts' })).toBeVisible()
    await expect(page.getByText(/sample|fictional/i).first()).toBeVisible()
    await expect(page.getByText(/999|emergency/i).first()).toBeVisible()
  })

  test('admin pages show disabled message by default', async ({ page }) => {
    await page.goto('/admin')
    await expect(page.getByRole('heading', { name: 'Admin demo disabled' })).toBeVisible()
    await expect(page.getByText('This public deployment does not expose admin demo screens')).toBeVisible()

    await page.goto('/admin/documents')
    await expect(page.getByRole('heading', { name: 'Admin demo disabled' })).toBeVisible()
    await expect(page.getByText('This public deployment does not expose admin demo screens')).toBeVisible()
  })
})
