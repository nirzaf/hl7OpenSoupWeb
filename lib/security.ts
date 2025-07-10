import crypto from 'crypto'

export interface SecurityConfig {
  encryptionKey: string
  saltRounds: number
  sessionTimeout: number
  maxLoginAttempts: number
  passwordMinLength: number
  requireMFA: boolean
}

export interface AuditLog {
  timestamp: Date
  userId: string
  action: string
  resource: string
  resourceId?: string
  ipAddress: string
  userAgent: string
  success: boolean
  details?: any
}

export class SecurityService {
  private static readonly ALGORITHM = 'aes-256-gcm'
  private static readonly IV_LENGTH = 16
  private static readonly SALT_LENGTH = 32
  private static readonly TAG_LENGTH = 16

  /**
   * Encrypt sensitive data (PHI/PII)
   */
  static encrypt(text: string, key: string): string {
    try {
      const iv = crypto.randomBytes(this.IV_LENGTH)
      const cipher = crypto.createCipher(this.ALGORITHM, key)
      cipher.setAAD(Buffer.from('hl7-opensoup', 'utf8'))
      
      let encrypted = cipher.update(text, 'utf8', 'hex')
      encrypted += cipher.final('hex')
      
      const authTag = cipher.getAuthTag()
      
      // Combine IV, auth tag, and encrypted data
      return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted
    } catch (error) {
      throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Decrypt sensitive data
   */
  static decrypt(encryptedData: string, key: string): string {
    try {
      const parts = encryptedData.split(':')
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format')
      }

      const iv = Buffer.from(parts[0], 'hex')
      const authTag = Buffer.from(parts[1], 'hex')
      const encrypted = parts[2]

      const decipher = crypto.createDecipher(this.ALGORITHM, key)
      decipher.setAAD(Buffer.from('hl7-opensoup', 'utf8'))
      decipher.setAuthTag(authTag)

      let decrypted = decipher.update(encrypted, 'hex', 'utf8')
      decrypted += decipher.final('utf8')

      return decrypted
    } catch (error) {
      throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Hash passwords securely
   */
  static async hashPassword(password: string): Promise<string> {
    const salt = crypto.randomBytes(this.SALT_LENGTH).toString('hex')
    const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex')
    return `${salt}:${hash}`
  }

  /**
   * Verify password against hash
   */
  static async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    try {
      const [salt, hash] = hashedPassword.split(':')
      const verifyHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex')
      return hash === verifyHash
    } catch (error) {
      return false
    }
  }

  /**
   * Sanitize input to prevent injection attacks
   */
  static sanitizeInput(input: string): string {
    if (typeof input !== 'string') {
      return ''
    }

    return input
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/['"]/g, '') // Remove quotes
      .replace(/[;]/g, '') // Remove semicolons
      .replace(/--/g, '') // Remove SQL comment markers
      .replace(/\/\*/g, '') // Remove SQL block comment start
      .replace(/\*\//g, '') // Remove SQL block comment end
      .trim()
  }

  /**
   * Validate HL7 message for potential security issues
   */
  static validateHL7Security(hl7Message: string): {
    isSecure: boolean
    issues: string[]
  } {
    const issues: string[] = []

    // Check for potential script injection
    if (/<script|javascript:|data:/i.test(hl7Message)) {
      issues.push('Potential script injection detected')
    }

    // Check for SQL injection patterns
    if (/(\bUNION\b|\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b)/i.test(hl7Message)) {
      issues.push('Potential SQL injection patterns detected')
    }

    // Check for excessive length (potential DoS)
    if (hl7Message.length > 1000000) { // 1MB limit
      issues.push('Message exceeds maximum allowed size')
    }

    // Check for suspicious characters
    if (/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(hl7Message)) {
      issues.push('Contains suspicious control characters')
    }

    return {
      isSecure: issues.length === 0,
      issues
    }
  }

  /**
   * Generate secure session token
   */
  static generateSessionToken(): string {
    return crypto.randomBytes(32).toString('hex')
  }

  /**
   * Generate CSRF token
   */
  static generateCSRFToken(): string {
    return crypto.randomBytes(16).toString('hex')
  }

  /**
   * Mask sensitive data for logging
   */
  static maskSensitiveData(data: any): any {
    if (typeof data === 'string') {
      // Mask potential SSNs, phone numbers, etc.
      return data
        .replace(/\b\d{3}-\d{2}-\d{4}\b/g, 'XXX-XX-XXXX') // SSN
        .replace(/\b\d{3}-\d{3}-\d{4}\b/g, 'XXX-XXX-XXXX') // Phone
        .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, 'XXX@XXX.XXX') // Email
    }

    if (typeof data === 'object' && data !== null) {
      const masked = { ...data }
      
      // Mask common sensitive field names
      const sensitiveFields = ['ssn', 'social', 'phone', 'email', 'address', 'dob', 'birthdate']
      
      for (const field of sensitiveFields) {
        if (field in masked) {
          masked[field] = 'XXXXX'
        }
      }

      return masked
    }

    return data
  }

  /**
   * Log security events for audit trail
   */
  static async logSecurityEvent(event: Partial<AuditLog>): Promise<void> {
    const auditEntry: AuditLog = {
      timestamp: new Date(),
      userId: event.userId || 'anonymous',
      action: event.action || 'unknown',
      resource: event.resource || 'unknown',
      resourceId: event.resourceId,
      ipAddress: event.ipAddress || 'unknown',
      userAgent: event.userAgent || 'unknown',
      success: event.success ?? true,
      details: this.maskSensitiveData(event.details)
    }

    // In a real implementation, this would write to a secure audit log
    console.log('AUDIT:', JSON.stringify(auditEntry))
  }

  /**
   * Check if IP address is rate limited
   */
  static checkRateLimit(ipAddress: string, maxRequests: number = 100, windowMs: number = 900000): boolean {
    // In a real implementation, this would use Redis or similar
    // For now, return true (not rate limited)
    return true
  }

  /**
   * Validate HIPAA compliance requirements
   */
  static validateHIPAACompliance(data: any): {
    isCompliant: boolean
    violations: string[]
  } {
    const violations: string[] = []

    // Check for minimum necessary standard
    if (!data.accessReason) {
      violations.push('Access reason not specified (minimum necessary standard)')
    }

    // Check for audit trail
    if (!data.auditTrail) {
      violations.push('Audit trail not maintained')
    }

    // Check for encryption
    if (!data.encrypted && data.containsPHI) {
      violations.push('PHI not encrypted at rest')
    }

    // Check for access controls
    if (!data.accessControls) {
      violations.push('Access controls not implemented')
    }

    return {
      isCompliant: violations.length === 0,
      violations
    }
  }

  /**
   * Generate secure random password
   */
  static generateSecurePassword(length: number = 16): string {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
    let password = ''
    
    for (let i = 0; i < length; i++) {
      const randomIndex = crypto.randomInt(0, charset.length)
      password += charset[randomIndex]
    }
    
    return password
  }

  /**
   * Validate password strength
   */
  static validatePasswordStrength(password: string): {
    isStrong: boolean
    score: number
    feedback: string[]
  } {
    const feedback: string[] = []
    let score = 0

    if (password.length >= 8) score += 1
    else feedback.push('Password should be at least 8 characters long')

    if (/[a-z]/.test(password)) score += 1
    else feedback.push('Password should contain lowercase letters')

    if (/[A-Z]/.test(password)) score += 1
    else feedback.push('Password should contain uppercase letters')

    if (/[0-9]/.test(password)) score += 1
    else feedback.push('Password should contain numbers')

    if (/[^a-zA-Z0-9]/.test(password)) score += 1
    else feedback.push('Password should contain special characters')

    if (password.length >= 12) score += 1

    return {
      isStrong: score >= 4,
      score,
      feedback
    }
  }
}

// Export default security configuration
export const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  encryptionKey: process.env.ENCRYPTION_KEY || 'default-key-change-in-production',
  saltRounds: 12,
  sessionTimeout: 3600000, // 1 hour
  maxLoginAttempts: 5,
  passwordMinLength: 8,
  requireMFA: false
}
