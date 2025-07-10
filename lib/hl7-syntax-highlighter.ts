import type { ValidationError } from '@/types/hl7'

export interface HL7Token {
  type: 'segment' | 'field-separator' | 'component-separator' | 'repetition-separator' | 'escape-character' | 'subcomponent-separator' | 'field' | 'component' | 'text'
  value: string
  position: {
    start: number
    end: number
    line: number
    column: number
  }
}

export interface HL7HighlightRule {
  line: number
  startColumn: number
  endColumn: number
  className: string
  message?: string
  severity: 'error' | 'warning' | 'info'
}

export class HL7SyntaxHighlighter {
  private static readonly FIELD_SEPARATOR = '|'
  private static readonly COMPONENT_SEPARATOR = '^'
  private static readonly REPETITION_SEPARATOR = '~'
  private static readonly ESCAPE_CHARACTER = '\\'
  private static readonly SUBCOMPONENT_SEPARATOR = '&'

  /**
   * Tokenize HL7 message for syntax highlighting
   */
  static tokenize(hl7Text: string): HL7Token[] {
    const tokens: HL7Token[] = []
    const lines = hl7Text.split('\n')

    lines.forEach((line, lineIndex) => {
      let columnIndex = 0
      
      // Skip empty lines
      if (!line.trim()) return

      // Parse segment header (first 3 characters)
      if (line.length >= 3) {
        const segmentName = line.substring(0, 3)
        tokens.push({
          type: 'segment',
          value: segmentName,
          position: {
            start: columnIndex,
            end: columnIndex + 3,
            line: lineIndex,
            column: columnIndex
          }
        })
        columnIndex += 3
      }

      // Parse the rest of the line
      for (let i = 3; i < line.length; i++) {
        const char = line[i]
        const tokenStart = columnIndex

        switch (char) {
          case this.FIELD_SEPARATOR:
            tokens.push({
              type: 'field-separator',
              value: char,
              position: {
                start: tokenStart,
                end: tokenStart + 1,
                line: lineIndex,
                column: tokenStart
              }
            })
            break

          case this.COMPONENT_SEPARATOR:
            tokens.push({
              type: 'component-separator',
              value: char,
              position: {
                start: tokenStart,
                end: tokenStart + 1,
                line: lineIndex,
                column: tokenStart
              }
            })
            break

          case this.REPETITION_SEPARATOR:
            tokens.push({
              type: 'repetition-separator',
              value: char,
              position: {
                start: tokenStart,
                end: tokenStart + 1,
                line: lineIndex,
                column: tokenStart
              }
            })
            break

          case this.ESCAPE_CHARACTER:
            tokens.push({
              type: 'escape-character',
              value: char,
              position: {
                start: tokenStart,
                end: tokenStart + 1,
                line: lineIndex,
                column: tokenStart
              }
            })
            break

          case this.SUBCOMPONENT_SEPARATOR:
            tokens.push({
              type: 'subcomponent-separator',
              value: char,
              position: {
                start: tokenStart,
                end: tokenStart + 1,
                line: lineIndex,
                column: tokenStart
              }
            })
            break

          default:
            // Collect text until next separator
            let textValue = char
            let j = i + 1
            while (j < line.length && !this.isSeparator(line[j])) {
              textValue += line[j]
              j++
            }
            
            tokens.push({
              type: 'text',
              value: textValue,
              position: {
                start: tokenStart,
                end: tokenStart + textValue.length,
                line: lineIndex,
                column: tokenStart
              }
            })
            
            i = j - 1 // Adjust loop counter
            columnIndex += textValue.length - 1
            break
        }
        
        columnIndex++
      }
    })

    return tokens
  }

  /**
   * Generate CSS classes for syntax highlighting
   */
  static generateCSS(): string {
    return `
      .hl7-segment {
        color: #0066cc;
        font-weight: bold;
      }
      
      .hl7-field-separator {
        color: #666666;
        font-weight: bold;
      }
      
      .hl7-component-separator {
        color: #cc6600;
      }
      
      .hl7-repetition-separator {
        color: #009900;
      }
      
      .hl7-escape-character {
        color: #cc0000;
        font-weight: bold;
      }
      
      .hl7-subcomponent-separator {
        color: #9900cc;
      }
      
      .hl7-text {
        color: #333333;
      }
      
      .hl7-error {
        background-color: #ffebee;
        border-bottom: 2px solid #f44336;
      }
      
      .hl7-warning {
        background-color: #fff3e0;
        border-bottom: 2px solid #ff9800;
      }
      
      .hl7-info {
        background-color: #e3f2fd;
        border-bottom: 2px solid #2196f3;
      }
    `
  }

