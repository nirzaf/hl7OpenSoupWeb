import { getCollection } from './mongodb'
import type { ValidationRule, RuleSet, LookupTable, ValidationError } from '@/types/hl7'

export interface RuleExecutionContext {
  messageData: any
  lookupTables: Map<string, LookupTable>
  variables: Map<string, any>
}

export interface RuleExecutionResult {
  ruleId: string
  ruleName: string
  success: boolean
  violated: boolean
  value?: any
  action: string
  actionDetail?: string
  severity: 'error' | 'warning' | 'info'
  executionTime: number
  error?: string
}

export interface HighlightRule {
  targetPath: string
  condition: string
  value?: string
  highlightColor: string
  highlightStyle: 'background' | 'text' | 'border'
}

export class RulesEngine {
  private lookupTables: Map<string, LookupTable> = new Map()
  private customFunctions: Map<string, Function> = new Map()

  constructor() {
    this.initializeCustomFunctions()
  }

  /**
   * Execute all rules in a rule set against a message
   */
  async executeRuleSet(messageData: any, ruleSet: RuleSet): Promise<{
    results: RuleExecutionResult[]
    summary: {
      totalRules: number
      passedRules: number
      failedRules: number
      errors: number
      warnings: number
      info: number
      executionTime: number
    }
  }> {
    const startTime = Date.now()
    const results: RuleExecutionResult[] = []

    // Load required lookup tables
    await this.loadLookupTables(ruleSet.rules)

    // Create execution context
    const context: RuleExecutionContext = {
      messageData,
      lookupTables: this.lookupTables,
      variables: new Map()
    }

    // Execute each rule
    for (const rule of ruleSet.rules) {
      if (!rule.isActive) continue

      const ruleResult = await this.executeRule(rule, context)
      results.push(ruleResult)
    }

    const executionTime = Date.now() - startTime
    const summary = this.generateExecutionSummary(results, executionTime)

    return { results, summary }
  }

