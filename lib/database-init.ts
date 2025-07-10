import { getDatabase } from './mongodb'
import type { RuleSet, LookupTable } from '@/types/hl7'

export async function initializeDatabase() {
  try {
    const db = await getDatabase()
    
    // Create collections if they don't exist
    const collections = await db.listCollections().toArray()
    const collectionNames = collections.map(c => c.name)
    
    const requiredCollections = ['messages', 'ruleSets', 'lookupTables', 'workflows']
    
    for (const collectionName of requiredCollections) {
      if (!collectionNames.includes(collectionName)) {
        await db.createCollection(collectionName)
        console.log(`Created collection: ${collectionName}`)
      }
    }
    
    // Create indexes for optimal performance
    await createIndexes(db)
    
    // Seed with default data
    await seedDefaultData(db)
    
    console.log('Database initialization completed successfully')
  } catch (error) {
    console.error('Database initialization failed:', error)
    throw error
  }
}

async function createIndexes(db: any) {
  try {
    // Messages collection indexes
    const messagesCollection = db.collection('messages')
    
    // Compound index for message type and timestamp (most common query pattern)
    await messagesCollection.createIndex(
      { 'metadata.messageType': 1, 'metadata.timestamp': -1 },
      { name: 'messageType_timestamp_idx' }
    )
    
    // Single field indexes for filtering
    await messagesCollection.createIndex(
      { 'metadata.sendingFacility': 1 },
      { name: 'sendingFacility_idx' }
    )
    
    await messagesCollection.createIndex(
      { 'metadata.receivingFacility': 1 },
      { name: 'receivingFacility_idx' }
    )
    
    // Multi-key index for tags
    await messagesCollection.createIndex(
      { 'metadata.tags': 1 },
      { name: 'tags_idx' }
    )
    
    // Text index for content-based search
    await messagesCollection.createIndex(
      { rawMessage: 'text', name: 'text' },
      { name: 'content_search_idx' }
    )
    
    // RuleSets collection indexes
    const ruleSetsCollection = db.collection('ruleSets')
    await ruleSetsCollection.createIndex(
      { name: 1 },
      { unique: true, name: 'ruleset_name_idx' }
    )
    
    // LookupTables collection indexes
    const lookupTablesCollection = db.collection('lookupTables')
    await lookupTablesCollection.createIndex(
      { name: 1 },
      { unique: true, name: 'lookup_name_idx' }
    )
    
    // Workflows collection indexes
    const workflowsCollection = db.collection('workflows')
    await workflowsCollection.createIndex(
      { name: 1 },
      { unique: true, name: 'workflow_name_idx' }
    )
    
    console.log('Database indexes created successfully')
  } catch (error) {
    console.error('Failed to create indexes:', error)
    throw error
  }
}

