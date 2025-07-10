import { test, expect } from '@playwright/test'

test.describe('Message Management', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the main page
    await page.goto('/')
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle')
  })

  test('should display the main dashboard', async ({ page }) => {
    // Check if the main dashboard elements are present
    await expect(page.getByText('HL7 Message Dashboard')).toBeVisible()
    await expect(page.getByText('New Message')).toBeVisible()
    await expect(page.getByPlaceholder('Search messages...')).toBeVisible()
  })

  test('should create a new message', async ({ page }) => {
    const sampleHL7 = 'MSH|^~\\&|SENDING_APP|SENDING_FACILITY|RECEIVING_APP|RECEIVING_FACILITY|20231201120000||ADT^A01|MSG001|P|2.5\rPID|1||PATIENT123||DOE^JOHN||19800101|M\rEVN|A01|20231201120000'

    // Click the "New Message" button
    await page.getByText('New Message').click()

    // Fill in the message details
    await page.getByLabel('Message Name').fill('Test E2E Message')
    await page.getByLabel('HL7 Content').fill(sampleHL7)

    // Save the message
    await page.getByText('Save Message').click()

    // Wait for success message or redirect
    await expect(page.getByText('Message saved successfully')).toBeVisible({ timeout: 10000 })

    // Verify the message appears in the list
    await expect(page.getByText('Test E2E Message')).toBeVisible()
  })

  test('should view message details', async ({ page }) => {
    // Assuming there's at least one message in the list
    // First, create a message if none exists
    await page.getByText('New Message').click()
    await page.getByLabel('Message Name').fill('View Test Message')
    await page.getByLabel('HL7 Content').fill('MSH|^~\\&|TEST_APP|TEST_FACILITY|RECEIVING_APP|RECEIVING_FACILITY|20231201120000||ADT^A01|MSG001|P|2.5')
    await page.getByText('Save Message').click()
    await page.waitForTimeout(2000)

    // Click on the message to view details
    await page.getByText('View Test Message').click()

    // Verify message viewer is displayed
    await expect(page.getByText('Structured View')).toBeVisible()
    await expect(page.getByText('Raw View')).toBeVisible()
    await expect(page.getByText('Syntax Highlighted')).toBeVisible()

    // Check metadata display
    await expect(page.getByText('ADT^A01')).toBeVisible()
    await expect(page.getByText('2.5')).toBeVisible()
    await expect(page.getByText('TEST_FACILITY')).toBeVisible()
  })

  test('should switch between view modes', async ({ page }) => {
    // Create and select a message
    await page.getByText('New Message').click()
    await page.getByLabel('Message Name').fill('View Mode Test')
    await page.getByLabel('HL7 Content').fill('MSH|^~\\&|APP|FACILITY|APP|FACILITY|20231201120000||ADT^A01|MSG001|P|2.5\rPID|1||PATIENT123||DOE^JOHN||19800101|M')
    await page.getByText('Save Message').click()
    await page.waitForTimeout(2000)
    await page.getByText('View Mode Test').click()

    // Test Raw View
    await page.getByText('Raw View').click()
    await expect(page.locator('text=MSH|^~\\&|APP|FACILITY')).toBeVisible()

    // Test Syntax Highlighted View
    await page.getByText('Syntax Highlighted').click()
    await expect(page.locator('.hljs, .language-hl7')).toBeVisible()

    // Test Structured View
    await page.getByText('Structured View').click()
    await expect(page.getByText('MSH')).toBeVisible()
    await expect(page.getByText('PID')).toBeVisible()
  })

  test('should edit a message', async ({ page }) => {
    // Create a message first
    await page.getByText('New Message').click()
    await page.getByLabel('Message Name').fill('Edit Test Message')
    await page.getByLabel('HL7 Content').fill('MSH|^~\\&|ORIGINAL_APP|FACILITY|RECEIVING_APP|FACILITY|20231201120000||ADT^A01|MSG001|P|2.5')
    await page.getByText('Save Message').click()
    await page.waitForTimeout(2000)

    // Select the message and enter edit mode
    await page.getByText('Edit Test Message').click()
    await page.getByText('Edit').click()

    // Modify the content
    const textarea = page.getByRole('textbox', { name: /message content/i })
    await textarea.clear()
    await textarea.fill('MSH|^~\\&|UPDATED_APP|FACILITY|RECEIVING_APP|FACILITY|20231201120000||ADT^A01|MSG001|P|2.5')

    // Save changes
    await page.getByText('Save Changes').click()

    // Verify the changes were saved
    await expect(page.getByText('Message updated successfully')).toBeVisible({ timeout: 10000 })
    
    // Verify the updated content is displayed
    await page.getByText('Raw View').click()
    await expect(page.locator('text=UPDATED_APP')).toBeVisible()
  })

  test('should validate a message', async ({ page }) => {
    // Create a message
    await page.getByText('New Message').click()
    await page.getByLabel('Message Name').fill('Validation Test Message')
    await page.getByLabel('HL7 Content').fill('MSH|^~\\&|APP|FACILITY|APP|FACILITY|20231201120000||ADT^A01|MSG001|P|2.5\rPID|1||PATIENT123||DOE^JOHN||19800101|M')
    await page.getByText('Save Message').click()
    await page.waitForTimeout(2000)

    // Select the message and validate
    await page.getByText('Validation Test Message').click()
    await page.getByText('Validate Message').click()

    // Wait for validation results
    await expect(page.getByText('Validation Results')).toBeVisible({ timeout: 15000 })
    
    // Check for validation summary
    await expect(page.locator('text=/\\d+ Error.*\\d+ Warning/i')).toBeVisible()
  })

  test('should search messages', async ({ page }) => {
    // Create multiple messages for search testing
    const messages = [
      { name: 'Patient Admission ADT', content: 'MSH|^~\\&|APP|FACILITY|APP|FACILITY|20231201120000||ADT^A01|MSG001|P|2.5' },
      { name: 'Lab Results ORU', content: 'MSH|^~\\&|LAB|FACILITY|APP|FACILITY|20231201120000||ORU^R01|MSG002|P|2.5' },
      { name: 'Patient Discharge ADT', content: 'MSH|^~\\&|APP|FACILITY|APP|FACILITY|20231201120000||ADT^A03|MSG003|P|2.5' }
    ]

    for (const message of messages) {
      await page.getByText('New Message').click()
      await page.getByLabel('Message Name').fill(message.name)
      await page.getByLabel('HL7 Content').fill(message.content)
      await page.getByText('Save Message').click()
      await page.waitForTimeout(1000)
    }

    // Test search functionality
    const searchBox = page.getByPlaceholder('Search messages...')
    
    // Search for "ADT" messages
    await searchBox.fill('ADT')
    await page.waitForTimeout(1000)
    
    await expect(page.getByText('Patient Admission ADT')).toBeVisible()
    await expect(page.getByText('Patient Discharge ADT')).toBeVisible()
    await expect(page.getByText('Lab Results ORU')).not.toBeVisible()

    // Clear search
    await searchBox.clear()
    await page.waitForTimeout(1000)
    
    // All messages should be visible again
    await expect(page.getByText('Patient Admission ADT')).toBeVisible()
    await expect(page.getByText('Lab Results ORU')).toBeVisible()
    await expect(page.getByText('Patient Discharge ADT')).toBeVisible()
  })

  test('should filter messages by type', async ({ page }) => {
    // Create messages with different types
    await page.getByText('New Message').click()
    await page.getByLabel('Message Name').fill('ADT Message')
    await page.getByLabel('HL7 Content').fill('MSH|^~\\&|APP|FACILITY|APP|FACILITY|20231201120000||ADT^A01|MSG001|P|2.5')
    await page.getByText('Save Message').click()
    await page.waitForTimeout(1000)

    await page.getByText('New Message').click()
    await page.getByLabel('Message Name').fill('ORU Message')
    await page.getByLabel('HL7 Content').fill('MSH|^~\\&|LAB|FACILITY|APP|FACILITY|20231201120000||ORU^R01|MSG002|P|2.5')
    await page.getByText('Save Message').click()
    await page.waitForTimeout(1000)

    // Apply filter (assuming there's a filter dropdown)
    if (await page.getByText('Filter').isVisible()) {
      await page.getByText('Filter').click()
      await page.getByText('ADT^A01').click()
      
      // Only ADT message should be visible
      await expect(page.getByText('ADT Message')).toBeVisible()
      await expect(page.getByText('ORU Message')).not.toBeVisible()
    }
  })

  test('should export a message', async ({ page }) => {
    // Create a message
    await page.getByText('New Message').click()
    await page.getByLabel('Message Name').fill('Export Test Message')
    await page.getByLabel('HL7 Content').fill('MSH|^~\\&|APP|FACILITY|APP|FACILITY|20231201120000||ADT^A01|MSG001|P|2.5')
    await page.getByText('Save Message').click()
    await page.waitForTimeout(2000)

    // Select the message
    await page.getByText('Export Test Message').click()

    // Start download
    const downloadPromise = page.waitForEvent('download')
    await page.getByText('Export').click()
    
    // Select export format if dropdown appears
    if (await page.getByText('JSON').isVisible()) {
      await page.getByText('JSON').click()
    }

    const download = await downloadPromise
    
    // Verify download
    expect(download.suggestedFilename()).toMatch(/\.json$/)
  })

  test('should handle pagination', async ({ page }) => {
    // This test assumes pagination is implemented
    // Create enough messages to trigger pagination
    for (let i = 1; i <= 15; i++) {
      await page.getByText('New Message').click()
      await page.getByLabel('Message Name').fill(`Pagination Test Message ${i}`)
      await page.getByLabel('HL7 Content').fill(`MSH|^~\\&|APP${i}|FACILITY|APP|FACILITY|20231201120000||ADT^A01|MSG00${i}|P|2.5`)
      await page.getByText('Save Message').click()
      await page.waitForTimeout(500)
    }

    // Check if pagination controls appear
    if (await page.locator('[aria-label="pagination"]').isVisible()) {
      // Test next page
      await page.getByText('Next').click()
      await page.waitForTimeout(1000)
      
      // Test previous page
      await page.getByText('Previous').click()
      await page.waitForTimeout(1000)
    }
  })

  test('should handle errors gracefully', async ({ page }) => {
    // Test with invalid HL7 content
    await page.getByText('New Message').click()
    await page.getByLabel('Message Name').fill('Invalid Message')
    await page.getByLabel('HL7 Content').fill('INVALID_HL7_CONTENT')
    await page.getByText('Save Message').click()

    // Should show error message
    await expect(page.getByText(/invalid.*hl7/i)).toBeVisible({ timeout: 10000 })
  })
})
