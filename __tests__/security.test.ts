import { 
  encrypt, 
  decrypt, 
  hashPassword, 
  verifyPassword, 
  sanitizeInput, 
  generateApiKey,
  validateApiKey 
} from '../lib/security'

describe('Security utilities', () => {
  describe('encrypt and decrypt', () => {
    it('should encrypt and decrypt data correctly', () => {
      const originalData = 'sensitive patient data'
      
      const encrypted = encrypt(originalData)
      expect(encrypted).not.toBe(originalData)
      expect(encrypted.length).toBeGreaterThan(originalData.length)
      
      const decrypted = decrypt(encrypted)
      expect(decrypted).toBe(originalData)
    })

    it('should produce different encrypted values for same input', () => {
      const data = 'test data'
      
      const encrypted1 = encrypt(data)
      const encrypted2 = encrypt(data)
      
      expect(encrypted1).not.toBe(encrypted2)
      expect(decrypt(encrypted1)).toBe(data)
      expect(decrypt(encrypted2)).toBe(data)
    })

    it('should handle empty strings', () => {
      const encrypted = encrypt('')
      const decrypted = decrypt(encrypted)
      
      expect(decrypted).toBe('')
    })

    it('should handle special characters and unicode', () => {
      const specialData = 'Test with émojis 🏥 and special chars: <>&"\'`'
      
      const encrypted = encrypt(specialData)
      const decrypted = decrypt(encrypted)
      
      expect(decrypted).toBe(specialData)
    })

    it('should throw error for invalid encrypted data', () => {
      expect(() => {
        decrypt('invalid-encrypted-data')
      }).toThrow()
    })
  })

  describe('hashPassword and verifyPassword', () => {
    it('should hash password and verify correctly', async () => {
      const password = 'securePassword123!'
      
      const hashedPassword = await hashPassword(password)
      expect(hashedPassword).not.toBe(password)
      expect(hashedPassword.length).toBeGreaterThan(50) // bcrypt hashes are typically 60 chars
      
      const isValid = await verifyPassword(password, hashedPassword)
      expect(isValid).toBe(true)
    })

    it('should reject incorrect passwords', async () => {
      const password = 'correctPassword'
      const wrongPassword = 'wrongPassword'
      
      const hashedPassword = await hashPassword(password)
      const isValid = await verifyPassword(wrongPassword, hashedPassword)
      
      expect(isValid).toBe(false)
    })

    it('should produce different hashes for same password', async () => {
      const password = 'samePassword'
      
      const hash1 = await hashPassword(password)
      const hash2 = await hashPassword(password)
      
      expect(hash1).not.toBe(hash2)
      expect(await verifyPassword(password, hash1)).toBe(true)
      expect(await verifyPassword(password, hash2)).toBe(true)
    })

    it('should handle empty passwords', async () => {
      const hashedPassword = await hashPassword('')
      const isValid = await verifyPassword('', hashedPassword)
      
      expect(isValid).toBe(true)
    })

    it('should handle long passwords', async () => {
      const longPassword = 'a'.repeat(1000)
      
      const hashedPassword = await hashPassword(longPassword)
      const isValid = await verifyPassword(longPassword, hashedPassword)
      
      expect(isValid).toBe(true)
    })
  })

  describe('sanitizeInput', () => {
    it('should remove HTML tags', () => {
      const input = '<script>alert("xss")</script>Hello World'
      const sanitized = sanitizeInput(input)
      
      expect(sanitized).toBe('Hello World')
      expect(sanitized).not.toContain('<script>')
    })

    it('should handle SQL injection attempts', () => {
      const input = "'; DROP TABLE users; --"
      const sanitized = sanitizeInput(input)
      
      expect(sanitized).not.toContain('DROP TABLE')
      expect(sanitized).not.toContain('--')
    })

    it('should preserve safe content', () => {
      const input = 'Patient Name: John Doe, DOB: 1980-01-01'
      const sanitized = sanitizeInput(input)
      
      expect(sanitized).toBe(input)
    })

    it('should handle HL7 message content safely', () => {
      const hl7Content = 'MSH|^~\\&|SENDING_APP|FACILITY|RECEIVING_APP|FACILITY|20231201120000||ADT^A01|MSG001|P|2.5'
      const sanitized = sanitizeInput(hl7Content)
      
      // Should preserve HL7 delimiters and structure
      expect(sanitized).toContain('MSH|')
      expect(sanitized).toContain('^~\\&')
      expect(sanitized).toContain('ADT^A01')
    })

    it('should remove dangerous JavaScript', () => {
      const input = 'javascript:alert("xss")'
      const sanitized = sanitizeInput(input)
      
      expect(sanitized).not.toContain('javascript:')
      expect(sanitized).not.toContain('alert')
    })

    it('should handle null and undefined', () => {
      expect(sanitizeInput(null as any)).toBe('')
      expect(sanitizeInput(undefined as any)).toBe('')
    })

    it('should handle numbers and booleans', () => {
      expect(sanitizeInput(123 as any)).toBe('123')
      expect(sanitizeInput(true as any)).toBe('true')
      expect(sanitizeInput(false as any)).toBe('false')
    })
  })

  describe('generateApiKey and validateApiKey', () => {
    it('should generate valid API key', () => {
      const apiKey = generateApiKey()
      
      expect(apiKey).toBeDefined()
      expect(typeof apiKey).toBe('string')
      expect(apiKey.length).toBeGreaterThan(20)
      expect(apiKey).toMatch(/^[a-zA-Z0-9_-]+$/) // Base64 URL safe characters
    })

    it('should generate unique API keys', () => {
      const key1 = generateApiKey()
      const key2 = generateApiKey()
      
      expect(key1).not.toBe(key2)
    })

    it('should validate API key format', () => {
      const validKey = generateApiKey()
      const invalidKey = 'invalid-key-format!'
      
      expect(validateApiKey(validKey)).toBe(true)
      expect(validateApiKey(invalidKey)).toBe(false)
    })

    it('should reject empty or null API keys', () => {
      expect(validateApiKey('')).toBe(false)
      expect(validateApiKey(null as any)).toBe(false)
      expect(validateApiKey(undefined as any)).toBe(false)
    })

    it('should reject API keys that are too short', () => {
      const shortKey = 'abc123'
      expect(validateApiKey(shortKey)).toBe(false)
    })

    it('should reject API keys with invalid characters', () => {
      const invalidKey = 'valid-key-but-with-@-symbol'
      expect(validateApiKey(invalidKey)).toBe(false)
    })
  })

  describe('edge cases and error handling', () => {
    it('should handle very large inputs for encryption', () => {
      const largeData = 'x'.repeat(10000)
      
      const encrypted = encrypt(largeData)
      const decrypted = decrypt(encrypted)
      
      expect(decrypted).toBe(largeData)
    })

    it('should handle unicode characters in encryption', () => {
      const unicodeData = '🏥 Healthcare Data with émojis and ñ special chars'
      
      const encrypted = encrypt(unicodeData)
      const decrypted = decrypt(encrypted)
      
      expect(decrypted).toBe(unicodeData)
    })

    it('should handle malformed encrypted data gracefully', () => {
      const malformedData = 'not-a-valid-encrypted-string'
      
      expect(() => {
        decrypt(malformedData)
      }).toThrow()
    })

    it('should handle concurrent encryption/decryption operations', async () => {
      const data = 'concurrent test data'
      const promises = []
      
      for (let i = 0; i < 10; i++) {
        promises.push(Promise.resolve().then(() => {
          const encrypted = encrypt(data)
          return decrypt(encrypted)
        }))
      }
      
      const results = await Promise.all(promises)
      results.forEach(result => {
        expect(result).toBe(data)
      })
    })
  })
})