  /**
   * Convert validation errors to highlight rules
   */
  static validationErrorsToHighlightRules(
    hl7Text: string, 
    validationErrors: ValidationError[]
  ): HL7HighlightRule[] {
    const rules: HL7HighlightRule[] = []
    const lines = hl7Text.split('\n')

    validationErrors.forEach(error => {
      // Find the line containing the segment
      const lineIndex = lines.findIndex(line => 
        line.trim().startsWith(error.segment)
      )

      if (lineIndex >= 0) {
        const line = lines[lineIndex]
        const segmentStart = line.indexOf(error.segment)
        
        if (error.field > 0) {
          // Highlight specific field
          const fieldPosition = this.findFieldPosition(line, error.field)
          if (fieldPosition) {
            rules.push({
              line: lineIndex,
              startColumn: fieldPosition.start,
              endColumn: fieldPosition.end,
              className: `hl7-${error.severity}`,
              message: error.message,
              severity: error.severity
            })
          }
        } else {
          // Highlight entire segment
          rules.push({
            line: lineIndex,
            startColumn: segmentStart,
            endColumn: segmentStart + error.segment.length,
            className: `hl7-${error.severity}`,
            message: error.message,
            severity: error.severity
          })
        }
      }
    })

    return rules
  }

  /**
   * Apply highlighting to HTML
   */
  static applyHighlighting(
    hl7Text: string, 
    highlightRules: HL7HighlightRule[] = []
  ): string {
    const tokens = this.tokenize(hl7Text)
    const lines = hl7Text.split('\n')
    const highlightedLines: string[] = []

    lines.forEach((line, lineIndex) => {
      let highlightedLine = ''
      let currentPosition = 0

      // Get tokens for this line
      const lineTokens = tokens.filter(token => token.position.line === lineIndex)
      
      // Get highlight rules for this line
      const lineHighlightRules = highlightRules.filter(rule => rule.line === lineIndex)

      lineTokens.forEach(token => {
        // Add any text before this token
        if (token.position.start > currentPosition) {
          highlightedLine += line.substring(currentPosition, token.position.start)
        }

        // Check if this token should be highlighted due to validation errors
        const applicableRules = lineHighlightRules.filter(rule =>
          token.position.start >= rule.startColumn && 
          token.position.end <= rule.endColumn
        )

        let tokenHTML = `<span class="hl7-${token.type}">`
        
        if (applicableRules.length > 0) {
          const rule = applicableRules[0] // Use first applicable rule
          tokenHTML = `<span class="hl7-${token.type} ${rule.className}" title="${rule.message || ''}">`
        }

        tokenHTML += this.escapeHTML(token.value) + '</span>'
        highlightedLine += tokenHTML

        currentPosition = token.position.end
      })

      // Add any remaining text
      if (currentPosition < line.length) {
        highlightedLine += this.escapeHTML(line.substring(currentPosition))
      }

      highlightedLines.push(highlightedLine)
    })

    return highlightedLines.join('\n')
  }

  /**
   * Check if character is a separator
   */
  private static isSeparator(char: string): boolean {
    return [
      this.FIELD_SEPARATOR,
      this.COMPONENT_SEPARATOR,
      this.REPETITION_SEPARATOR,
      this.ESCAPE_CHARACTER,
      this.SUBCOMPONENT_SEPARATOR
    ].includes(char)
  }

  /**
   * Find position of a specific field in a line
   */
  private static findFieldPosition(line: string, fieldNumber: number): { start: number; end: number } | null {
    const fields = line.split(this.FIELD_SEPARATOR)
    
    if (fieldNumber >= fields.length) {
      return null
    }

    let position = 0
    for (let i = 0; i < fieldNumber; i++) {
      position += fields[i].length + 1 // +1 for the separator
    }

    return {
      start: position,
      end: position + fields[fieldNumber].length
    }
  }

  /**
   * Escape HTML characters
   */
  private static escapeHTML(text: string): string {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }
}

// Export CSS for use in components
export const HL7_SYNTAX_CSS = HL7SyntaxHighlighter.generateCSS()
