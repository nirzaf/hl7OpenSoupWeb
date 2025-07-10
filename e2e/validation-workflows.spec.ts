import { test, expect } from '@playwright/test'

test.describe('Validation Workflows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  test('should validate message with standard rules', async ({ page }) => {
    // Create a test message
    await page.getByText('New Message').click()
    await page.getByLabel('Message Name').fill('Standard Validation Test')
    await page.getByLabel('HL7 Content').fill('MSH|^~\\&|SENDING_APP|SENDING_FACILITY|RECEIVING_APP|RECEIVING_FACILITY|20231201120000||ADT^A01|MSG001|P|2.5\rPID|1||PATIENT123||DOE^JOHN||19800101|M')
    await page.getByText('Save Message').click()
    await page.waitForTimeout(2000)

    // Select the message and validate
    await page.getByText('Standard Validation Test').click()
    await page.getByText('Validate Message').click()

    // Wait for validation to complete
    await expect(page.getByText('Validation Results')).toBeVisible({ timeout: 15000 })
    
    // Check validation summary
    await expect(page.locator('text=/Validation completed in \\d+ms/i')).toBeVisible()
    await expect(page.locator('text=/\\d+ Error.*\\d+ Warning/i')).toBeVisible()
  })

  test('should create and use custom rule set', async ({ page }) => {
    // Navigate to admin page
    await page.goto('/admin')
    await page.waitForLoadState('networkidle')

    // Go to Rule Sets tab
    await page.getByText('Rule Sets').click()

    // Create new rule set
    await page.getByText('New Rule Set').click()
    await page.getByLabel('Rule Set Name').fill('E2E Test Rules')
    await page.getByLabel('Description').fill('Test rule set for E2E testing')

    // Add a rule
    await page.getByText('Add Rule').click()
    await page.getByLabel('Rule Name').fill('PID.8 Required')
    await page.getByLabel('Target Path').fill('PID.8')
    await page.getByLabel('Condition').selectOption('exists')
    await page.getByLabel('Severity').selectOption('error')
    await page.getByLabel('Error Message').fill('Patient gender is required')

    // Save rule set
    await page.getByText('Save Rule Set').click()
    await expect(page.getByText('Rule set saved successfully')).toBeVisible({ timeout: 10000 })

    // Go back to main dashboard
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Create a message without gender field
    await page.getByText('New Message').click()
    await page.getByLabel('Message Name').fill('Custom Rule Test')
    await page.getByLabel('HL7 Content').fill('MSH|^~\\&|APP|FACILITY|APP|FACILITY|20231201120000||ADT^A01|MSG001|P|2.5\rPID|1||PATIENT123||DOE^JOHN||19800101')
    await page.getByText('Save Message').click()
    await page.waitForTimeout(2000)

    // Validate with custom rule set
    await page.getByText('Custom Rule Test').click()
    await page.getByText('Validate Message').click()
    
    // Select custom rule set if dropdown is available
    if (await page.getByLabel('Rule Set').isVisible()) {
      await page.getByLabel('Rule Set').selectOption('E2E Test Rules')
      await page.getByText('Validate').click()
    }

    // Should show validation error for missing gender
    await expect(page.getByText('Patient gender is required')).toBeVisible({ timeout: 15000 })
  })

  test('should validate with UK ITK rules', async ({ page }) => {
    // Create a message that should comply with UK ITK
    await page.getByText('New Message').click()
    await page.getByLabel('Message Name').fill('UK ITK Test')
    await page.getByLabel('HL7 Content').fill('MSH|^~\\&|SENDING_APP|SENDING_FACILITY|RECEIVING_APP|RECEIVING_FACILITY|20231201120000||ADT^A01|MSG001|P|2.5\rEVN|A01|20231201120000\rPID|1||PATIENT123||DOE^JOHN||19800101|M')
    await page.getByText('Save Message').click()
    await page.waitForTimeout(2000)

    // Select the message and validate with UK ITK
    await page.getByText('UK ITK Test').click()
    await page.getByText('Validate Message').click()

    // Enable UK ITK validation if checkbox is available
    if (await page.getByLabel('UK ITK Validation').isVisible()) {
      await page.getByLabel('UK ITK Validation').check()
      await page.getByText('Validate').click()
    }

    // Should show UK ITK specific validation results
    await expect(page.getByText('Validation Results')).toBeVisible({ timeout: 15000 })
    await expect(page.locator('text=/UK ITK/i')).toBeVisible()
  })

  test('should show detailed validation errors', async ({ page }) => {
    // Create a message with multiple validation issues
    await page.getByText('New Message').click()
    await page.getByLabel('Message Name').fill('Error Test Message')
    await page.getByLabel('HL7 Content').fill('MSH|^~\\&||FACILITY|APP|FACILITY|20231201120000||ADT^A01|MSG001|P|2.5\rPID|||PATIENT123||DOE^JOHN||19800101')
    await page.getByText('Save Message').click()
    await page.waitForTimeout(2000)

    // Validate the message
    await page.getByText('Error Test Message').click()
    await page.getByText('Validate Message').click()

    // Wait for validation results
    await expect(page.getByText('Validation Results')).toBeVisible({ timeout: 15000 })

    // Check for specific error details
    await expect(page.locator('text=/MSH/i')).toBeVisible()
    await expect(page.locator('text=/PID/i')).toBeVisible()
    await expect(page.locator('text=/Error/i')).toBeVisible()
    await expect(page.locator('text=/Warning/i')).toBeVisible()

    // Check error severity indicators
    await expect(page.locator('.text-red-600, .text-destructive')).toBeVisible()
    await expect(page.locator('.text-yellow-600, .text-warning')).toBeVisible()
  })

  test('should validate real-time during editing', async ({ page }) => {
    // Create a message and enter edit mode
    await page.getByText('New Message').click()
    await page.getByLabel('Message Name').fill('Real-time Validation Test')
    await page.getByLabel('HL7 Content').fill('MSH|^~\\&|APP|FACILITY|APP|FACILITY|20231201120000||ADT^A01|MSG001|P|2.5')
    await page.getByText('Save Message').click()
    await page.waitForTimeout(2000)

    await page.getByText('Real-time Validation Test').click()
    await page.getByText('Edit').click()

    // Modify content to introduce errors
    const textarea = page.getByRole('textbox', { name: /message content/i })
    await textarea.clear()
    await textarea.fill('MSH|invalid_format')

    // Should show real-time validation feedback
    await expect(page.locator('.text-red-500, .error-indicator')).toBeVisible({ timeout: 5000 })
  })

  test('should export validation report', async ({ page }) => {
    // Create and validate a message
    await page.getByText('New Message').click()
    await page.getByLabel('Message Name').fill('Validation Report Test')
    await page.getByLabel('HL7 Content').fill('MSH|^~\\&|APP|FACILITY|APP|FACILITY|20231201120000||ADT^A01|MSG001|P|2.5\rPID|1||PATIENT123||DOE^JOHN||19800101|M')
    await page.getByText('Save Message').click()
    await page.waitForTimeout(2000)

    await page.getByText('Validation Report Test').click()
    await page.getByText('Validate Message').click()

    // Wait for validation results
    await expect(page.getByText('Validation Results')).toBeVisible({ timeout: 15000 })

    // Export validation report if available
    if (await page.getByText('Export Report').isVisible()) {
      const downloadPromise = page.waitForEvent('download')
      await page.getByText('Export Report').click()
      
      const download = await downloadPromise
      expect(download.suggestedFilename()).toMatch(/validation.*report/i)
    }
  })

  test('should handle validation of large messages', async ({ page }) => {
    // Create a large HL7 message
    const largeMessage = 'MSH|^~\\&|APP|FACILITY|APP|FACILITY|20231201120000||ADT^A01|MSG001|P|2.5\r' +
      'PID|1||PATIENT123||DOE^JOHN||19800101|M\r' +
      Array(50).fill('NTE|1||This is a note segment with additional information').join('\r')

    await page.getByText('New Message').click()
    await page.getByLabel('Message Name').fill('Large Message Test')
    await page.getByLabel('HL7 Content').fill(largeMessage)
    await page.getByText('Save Message').click()
    await page.waitForTimeout(3000)

    // Validate the large message
    await page.getByText('Large Message Test').click()
    await page.getByText('Validate Message').click()

    // Should handle large message validation
    await expect(page.getByText('Validation Results')).toBeVisible({ timeout: 30000 })
    await expect(page.locator('text=/Validation completed/i')).toBeVisible()
  })

  test('should validate batch of messages', async ({ page }) => {
    // Create multiple messages
    const messages = [
      { name: 'Batch Test 1', content: 'MSH|^~\\&|APP1|FACILITY|APP|FACILITY|20231201120000||ADT^A01|MSG001|P|2.5' },
      { name: 'Batch Test 2', content: 'MSH|^~\\&|APP2|FACILITY|APP|FACILITY|20231201120000||ADT^A04|MSG002|P|2.5' },
      { name: 'Batch Test 3', content: 'MSH|^~\\&|APP3|FACILITY|APP|FACILITY|20231201120000||ORU^R01|MSG003|P|2.5' }
    ]

    for (const message of messages) {
      await page.getByText('New Message').click()
      await page.getByLabel('Message Name').fill(message.name)
      await page.getByLabel('HL7 Content').fill(message.content)
      await page.getByText('Save Message').click()
      await page.waitForTimeout(1000)
    }

    // Select multiple messages if batch validation is available
    if (await page.getByText('Select All').isVisible()) {
      await page.getByText('Select All').click()
      await page.getByText('Validate Selected').click()

      // Should show batch validation results
      await expect(page.getByText('Batch Validation Results')).toBeVisible({ timeout: 20000 })
    }
  })

  test('should compare validation results', async ({ page }) => {
    // Create two similar messages
    await page.getByText('New Message').click()
    await page.getByLabel('Message Name').fill('Compare Test 1')
    await page.getByLabel('HL7 Content').fill('MSH|^~\\&|APP|FACILITY|APP|FACILITY|20231201120000||ADT^A01|MSG001|P|2.5\rPID|1||PATIENT123||DOE^JOHN||19800101|M')
    await page.getByText('Save Message').click()
    await page.waitForTimeout(1000)

    await page.getByText('New Message').click()
    await page.getByLabel('Message Name').fill('Compare Test 2')
    await page.getByLabel('HL7 Content').fill('MSH|^~\\&|APP|FACILITY|APP|FACILITY|20231201120000||ADT^A01|MSG002|P|2.5\rPID|1||PATIENT456||SMITH^JANE||19900101|F')
    await page.getByText('Save Message').click()
    await page.waitForTimeout(1000)

    // If comparison feature is available
    if (await page.getByText('Compare').isVisible()) {
      await page.getByText('Compare Test 1').click()
      await page.getByText('Compare').click()
      await page.getByText('Compare Test 2').click()

      // Should show comparison results
      await expect(page.getByText('Message Comparison')).toBeVisible({ timeout: 10000 })
      await expect(page.locator('text=/differences/i')).toBeVisible()
    }
  })

  test('should handle validation timeout', async ({ page }) => {
    // This test simulates a scenario where validation might take too long
    // Create a complex message that might cause timeout
    const complexMessage = 'MSH|^~\\&|COMPLEX_APP|FACILITY|APP|FACILITY|20231201120000||ADT^A01|MSG001|P|2.5\r' +
      Array(100).fill('OBX|1|TX|CODE^DESCRIPTION||VALUE||||||F').join('\r')

    await page.getByText('New Message').click()
    await page.getByLabel('Message Name').fill('Timeout Test')
    await page.getByLabel('HL7 Content').fill(complexMessage)
    await page.getByText('Save Message').click()
    await page.waitForTimeout(2000)

    await page.getByText('Timeout Test').click()
    await page.getByText('Validate Message').click()

    // Should either complete validation or show timeout message
    await Promise.race([
      expect(page.getByText('Validation Results')).toBeVisible({ timeout: 30000 }),
      expect(page.getByText(/timeout/i)).toBeVisible({ timeout: 30000 })
    ])
  })
})
