# HL7 OpenSoup Web - Implementation Guide

A comprehensive web-based HL7 message processing and validation platform built with Next.js, TypeScript, and MongoDB.

## 🚀 Features Implemented

### Core HL7 Processing
- **Message Parsing & Validation**: Parse HL7 v2.x messages with comprehensive validation using @ehr/hl7-v2
- **Multi-format Support**: Import/export messages in HL7, JSON, XML, and CSV formats
- **Syntax Highlighting**: Advanced syntax highlighting with error detection and real-time validation
- **Real-time Validation**: Live validation with detailed error reporting and field-level highlighting

### Advanced Validation Engine
- **Custom Rule Sets**: Create and manage custom validation rules with flexible conditions
- **UK ITK Support**: Built-in support for UK Interoperability Toolkit standards and Z-segments
- **Lookup Tables**: Configurable lookup tables for code validation and data transformation
- **Workflow Engine**: Automated message processing workflows with step-by-step execution

### Modern User Interface
- **Responsive Design**: Clean, modern interface built with Radix UI and Tailwind CSS
- **Message Dashboard**: Comprehensive message management with search, filtering, and pagination
- **Admin Panel**: Full administrative interface for system configuration and management
- **Tabbed Views**: Multiple viewing modes including raw, structured, and syntax-highlighted views
- **Real-time Updates**: Live validation results and error highlighting

### Security & Compliance
- **HIPAA Compliance**: Built-in HIPAA compliance features with audit trails
- **Data Encryption**: AES-256 encryption for sensitive data at rest and in transit
- **Audit Logging**: Comprehensive audit trail for all operations with masked sensitive data
- **Access Controls**: Role-based access control system with session management
- **Input Sanitization**: Protection against injection attacks and malicious input

## 🛠 Technology Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS, Radix UI, React Syntax Highlighter
- **Backend**: Next.js API Routes, Node.js, MongoDB Driver
- **Database**: MongoDB 6+ with optimized indexing and collections
- **HL7 Processing**: @ehr/hl7-v2 library with custom validation engine
- **Security**: Crypto module, input sanitization, CSRF protection
- **Testing**: Jest, React Testing Library

## 📋 Prerequisites

- Node.js 18 or higher
- MongoDB 6 or higher
- npm, yarn, or pnpm package manager

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd hl7OpenSoupWeb
npm install
```

### 2. Environment Setup

Create `.env.local` file:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/hl7opensoup

# Security
NEXTAUTH_SECRET=your-nextauth-secret-key-here
ENCRYPTION_KEY=your-32-character-encryption-key

# Application
NODE_ENV=development
```

### 3. Database Initialization

```bash
# Start the development server
npm run dev

# Navigate to http://localhost:3000/admin
# Click "Initialize Database" to set up collections and indexes
# Optionally click "Seed Sample Data" for demo messages
```

### 4. Start Using

- **Main Dashboard**: `http://localhost:3000` - Message management and viewing
- **Admin Panel**: `http://localhost:3000/admin` - System administration

## 📖 Usage Guide

### Message Management

1. **Upload Messages**: 
   - Paste HL7 text directly or upload files
   - Supports multiple formats (HL7, JSON, XML, CSV)
   - Automatic parsing and validation

2. **View Messages**:
   - Structured view with segment breakdown
   - Syntax-highlighted raw view
   - Validation results with error highlighting

3. **Edit Messages**:
   - Real-time editing with syntax highlighting
   - Live validation feedback
   - Field-level error detection

### Rule Set Management

1. **Create Rule Sets**:
   - Navigate to Admin → Rule Sets
   - Define custom validation rules
   - Set conditions, actions, and severity levels

2. **Rule Types**:
   - **Structure**: Validate segment presence and cardinality
   - **Content**: Validate field values and formats
   - **Custom**: User-defined validation logic

### Lookup Table Management

1. **Create Tables**:
   - Admin → Lookup Tables
   - Define key-value mappings
   - Import/export table data

## 🔧 API Reference

### Messages API

```typescript
// List messages with pagination and filtering
GET /api/messages?page=1&limit=50&filter[sendingFacility]=HOSPITAL

// Create new message
POST /api/messages
{
  "name": "Patient Admission",
  "rawMessage": "MSH|^~\\&|...",
  "metadata": { "tags": ["admission"] }
}

// Validate message
POST /api/messages/validate
{
  "messageId": "message-id",
  "ruleSetId": "ruleset-id",
  "useUKITK": true
}

// Export message
GET /api/messages/{id}/export?format=xml&includeMetadata=true
```

### Rule Sets API

```typescript
// Create rule set
POST /api/rulesets
{
  "name": "Custom Validation",
  "description": "Custom rules for our facility",
  "rules": [
    {
      "name": "MSH.3 Required",
      "targetPath": "MSH.3",
      "condition": "exists",
      "severity": "error"
    }
  ]
}
```

## 🏗 Architecture

### Project Structure

```
hl7OpenSoupWeb/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes
│   │   ├── messages/             # Message management
│   │   ├── rulesets/             # Rule set management
│   │   ├── lookuptables/         # Lookup table management
│   │   ├── workflows/            # Workflow management
│   │   ├── init/                 # Database initialization
│   │   └── seed/                 # Sample data seeding
│   ├── admin/                    # Admin interface
│   └── page.tsx                  # Main dashboard
├── components/                   # React Components
│   ├── message-dashboard.tsx     # Main dashboard
│   ├── message-viewer.tsx        # Message viewing
│   ├── message-editor.tsx        # Message editing
│   ├── rule-set-manager.tsx      # Rule management
│   └── lookup-table-manager.tsx  # Lookup table management
├── lib/                          # Core Libraries
│   ├── hl7Service.ts             # HL7 processing service
│   ├── validation-engine.ts      # Validation engine
│   ├── rules-engine.ts           # Custom rules engine
│   ├── transformation-services.ts # Format conversion
│   ├── hl7-syntax-highlighter.ts # Syntax highlighting
│   ├── security.ts               # Security utilities
│   ├── mongodb.ts                # Database connection
│   └── database-init.ts          # Database setup
├── types/                        # TypeScript definitions
│   ├── hl7.ts                    # HL7 types
│   └── hl7-v2.d.ts               # Library type definitions
└── __tests__/                    # Test files
    └── hl7-service.test.ts        # Service tests
```

## 🧪 Testing

### Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## 🔒 Security Features

### Data Protection
- **Encryption**: AES-256-GCM encryption for sensitive data
- **Hashing**: PBKDF2 with salt for password storage
- **Sanitization**: Input sanitization to prevent injection attacks
- **Validation**: Comprehensive input validation and type checking

### HIPAA Compliance
- **Audit Trails**: Complete audit logging with masked sensitive data
- **Access Controls**: Role-based permissions and session management
- **Data Minimization**: Only collect and store necessary data
- **Secure Transmission**: HTTPS enforcement and secure headers

## 🚀 Deployment

### Production Build

```bash
# Build the application
npm run build

# Start production server
npm start
```

### Environment Variables (Production)

```env
# Database
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/hl7opensoup

# Security (Generate secure keys)
NEXTAUTH_SECRET=your-production-secret-key
ENCRYPTION_KEY=your-production-encryption-key

# Application
NODE_ENV=production
```

## 🤝 Contributing

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

- **Issues**: Create GitHub Issues for bugs and feature requests
- **Documentation**: Available in the admin panel
- **API Reference**: Interactive documentation in the interface

---

**Built with ❤️ for the healthcare community**