async function seedDefaultData(db: any) {
  try {
    // Check if default data already exists
    const ruleSetsCollection = db.collection('ruleSets')
    const existingRuleSets = await ruleSetsCollection.countDocuments()
    
    if (existingRuleSets === 0) {
      // Create default HL7 v2.5 rule set
      const defaultRuleSet: RuleSet = {
        name: 'HL7 v2.5 Standard',
        description: 'Standard HL7 v2.5 validation rules',
        isSystemDefined: true,
        rules: [
          {
            name: 'MSH Segment Required',
            description: 'MSH segment must be present in all messages',
            ruleType: 'structure',
            hl7Version: '2.5',
            targetPath: 'MSH',
            condition: 'exists',
            action: 'error',
            actionDetail: 'MSH segment is required',
            severity: 'error',
            isActive: true
          },
          {
            name: 'Message Type Required',
            description: 'Message type (MSH.9) must be specified',
            ruleType: 'content',
            hl7Version: '2.5',
            targetPath: 'MSH.9',
            condition: 'exists',
            action: 'error',
            actionDetail: 'Message type is required',
            severity: 'error',
            isActive: true
          },
          {
            name: 'Sending Application Required',
            description: 'Sending application (MSH.3) should be specified',
            ruleType: 'content',
            hl7Version: '2.5',
            targetPath: 'MSH.3',
            condition: 'exists',
            action: 'warning',
            actionDetail: 'Sending application is recommended',
            severity: 'warning',
            isActive: true
          }
        ],
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      await ruleSetsCollection.insertOne(defaultRuleSet)
      
      // Create UK ITK rule set placeholder
      const itkRuleSet: RuleSet = {
        name: 'UK ITK for NHS',
        description: 'UK Interoperability Toolkit validation rules for NHS',
        isSystemDefined: true,
        rules: [
          {
            name: 'EVN Segment Mandatory',
            description: 'EVN segment recorded and event time made mandatory',
            ruleType: 'structure',
            hl7Version: '2.5',
            targetPath: 'EVN',
            condition: 'exists',
            action: 'error',
            actionDetail: 'EVN segment is mandatory in ITK messages',
            severity: 'error',
            isActive: true
          },
          {
            name: 'QAK Segment Cardinality',
            description: 'QAK segment cardinality changed to R [1..1]',
            ruleType: 'structure',
            hl7Version: '2.5',
            targetPath: 'QAK',
            condition: 'exists',
            action: 'error',
            actionDetail: 'QAK segment is required with cardinality [1..1]',
            severity: 'error',
            isActive: true
          }
        ],
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      await ruleSetsCollection.insertOne(itkRuleSet)
      console.log('Default rule sets created')
    }
    
    // Create default lookup tables
    const lookupTablesCollection = db.collection('lookupTables')
    const existingLookupTables = await lookupTablesCollection.countDocuments()
    
    if (existingLookupTables === 0) {
      const defaultLookupTables: LookupTable[] = [
        {
          name: 'ward_codes',
          description: 'Hospital ward codes mapping',
          data: [
            { key: 'CARD', value: 'Cardiology' },
            { key: 'EMER', value: 'Emergency' },
            { key: 'ICU', value: 'Intensive Care Unit' },
            { key: 'PEDS', value: 'Pediatrics' },
            { key: 'SURG', value: 'Surgery' },
            { key: 'ORTH', value: 'Orthopedics' }
          ],
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          name: 'message_types',
          description: 'Common HL7 message types',
          data: [
            { key: 'ADT^A01', value: 'Admit/Visit Notification' },
            { key: 'ADT^A02', value: 'Transfer a Patient' },
            { key: 'ADT^A03', value: 'Discharge/End Visit' },
            { key: 'ADT^A04', value: 'Register a Patient' },
            { key: 'ADT^A08', value: 'Update Patient Information' },
            { key: 'ORM^O01', value: 'Order Message' },
            { key: 'ORU^R01', value: 'Observation Result' }
          ],
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          name: 'administrative_sex',
          description: 'HL7 Administrative Sex codes (PID.8)',
          data: [
            { key: 'M', value: 'Male' },
            { key: 'F', value: 'Female' },
            { key: 'O', value: 'Other' },
            { key: 'U', value: 'Unknown' },
            { key: 'A', value: 'Ambiguous' },
            { key: 'N', value: 'Not applicable' }
          ],
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          name: 'processing_id',
          description: 'HL7 Processing ID codes (MSH.11)',
          data: [
            { key: 'P', value: 'Production' },
            { key: 'T', value: 'Training' },
            { key: 'D', value: 'Debugging' }
          ],
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          name: 'hl7_versions',
          description: 'HL7 Version ID codes (MSH.12)',
          data: [
            { key: '2.3', value: 'HL7 Version 2.3' },
            { key: '2.4', value: 'HL7 Version 2.4' },
            { key: '2.5', value: 'HL7 Version 2.5' },
            { key: '2.5.1', value: 'HL7 Version 2.5.1' },
            { key: '2.6', value: 'HL7 Version 2.6' },
            { key: '2.7', value: 'HL7 Version 2.7' },
            { key: '2.8', value: 'HL7 Version 2.8' }
          ],
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]
      
      await lookupTablesCollection.insertMany(defaultLookupTables)
      console.log('Default lookup tables created')
    }
    
    console.log('Default data seeding completed')
  } catch (error) {
    console.error('Failed to seed default data:', error)
    throw error
  }
}