  /**
   * Execute a single rule
   */
  async executeRule(rule: ValidationRule, context: RuleExecutionContext): Promise<RuleExecutionResult> {
    const startTime = Date.now()

    try {
      const evaluation = this.evaluateRule(rule, context)
      const executionTime = Date.now() - startTime

      return {
        ruleId: rule._id || '',
        ruleName: rule.name,
        success: true,
        violated: evaluation.violated,
        value: evaluation.value,
        action: rule.action,
        actionDetail: rule.actionDetail,
        severity: rule.severity,
        executionTime
      }
    } catch (error) {
      const executionTime = Date.now() - startTime

      return {
        ruleId: rule._id || '',
        ruleName: rule.name,
        success: false,
        violated: false,
        action: rule.action,
        actionDetail: rule.actionDetail,
        severity: rule.severity,
        executionTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Evaluate a rule condition
   */
  private evaluateRule(rule: ValidationRule, context: RuleExecutionContext): { violated: boolean, value?: any } {
    if (!rule.targetPath || !rule.condition) {
      return { violated: false }
    }

    const value = this.getValueAtPath(context.messageData, rule.targetPath)

    switch (rule.condition) {
      case 'exists':
        return { violated: this.isEmpty(value), value }
      
      case 'not_exists':
        return { violated: !this.isEmpty(value), value }
      
      case 'equals':
        return { violated: value !== rule.value, value }
      
      case 'not_equals':
        return { violated: value === rule.value, value }
      
      case 'startsWith':
        return { 
          violated: !this.isString(value) || !value.startsWith(rule.value || ''), 
          value 
        }
      
      case 'endsWith':
        return { 
          violated: !this.isString(value) || !value.endsWith(rule.value || ''), 
          value 
        }
      
      case 'contains':
        return { 
          violated: !this.isString(value) || !value.includes(rule.value || ''), 
          value 
        }
      
      case 'matchesRegex':
        return this.evaluateRegexCondition(value, rule.value)
      
      default:
        return { violated: false, value }
    }
  }

  /**
   * Perform table lookup
   */
  async performLookup(tableName: string, key: string): Promise<string | null> {
    const table = this.lookupTables.get(tableName)
    if (!table) {
      throw new Error(`Lookup table '${tableName}' not found`)
    }

    const entry = table.data.find(item => item.key === key)
    return entry ? entry.value : null
  }

  /**
   * Generate highlighting rules from validation results
   */
  generateHighlightingRules(results: RuleExecutionResult[]): HighlightRule[] {
    const highlightRules: HighlightRule[] = []

    for (const result of results) {
      if (result.violated && result.action === 'highlight') {
        // Extract color from actionDetail or use default based on severity
        const color = this.extractHighlightColor(result.actionDetail, result.severity)
        
        highlightRules.push({
          targetPath: this.extractTargetPath(result),
          condition: 'exists',
          highlightColor: color,
          highlightStyle: 'background'
        })
      }
    }

    return highlightRules
  }

  /**
   * Create custom validation rule
   */
  createCustomRule(ruleData: Partial<ValidationRule>): ValidationRule {
    return {
      _id: ruleData._id,
      name: ruleData.name || 'Custom Rule',
      description: ruleData.description || '',
      ruleType: 'custom',
      hl7Version: ruleData.hl7Version || '2.5',
      targetPath: ruleData.targetPath,
      condition: ruleData.condition || 'exists',
      value: ruleData.value,
      action: ruleData.action || 'warning',
      actionDetail: ruleData.actionDetail,
      severity: ruleData.severity || 'warning',
      isActive: ruleData.isActive !== false
    }
  }

  /**
   * Load required lookup tables
   */
  private async loadLookupTables(rules: ValidationRule[]): Promise<void> {
    const tableNames = new Set<string>()
    
    // Extract table names from rules (if we add lookup condition in the future)
    for (const rule of rules) {
      // Future: handle lookup conditions
      if (rule.ruleType === 'custom' && rule.value) {
        // Could extract table names from custom rules
      }
    }

    // Load tables from database
    if (tableNames.size > 0) {
      const collection = await getCollection('lookupTables')
      const tables = await collection.find({ 
        name: { $in: Array.from(tableNames) } 
      }).toArray()

      for (const table of tables) {
        this.lookupTables.set(table.name, table)
      }
    }
  }

  /**
   * Get value at path in object
   */
  private getValueAtPath(obj: any, path: string): any {
    const pathParts = path.split('.')
    let current = obj

    for (const part of pathParts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part]
      } else {
        return undefined
      }
    }

    return current
  }

  /**
   * Check if value is empty
   */
  private isEmpty(value: any): boolean {
    return value === undefined || value === null || value === ''
  }

  /**
   * Check if value is string
   */
  private isString(value: any): boolean {
    return typeof value === 'string'
  }

  /**
   * Evaluate regex condition
   */
  private evaluateRegexCondition(value: any, pattern?: string): { violated: boolean, value?: any } {
    if (!this.isString(value) || !pattern) {
      return { violated: true, value }
    }

    try {
      const regex = new RegExp(pattern)
      return { violated: !regex.test(value), value }
    } catch (error) {
      console.error('Invalid regex pattern:', pattern, error)
      return { violated: false, value }
    }
  }

  /**
   * Extract highlight color from action detail
   */
  private extractHighlightColor(actionDetail?: string, severity?: string): string {
    if (actionDetail && actionDetail.includes('color:')) {
      const match = actionDetail.match(/color:\s*([#\w]+)/)
      if (match) return match[1]
    }

    // Default colors based on severity
    switch (severity) {
      case 'error': return '#ffebee'
      case 'warning': return '#fff3e0'
      case 'info': return '#e3f2fd'
      default: return '#f5f5f5'
    }
  }

  /**
   * Extract target path from rule result
   */
  private extractTargetPath(result: RuleExecutionResult): string {
    // This would need to be enhanced to extract the actual path
    // For now, return a placeholder
    return 'MSH.1'
  }

  /**
   * Generate execution summary
   */
  private generateExecutionSummary(results: RuleExecutionResult[], executionTime: number) {
    const totalRules = results.length
    const passedRules = results.filter(r => r.success && !r.violated).length
    const failedRules = results.filter(r => !r.success || r.violated).length
    const errors = results.filter(r => r.violated && r.severity === 'error').length
    const warnings = results.filter(r => r.violated && r.severity === 'warning').length
    const info = results.filter(r => r.violated && r.severity === 'info').length

    return {
      totalRules,
      passedRules,
      failedRules,
      errors,
      warnings,
      info,
      executionTime
    }
  }

  /**
   * Initialize custom functions for advanced rule evaluation
   */
  private initializeCustomFunctions(): void {
    // Date validation function
    this.customFunctions.set('isValidDate', (value: string) => {
      const hl7DateRegex = /^\d{8}(\d{6}(\.\d{1,4})?)?([+-]\d{4})?$/
      return hl7DateRegex.test(value)
    })

    // ID validation function
    this.customFunctions.set('isValidId', (value: string) => {
      return /^[A-Za-z0-9]+$/.test(value) && value.length >= 3
    })

    // Code validation function
    this.customFunctions.set('isValidCode', (value: string) => {
      return value.includes('^') && value.split('^').length >= 2
    })
  }
}

// Export default instance
export const defaultRulesEngine = new RulesEngine()
