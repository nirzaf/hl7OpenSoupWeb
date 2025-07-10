declare module '@ehr/hl7-v2' {
  export class HL7v2 {
    constructor(schema?: any)
    parse(message: string): any
    generate(data: any): string
  }
}
