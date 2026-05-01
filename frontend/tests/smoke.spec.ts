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
    await expect(page.getByText('Private notes demo')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Policy Library Browse approved documents' })).toBeVisible()
  })

  test('ask page shows common questions and safe privacy wording', async ({ page }) => {
    await page.goto('/ask')
    await expect(page.getByText("Hi, I'm WorkTwin")).toBeVisible()
    await expect(page.getByText('Common questions')).toBeVisible()
    await expect(page.getByRole('button', { name: /What should I do when a visitor arrives/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /I have a safeguarding concern/i })).toBeVisible()
    await expect(page.getByText('Private from managers in this demo')).toBeVisible()
  })

  test('policy library loads as a staff-facing page', async ({ page }) => {
    await page.goto('/policies')
    await expect(page.getByRole('heading', { name: 'Policy Library' })).toBeVisible()
    await expect(page.getByText(/staff-visible|approved/i).first()).toBeVisible()
  })

  test('onboarding page is clearly marked as a demo pathway', async ({ page }) => {
    await page.goto('/onboarding')
    await expect(page.getByRole('heading', { name: 'My Onboarding' })).toBeVisible()
    await expect(page.getByText('Pilot onboarding pathway for Thumhara Centre staff')).toBeVisible()
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

  test('admin pages are visibly contained as demo-host-only areas', async ({ page }) => {
    await page.goto('/admin')
    await expect(page.getByText(/Admin demo area.*not visible to staff/i)).toBeVisible()

    await page.goto('/admin/documents')
    await expect(page.getByText(/Admin document tools.*demo and testing only/i)).toBeVisible()

    await page.goto('/admin/insights')
    await expect(page.getByText(/Sample data only.*illustrative themes.*not real staff usage/i)).toBeVisible()

    await page.goto('/admin/roles')
    await expect(page.getByText(/Intended permission model only.*not enforced in this demo/i)).toBeVisible()
  })
})
