import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MessageDashboard } from '../../components/message-dashboard'

// Mock child components
jest.mock('../../components/message-list', () => ({
  MessageList: ({ messages, onSelectMessage, selectedMessage }: any) => (
    <div data-testid="message-list">
      {messages.map((msg: any) => (
        <div 
          key={msg._id} 
          data-testid={`message-${msg._id}`}
          onClick={() => onSelectMessage(msg)}
          className={selectedMessage?._id === msg._id ? 'selected' : ''}
        >
          {msg.name}
        </div>
      ))}
    </div>
  )
}))

jest.mock('../../components/message-viewer', () => ({
  MessageViewer: ({ message }: any) => (
    <div data-testid="message-viewer">
      Viewing: {message.name}
    </div>
  )
}))

jest.mock('../../components/message-editor', () => ({
  MessageEditor: ({ message, onSave, onCancel }: any) => (
    <div data-testid="message-editor">
      <span>Editing: {message.name}</span>
      <button onClick={() => onSave({ ...message, name: 'Updated ' + message.name })}>
        Save
      </button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  )
}))

// Mock fetch for API calls
global.fetch = jest.fn()

describe('MessageDashboard', () => {
  const mockMessages = [
    {
      _id: 'msg-1',
      name: 'Test Message 1',
      rawMessage: 'MSH|^~\\&|APP1|FACILITY|APP|FACILITY|20231201120000||ADT^A01|MSG001|P|2.5',
      metadata: { messageType: 'ADT^A01', versionId: '2.5' },
      isValid: true,
      createdAt: new Date('2023-12-01'),
      updatedAt: new Date('2023-12-01')
    },
    {
      _id: 'msg-2',
      name: 'Test Message 2',
      rawMessage: 'MSH|^~\\&|APP2|FACILITY|APP|FACILITY|20231201120000||ORU^R01|MSG002|P|2.5',
      metadata: { messageType: 'ORU^R01', versionId: '2.5' },
      isValid: true,
      createdAt: new Date('2023-12-02'),
      updatedAt: new Date('2023-12-02')
    }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        messages: mockMessages,
        total: mockMessages.length,
        page: 1,
        totalPages: 1
      })
    })
  })

  describe('Initial Load', () => {
    it('should render dashboard with main components', async () => {
      render(<MessageDashboard />)

      expect(screen.getByText('HL7 Message Dashboard')).toBeInTheDocument()
      expect(screen.getByText('New Message')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Search messages...')).toBeInTheDocument()
      expect(screen.getByTestId('message-list')).toBeInTheDocument()
    })

    it('should load messages on mount', async () => {
      render(<MessageDashboard />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/messages?page=1&limit=50')
      })

      await waitFor(() => {
        expect(screen.getByTestId('message-msg-1')).toBeInTheDocument()
        expect(screen.getByTestId('message-msg-2')).toBeInTheDocument()
      })
    })

    it('should handle loading state', () => {
      ;(global.fetch as jest.Mock).mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      )

      render(<MessageDashboard />)

      expect(screen.getByText('Loading messages...')).toBeInTheDocument()
    })

    it('should handle API errors', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('API Error'))

      render(<MessageDashboard />)

      await waitFor(() => {
        expect(screen.getByText(/Failed to load messages/)).toBeInTheDocument()
      })
    })
  })

  describe('Message Selection', () => {
    it('should select message when clicked', async () => {
      render(<MessageDashboard />)

      await waitFor(() => {
        expect(screen.getByTestId('message-msg-1')).toBeInTheDocument()
      })

      const messageItem = screen.getByTestId('message-msg-1')
      fireEvent.click(messageItem)

      expect(messageItem).toHaveClass('selected')
      expect(screen.getByTestId('message-viewer')).toBeInTheDocument()
      expect(screen.getByText('Viewing: Test Message 1')).toBeInTheDocument()
    })

    it('should switch between selected messages', async () => {
      render(<MessageDashboard />)

      await waitFor(() => {
        expect(screen.getByTestId('message-msg-1')).toBeInTheDocument()
      })

      // Select first message
      fireEvent.click(screen.getByTestId('message-msg-1'))
      expect(screen.getByText('Viewing: Test Message 1')).toBeInTheDocument()

      // Select second message
      fireEvent.click(screen.getByTestId('message-msg-2'))
      expect(screen.getByText('Viewing: Test Message 2')).toBeInTheDocument()
    })

    it('should deselect message when clicking selected message', async () => {
      render(<MessageDashboard />)

      await waitFor(() => {
        expect(screen.getByTestId('message-msg-1')).toBeInTheDocument()
      })

      const messageItem = screen.getByTestId('message-msg-1')
      
      // Select message
      fireEvent.click(messageItem)
      expect(screen.getByTestId('message-viewer')).toBeInTheDocument()

      // Deselect message
      fireEvent.click(messageItem)
      expect(screen.queryByTestId('message-viewer')).not.toBeInTheDocument()
    })
  })

  describe('Search Functionality', () => {
    it('should filter messages based on search input', async () => {
      const user = userEvent.setup()
      render(<MessageDashboard />)

      await waitFor(() => {
        expect(screen.getByTestId('message-msg-1')).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText('Search messages...')
      await user.type(searchInput, 'Test Message 1')

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('search=Test%20Message%201')
        )
      })
    })

    it('should debounce search input', async () => {
      const user = userEvent.setup()
      render(<MessageDashboard />)

      const searchInput = screen.getByPlaceholderText('Search messages...')
      
      // Type quickly
      await user.type(searchInput, 'test')
      
      // Should not call API immediately
      expect(global.fetch).toHaveBeenCalledTimes(1) // Only initial load

      // Wait for debounce
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('search=test')
        )
      }, { timeout: 1000 })
    })

    it('should clear search results', async () => {
      const user = userEvent.setup()
      render(<MessageDashboard />)

      const searchInput = screen.getByPlaceholderText('Search messages...')
      await user.type(searchInput, 'test')
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('search=test')
        )
      })

      await user.clear(searchInput)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/messages?page=1&limit=50')
      })
    })
  })

  describe('New Message Creation', () => {
    it('should open new message dialog', async () => {
      const user = userEvent.setup()
      render(<MessageDashboard />)

      const newMessageButton = screen.getByText('New Message')
      await user.click(newMessageButton)

      expect(screen.getByText('Create New Message')).toBeInTheDocument()
      expect(screen.getByLabelText('Message Name')).toBeInTheDocument()
      expect(screen.getByLabelText('HL7 Content')).toBeInTheDocument()
    })

    it('should create new message', async () => {
      const user = userEvent.setup()
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ messages: mockMessages, total: 2 })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ _id: 'new-msg-id', success: true })
        })

      render(<MessageDashboard />)

      await user.click(screen.getByText('New Message'))

      await user.type(screen.getByLabelText('Message Name'), 'New Test Message')
      await user.type(screen.getByLabelText('HL7 Content'), 'MSH|^~\\&|NEW_APP|FACILITY|APP|FACILITY|20231201120000||ADT^A01|MSG003|P|2.5')

      await user.click(screen.getByText('Save Message'))

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'New Test Message',
            rawMessage: 'MSH|^~\\&|NEW_APP|FACILITY|APP|FACILITY|20231201120000||ADT^A01|MSG003|P|2.5'
          })
        })
      })
    })

    it('should validate new message input', async () => {
      const user = userEvent.setup()
      render(<MessageDashboard />)

      await user.click(screen.getByText('New Message'))
      await user.click(screen.getByText('Save Message'))

      expect(screen.getByText('Message name is required')).toBeInTheDocument()
      expect(screen.getByText('HL7 content is required')).toBeInTheDocument()
    })

    it('should handle creation errors', async () => {
      const user = userEvent.setup()
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ messages: mockMessages })
        })
        .mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ error: 'Invalid HL7 format' })
        })

      render(<MessageDashboard />)

      await user.click(screen.getByText('New Message'))
      await user.type(screen.getByLabelText('Message Name'), 'Invalid Message')
      await user.type(screen.getByLabelText('HL7 Content'), 'INVALID_CONTENT')
      await user.click(screen.getByText('Save Message'))

      await waitFor(() => {
        expect(screen.getByText('Invalid HL7 format')).toBeInTheDocument()
      })
    })
  })

  describe('Message Editing', () => {
    it('should enter edit mode for selected message', async () => {
      const user = userEvent.setup()
      render(<MessageDashboard />)

      await waitFor(() => {
        expect(screen.getByTestId('message-msg-1')).toBeInTheDocument()
      })

      // Select message
      await user.click(screen.getByTestId('message-msg-1'))
      
      // Enter edit mode
      await user.click(screen.getByText('Edit'))

      expect(screen.getByTestId('message-editor')).toBeInTheDocument()
      expect(screen.getByText('Editing: Test Message 1')).toBeInTheDocument()
    })

    it('should save edited message', async () => {
      const user = userEvent.setup()
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ messages: mockMessages })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true })
        })

      render(<MessageDashboard />)

      await waitFor(() => {
        expect(screen.getByTestId('message-msg-1')).toBeInTheDocument()
      })

      await user.click(screen.getByTestId('message-msg-1'))
      await user.click(screen.getByText('Edit'))
      await user.click(screen.getByText('Save'))

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/messages/msg-1', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('Updated Test Message 1')
        })
      })
    })

    it('should cancel editing', async () => {
      const user = userEvent.setup()
      render(<MessageDashboard />)

      await waitFor(() => {
        expect(screen.getByTestId('message-msg-1')).toBeInTheDocument()
      })

      await user.click(screen.getByTestId('message-msg-1'))
      await user.click(screen.getByText('Edit'))
      
      expect(screen.getByTestId('message-editor')).toBeInTheDocument()
      
      await user.click(screen.getByText('Cancel'))
      
      expect(screen.queryByTestId('message-editor')).not.toBeInTheDocument()
      expect(screen.getByTestId('message-viewer')).toBeInTheDocument()
    })
  })

  describe('Pagination', () => {
    it('should handle pagination controls', async () => {
      const user = userEvent.setup()
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          messages: mockMessages,
          total: 100,
          page: 1,
          totalPages: 2
        })
      })

      render(<MessageDashboard />)

      await waitFor(() => {
        expect(screen.getByText('Next')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Next'))

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/messages?page=2&limit=50')
      })
    })

    it('should disable pagination buttons appropriately', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          messages: mockMessages,
          total: 2,
          page: 1,
          totalPages: 1
        })
      })

      render(<MessageDashboard />)

      await waitFor(() => {
        const prevButton = screen.queryByText('Previous')
        const nextButton = screen.queryByText('Next')
        
        if (prevButton) expect(prevButton).toBeDisabled()
        if (nextButton) expect(nextButton).toBeDisabled()
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', async () => {
      render(<MessageDashboard />)

      expect(screen.getByRole('main')).toBeInTheDocument()
      expect(screen.getByRole('searchbox')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /new message/i })).toBeInTheDocument()
    })

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup()
      render(<MessageDashboard />)

      await waitFor(() => {
        expect(screen.getByTestId('message-msg-1')).toBeInTheDocument()
      })

      // Tab to search input
      await user.tab()
      expect(screen.getByPlaceholderText('Search messages...')).toHaveFocus()

      // Tab to new message button
      await user.tab()
      expect(screen.getByText('New Message')).toHaveFocus()
    })
  })
})
