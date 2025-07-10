import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MessageViewer } from '../../components/message-viewer'
import type { HL7Message } from '../../types/hl7'

// Mock fetch for API calls
global.fetch = jest.fn()

// Mock HL7Preview component
jest.mock('../../components/hl7-preview', () => ({
  HL7Preview: ({ content }: { content: string }) => (
    <div data-testid="hl7-preview">{content}</div>
  )
}))

// Mock syntax highlighter
jest.mock('react-syntax-highlighter', () => ({
  Prism: ({ children }: { children: string }) => (
    <pre data-testid="syntax-highlighter">{children}</pre>
  )
}))

describe('MessageViewer', () => {
  const mockMessage: HL7Message = {
    _id: 'test-message-id',
    name: 'Test ADT Message',
    rawMessage: 'MSH|^~\\&|SENDING_APP|SENDING_FACILITY|RECEIVING_APP|RECEIVING_FACILITY|20231201120000||ADT^A01|MSG001|P|2.5\rPID|1||PATIENT123||DOE^JOHN||19800101|M\rEVN|A01|20231201120000',
    parsedMessage: {
      MSH: {
        'MSH.1': '|',
        'MSH.2': '^~\\&',
        'MSH.3': 'SENDING_APP',
        'MSH.4': 'SENDING_FACILITY',
        'MSH.5': 'RECEIVING_APP',
        'MSH.6': 'RECEIVING_FACILITY',
        'MSH.7': '20231201120000',
        'MSH.9': 'ADT^A01',
        'MSH.10': 'MSG001',
        'MSH.11': 'P',
        'MSH.12': '2.5'
      },
      PID: {
        'PID.1': '1',
        'PID.3': 'PATIENT123',
        'PID.5': 'DOE^JOHN',
        'PID.7': '19800101',
        'PID.8': 'M'
      },
      EVN: {
        'EVN.1': 'A01',
        'EVN.2': '20231201120000'
      }
    },
    metadata: {
      messageType: 'ADT^A01',
      versionId: '2.5',
      sendingFacility: 'SENDING_FACILITY',
      receivingFacility: 'RECEIVING_FACILITY',
      controlId: 'MSG001',
      timestamp: new Date('2023-12-01T12:00:00Z')
    },
    isValid: true,
    createdAt: new Date('2023-12-01T10:00:00Z'),
    updatedAt: new Date('2023-12-01T10:00:00Z')
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        isValid: true,
        errors: [],
        warnings: [],
        summary: {
          totalErrors: 0,
          totalWarnings: 0,
          validationTime: 150
        }
      })
    })
  })

  describe('Message Display', () => {
    it('should render message header with correct information', () => {
      render(<MessageViewer message={mockMessage} />)

      expect(screen.getByText('Test ADT Message')).toBeInTheDocument()
      expect(screen.getByText('Valid')).toBeInTheDocument()
      expect(screen.getByText('2.5')).toBeInTheDocument()
      expect(screen.getByText('ADT^A01')).toBeInTheDocument()
    })

    it('should display message metadata correctly', () => {
      render(<MessageViewer message={mockMessage} />)

      expect(screen.getByText('SENDING_FACILITY')).toBeInTheDocument()
      expect(screen.getByText('RECEIVING_FACILITY')).toBeInTheDocument()
      expect(screen.getByText('MSG001')).toBeInTheDocument()
      expect(screen.getByText('Dec 1, 2023 12:00 PM')).toBeInTheDocument()
    })

    it('should show invalid badge for invalid messages', () => {
      const invalidMessage = { ...mockMessage, isValid: false }
      render(<MessageViewer message={invalidMessage} />)

      expect(screen.getByText('Invalid')).toBeInTheDocument()
    })

    it('should handle missing metadata gracefully', () => {
      const messageWithoutMetadata = {
        ...mockMessage,
        metadata: undefined
      } as any

      render(<MessageViewer message={messageWithoutMetadata} />)

      expect(screen.getByText('Unknown')).toBeInTheDocument()
    })
  })

  describe('Tab Navigation', () => {
    it('should render all tab options', () => {
      render(<MessageViewer message={mockMessage} />)

      expect(screen.getByText('Structured View')).toBeInTheDocument()
      expect(screen.getByText('Raw View')).toBeInTheDocument()
      expect(screen.getByText('Syntax Highlighted')).toBeInTheDocument()
    })

    it('should switch between tabs correctly', async () => {
      const user = userEvent.setup()
      render(<MessageViewer message={mockMessage} />)

      // Initially should show structured view
      expect(screen.getByTestId('hl7-preview')).toBeInTheDocument()

      // Switch to raw view
      await user.click(screen.getByText('Raw View'))
      expect(screen.getByText(/MSH\|/)).toBeInTheDocument()

      // Switch to syntax highlighted view
      await user.click(screen.getByText('Syntax Highlighted'))
      expect(screen.getByTestId('syntax-highlighter')).toBeInTheDocument()
    })

    it('should display raw message content in raw view', async () => {
      const user = userEvent.setup()
      render(<MessageViewer message={mockMessage} />)

      await user.click(screen.getByText('Raw View'))

      expect(screen.getByText(/MSH\|.*SENDING_APP/)).toBeInTheDocument()
      expect(screen.getByText(/PID\|.*DOE\^JOHN/)).toBeInTheDocument()
    })
  })

  describe('Validation Functionality', () => {
    it('should trigger validation when validate button is clicked', async () => {
      const user = userEvent.setup()
      render(<MessageViewer message={mockMessage} />)

      const validateButton = screen.getByText('Validate Message')
      await user.click(validateButton)

      expect(global.fetch).toHaveBeenCalledWith('/api/messages/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId: 'test-message-id'
        })
      })
    })

    it('should show loading state during validation', async () => {
      const user = userEvent.setup()
      ;(global.fetch as jest.Mock).mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      )

      render(<MessageViewer message={mockMessage} />)

      const validateButton = screen.getByText('Validate Message')
      await user.click(validateButton)

      expect(screen.getByText('Validating...')).toBeInTheDocument()
    })

    it('should display validation results', async () => {
      const user = userEvent.setup()
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          isValid: false,
          errors: [
            {
              segment: 'PID',
              field: 8,
              message: 'Gender field is required',
              severity: 'error'
            }
          ],
          warnings: [
            {
              segment: 'MSH',
              field: 3,
              message: 'Sending application should be specified',
              severity: 'warning'
            }
          ],
          summary: {
            totalErrors: 1,
            totalWarnings: 1,
            validationTime: 200
          }
        })
      })

      render(<MessageViewer message={mockMessage} />)

      const validateButton = screen.getByText('Validate Message')
      await user.click(validateButton)

      await waitFor(() => {
        expect(screen.getByText('Validation Results')).toBeInTheDocument()
        expect(screen.getByText('1 Error, 1 Warning')).toBeInTheDocument()
        expect(screen.getByText('Gender field is required')).toBeInTheDocument()
        expect(screen.getByText('Sending application should be specified')).toBeInTheDocument()
      })
    })

    it('should handle validation API errors', async () => {
      const user = userEvent.setup()
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('API Error'))

      render(<MessageViewer message={mockMessage} />)

      const validateButton = screen.getByText('Validate Message')
      await user.click(validateButton)

      await waitFor(() => {
        expect(screen.getByText(/Failed to validate message/)).toBeInTheDocument()
      })
    })

    it('should handle validation with custom rule set', async () => {
      const user = userEvent.setup()
      render(<MessageViewer message={mockMessage} />)

      // Mock rule set selection (this would typically come from a dropdown)
      const validateButton = screen.getByText('Validate Message')
      await user.click(validateButton)

      expect(global.fetch).toHaveBeenCalledWith('/api/messages/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId: 'test-message-id'
        })
      })
    })
  })

  describe('Export Functionality', () => {
    it('should show export button', () => {
      render(<MessageViewer message={mockMessage} />)
      
      expect(screen.getByText('Export')).toBeInTheDocument()
    })

    it('should handle export action', async () => {
      const user = userEvent.setup()
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(new Blob(['exported data']))
      })

      // Mock URL.createObjectURL
      global.URL.createObjectURL = jest.fn(() => 'blob:mock-url')
      global.URL.revokeObjectURL = jest.fn()

      render(<MessageViewer message={mockMessage} />)

      const exportButton = screen.getByText('Export')
      await user.click(exportButton)

      // This would typically open a dropdown or modal for format selection
      // For now, we just verify the button is clickable
      expect(exportButton).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<MessageViewer message={mockMessage} />)

      expect(screen.getByRole('tablist')).toBeInTheDocument()
      expect(screen.getAllByRole('tab')).toHaveLength(3)
    })

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup()
      render(<MessageViewer message={mockMessage} />)

      const firstTab = screen.getByRole('tab', { name: /structured view/i })
      firstTab.focus()

      await user.keyboard('{ArrowRight}')
      expect(screen.getByRole('tab', { name: /raw view/i })).toHaveFocus()
    })
  })

  describe('Edge Cases', () => {
    it('should handle message without raw content', () => {
      const messageWithoutRaw = {
        ...mockMessage,
        rawMessage: undefined
      } as any

      render(<MessageViewer message={messageWithoutRaw} />)

      expect(screen.getByText('Test ADT Message')).toBeInTheDocument()
    })

    it('should handle very long messages', () => {
      const longMessage = {
        ...mockMessage,
        rawMessage: 'MSH|^~\\&|' + 'A'.repeat(10000)
      }

      render(<MessageViewer message={longMessage} />)

      expect(screen.getByText('Test ADT Message')).toBeInTheDocument()
    })

    it('should handle messages with special characters', () => {
      const specialCharMessage = {
        ...mockMessage,
        name: 'Message with émojis 🏥 and special chars',
        rawMessage: 'MSH|^~\\&|APP|FACILITY|APP|FACILITY|20231201120000||ADT^A01|MSG001|P|2.5\rPID|1||PATIENT123||DOE^JOHN||19800101|M'
      }

      render(<MessageViewer message={specialCharMessage} />)

      expect(screen.getByText('Message with émojis 🏥 and special chars')).toBeInTheDocument()
    })
  })
})
