import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MessageEditor } from '../../components/message-editor'
import type { HL7Message } from '../../types/hl7'

// Mock fetch for API calls
global.fetch = jest.fn()

describe('MessageEditor', () => {
  const mockMessage: HL7Message = {
    _id: 'test-message-id',
    name: 'Test Message',
    rawMessage: 'MSH|^~\\&|SENDING_APP|SENDING_FACILITY|RECEIVING_APP|RECEIVING_FACILITY|20231201120000||ADT^A01|MSG001|P|2.5\rPID|1||PATIENT123||DOE^JOHN||19800101|M',
    parsedMessage: {
      MSH: {
        'MSH.1': '|',
        'MSH.2': '^~\\&',
        'MSH.3': 'SENDING_APP',
        'MSH.9': 'ADT^A01',
        'MSH.10': 'MSG001'
      },
      PID: {
        'PID.1': '1',
        'PID.3': 'PATIENT123',
        'PID.5': 'DOE^JOHN',
        'PID.7': '19800101',
        'PID.8': 'M'
      }
    },
    metadata: {
      messageType: 'ADT^A01',
      versionId: '2.5',
      sendingFacility: 'SENDING_FACILITY',
      receivingFacility: 'RECEIVING_FACILITY',
      controlId: 'MSG001',
      timestamp: new Date()
    },
    isValid: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }

  const mockOnSave = jest.fn()
  const mockOnCancel = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true })
    })
  })

  describe('Editor Interface', () => {
    it('should render editor with message content', () => {
      render(
        <MessageEditor 
          message={mockMessage} 
          onSave={mockOnSave} 
          onCancel={mockOnCancel} 
        />
      )

      expect(screen.getByDisplayValue(/MSH\|.*SENDING_APP/)).toBeInTheDocument()
      expect(screen.getByText('Save Changes')).toBeInTheDocument()
      expect(screen.getByText('Cancel')).toBeInTheDocument()
    })

    it('should allow editing of message content', async () => {
      const user = userEvent.setup()
      render(
        <MessageEditor 
          message={mockMessage} 
          onSave={mockOnSave} 
          onCancel={mockOnCancel} 
        />
      )

      const textarea = screen.getByRole('textbox')
      await user.clear(textarea)
      await user.type(textarea, 'MSH|^~\\&|NEW_APP|NEW_FACILITY|RECEIVING_APP|RECEIVING_FACILITY|20231201120000||ADT^A01|MSG001|P|2.5')

      expect(textarea).toHaveValue('MSH|^~\\&|NEW_APP|NEW_FACILITY|RECEIVING_APP|RECEIVING_FACILITY|20231201120000||ADT^A01|MSG001|P|2.5')
    })

    it('should show character count', async () => {
      const user = userEvent.setup()
      render(
        <MessageEditor 
          message={mockMessage} 
          onSave={mockOnSave} 
          onCancel={mockOnCancel} 
        />
      )

      const textarea = screen.getByRole('textbox')
      await user.type(textarea, 'Additional content')

      // Character count should be displayed somewhere
      expect(screen.getByText(/characters/i)).toBeInTheDocument()
    })

    it('should handle very long content', async () => {
      const user = userEvent.setup()
      const longMessage = {
        ...mockMessage,
        rawMessage: 'MSH|^~\\&|' + 'A'.repeat(10000)
      }

      render(
        <MessageEditor 
          message={longMessage} 
          onSave={mockOnSave} 
          onCancel={mockOnCancel} 
        />
      )

      const textarea = screen.getByRole('textbox')
      expect(textarea).toHaveValue(longMessage.rawMessage)
    })
  })

  describe('Save Functionality', () => {
    it('should call onSave with updated content when save button is clicked', async () => {
      const user = userEvent.setup()
      render(
        <MessageEditor 
          message={mockMessage} 
          onSave={mockOnSave} 
          onCancel={mockOnCancel} 
        />
      )

      const textarea = screen.getByRole('textbox')
      await user.clear(textarea)
      await user.type(textarea, 'MSH|^~\\&|UPDATED_APP|FACILITY|RECEIVING_APP|FACILITY|20231201120000||ADT^A01|MSG001|P|2.5')

      const saveButton = screen.getByText('Save Changes')
      await user.click(saveButton)

      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          rawMessage: 'MSH|^~\\&|UPDATED_APP|FACILITY|RECEIVING_APP|FACILITY|20231201120000||ADT^A01|MSG001|P|2.5'
        })
      )
    })

    it('should show loading state during save', async () => {
      const user = userEvent.setup()
      ;(global.fetch as jest.Mock).mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      )

      render(
        <MessageEditor 
          message={mockMessage} 
          onSave={mockOnSave} 
          onCancel={mockOnCancel} 
        />
      )

      const saveButton = screen.getByText('Save Changes')
      await user.click(saveButton)

      expect(screen.getByText('Saving...')).toBeInTheDocument()
      expect(saveButton).toBeDisabled()
    })

    it('should handle save errors gracefully', async () => {
      const user = userEvent.setup()
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Save failed'))

      render(
        <MessageEditor 
          message={mockMessage} 
          onSave={mockOnSave} 
          onCancel={mockOnCancel} 
        />
      )

      const saveButton = screen.getByText('Save Changes')
      await user.click(saveButton)

      await waitFor(() => {
        expect(screen.getByText(/Failed to save/)).toBeInTheDocument()
      })
    })

    it('should validate content before saving', async () => {
      const user = userEvent.setup()
      render(
        <MessageEditor 
          message={mockMessage} 
          onSave={mockOnSave} 
          onCancel={mockOnCancel} 
        />
      )

      const textarea = screen.getByRole('textbox')
      await user.clear(textarea)
      await user.type(textarea, 'INVALID_HL7_CONTENT')

      const saveButton = screen.getByText('Save Changes')
      await user.click(saveButton)

      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText(/Invalid HL7 format/)).toBeInTheDocument()
      })

      expect(mockOnSave).not.toHaveBeenCalled()
    })

    it('should prevent saving unchanged content', async () => {
      const user = userEvent.setup()
      render(
        <MessageEditor 
          message={mockMessage} 
          onSave={mockOnSave} 
          onCancel={mockOnCancel} 
        />
      )

      const saveButton = screen.getByText('Save Changes')
      expect(saveButton).toBeDisabled()
    })

    it('should enable save button when content changes', async () => {
      const user = userEvent.setup()
      render(
        <MessageEditor 
          message={mockMessage} 
          onSave={mockOnSave} 
          onCancel={mockOnCancel} 
        />
      )

      const textarea = screen.getByRole('textbox')
      await user.type(textarea, '\rNTE|1||Additional note')

      const saveButton = screen.getByText('Save Changes')
      expect(saveButton).toBeEnabled()
    })
  })

  describe('Cancel Functionality', () => {
    it('should call onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup()
      render(
        <MessageEditor 
          message={mockMessage} 
          onSave={mockOnSave} 
          onCancel={mockOnCancel} 
        />
      )

      const cancelButton = screen.getByText('Cancel')
      await user.click(cancelButton)

      expect(mockOnCancel).toHaveBeenCalled()
    })

    it('should show confirmation dialog when canceling with unsaved changes', async () => {
      const user = userEvent.setup()
      render(
        <MessageEditor 
          message={mockMessage} 
          onSave={mockOnSave} 
          onCancel={mockOnCancel} 
        />
      )

      const textarea = screen.getByRole('textbox')
      await user.type(textarea, '\rNTE|1||Modified content')

      const cancelButton = screen.getByText('Cancel')
      await user.click(cancelButton)

      expect(screen.getByText(/unsaved changes/i)).toBeInTheDocument()
      expect(screen.getByText('Discard Changes')).toBeInTheDocument()
      expect(screen.getByText('Keep Editing')).toBeInTheDocument()
    })

    it('should discard changes when confirmed', async () => {
      const user = userEvent.setup()
      render(
        <MessageEditor 
          message={mockMessage} 
          onSave={mockOnSave} 
          onCancel={mockOnCancel} 
        />
      )

      const textarea = screen.getByRole('textbox')
      await user.type(textarea, '\rNTE|1||Modified content')

      const cancelButton = screen.getByText('Cancel')
      await user.click(cancelButton)

      const discardButton = screen.getByText('Discard Changes')
      await user.click(discardButton)

      expect(mockOnCancel).toHaveBeenCalled()
    })
  })

  describe('Validation Features', () => {
    it('should show real-time validation errors', async () => {
      const user = userEvent.setup()
      render(
        <MessageEditor 
          message={mockMessage} 
          onSave={mockOnSave} 
          onCancel={mockOnCancel} 
        />
      )

      const textarea = screen.getByRole('textbox')
      await user.clear(textarea)
      await user.type(textarea, 'INVALID|CONTENT')

      // Should show validation indicators
      await waitFor(() => {
        expect(screen.getByText(/syntax error/i)).toBeInTheDocument()
      })
    })

    it('should highlight syntax errors in the editor', async () => {
      const user = userEvent.setup()
      render(
        <MessageEditor 
          message={mockMessage} 
          onSave={mockOnSave} 
          onCancel={mockOnCancel} 
        />
      )

      const textarea = screen.getByRole('textbox')
      await user.clear(textarea)
      await user.type(textarea, 'MSH|missing_required_fields')

      // Should show error highlighting
      expect(screen.getByRole('textbox')).toHaveClass(/error/i)
    })

    it('should provide field-level validation hints', async () => {
      const user = userEvent.setup()
      render(
        <MessageEditor 
          message={mockMessage} 
          onSave={mockOnSave} 
          onCancel={mockOnCancel} 
        />
      )

      // Focus on a specific field position
      const textarea = screen.getByRole('textbox')
      await user.click(textarea)

      // Should show field information or hints
      expect(screen.getByText(/MSH/)).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(
        <MessageEditor 
          message={mockMessage} 
          onSave={mockOnSave} 
          onCancel={mockOnCancel} 
        />
      )

      expect(screen.getByLabelText(/message content/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    })

    it('should support keyboard shortcuts', async () => {
      const user = userEvent.setup()
      render(
        <MessageEditor 
          message={mockMessage} 
          onSave={mockOnSave} 
          onCancel={mockOnCancel} 
        />
      )

      const textarea = screen.getByRole('textbox')
      await user.type(textarea, '\rNTE|1||Modified')

      // Ctrl+S should save
      await user.keyboard('{Control>}s{/Control}')

      expect(mockOnSave).toHaveBeenCalled()
    })

    it('should handle tab navigation correctly', async () => {
      const user = userEvent.setup()
      render(
        <MessageEditor 
          message={mockMessage} 
          onSave={mockOnSave} 
          onCancel={mockOnCancel} 
        />
      )

      await user.tab()
      expect(screen.getByRole('textbox')).toHaveFocus()

      await user.tab()
      expect(screen.getByText('Save Changes')).toHaveFocus()

      await user.tab()
      expect(screen.getByText('Cancel')).toHaveFocus()
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty message content', () => {
      const emptyMessage = { ...mockMessage, rawMessage: '' }
      
      render(
        <MessageEditor 
          message={emptyMessage} 
          onSave={mockOnSave} 
          onCancel={mockOnCancel} 
        />
      )

      expect(screen.getByRole('textbox')).toHaveValue('')
    })

    it('should handle messages with special characters', () => {
      const specialMessage = {
        ...mockMessage,
        rawMessage: 'MSH|^~\\&|APP|FACILITY|APP|FACILITY|20231201120000||ADT^A01|MSG001|P|2.5\rPID|1||PATIENT123||DOE^JOHN||19800101|M\rNTE|1||Patient has émojis 🏥 in notes'
      }

      render(
        <MessageEditor 
          message={specialMessage} 
          onSave={mockOnSave} 
          onCancel={mockOnCancel} 
        />
      )

      expect(screen.getByDisplayValue(/émojis 🏥/)).toBeInTheDocument()
    })

    it('should handle network errors during save', async () => {
      const user = userEvent.setup()
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

      render(
        <MessageEditor 
          message={mockMessage} 
          onSave={mockOnSave} 
          onCancel={mockOnCancel} 
        />
      )

      const textarea = screen.getByRole('textbox')
      await user.type(textarea, '\rNTE|1||Modified')

      const saveButton = screen.getByText('Save Changes')
      await user.click(saveButton)

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument()
      })
    })
  })
})
