// Mock for react-syntax-highlighter
import React from 'react'

// Mock the Prism component
export const Prism = ({ children, ...props }) => {
  return React.createElement('pre', { 
    'data-testid': 'syntax-highlighter',
    className: 'syntax-highlighter',
    ...props 
  }, children)
}

// Mock the Light component
export const Light = ({ children, ...props }) => {
  return React.createElement('pre', { 
    'data-testid': 'syntax-highlighter-light',
    className: 'syntax-highlighter-light',
    ...props 
  }, children)
}

// Default export
export default Prism

// Mock styles
export const prism = {}
export const tomorrow = {}
export const okaidia = {}
