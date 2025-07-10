# HL7 OpenSoup Web - Comprehensive Testing Guide

This document provides a complete overview of the testing strategy and implementation for the HL7 OpenSoup Web application.

## 🧪 Testing Strategy Overview

Our testing approach follows a multi-layered strategy to ensure comprehensive coverage:

1. **Unit Tests** - Test individual functions and components in isolation
2. **Integration Tests** - Test API endpoints and component interactions
3. **End-to-End Tests** - Test complete user workflows
4. **Performance Tests** - Ensure the application meets performance requirements

## 📁 Test Structure

```
__tests__/
├── api/                          # API integration tests
│   ├── messages.test.ts          # Messages API endpoints
│   ├── rulesets.test.ts          # Rule sets API endpoints
│   └── transform.test.ts         # Transformation API endpoints
├── components/                   # React component tests
│   ├── message-viewer.test.tsx   # MessageViewer component
│   ├── message-editor.test.tsx   # MessageEditor component
│   └── message-dashboard.test.tsx # MessageDashboard component
├── hl7-service.test.ts          # HL7Service unit tests
├── validation-engine.test.ts     # ValidationEngine unit tests
├── transformation-services.test.ts # TransformationServices unit tests
├── rules-engine.test.ts         # RulesEngine unit tests
└── security.test.ts             # Security utilities tests

e2e/
├── message-management.spec.ts    # E2E message management workflows
├── validation-workflows.spec.ts  # E2E validation workflows
├── data-transformation.spec.ts   # E2E data transformation workflows
└── admin-workflows.spec.ts       # E2E admin panel workflows
```

## 🚀 Getting Started

### Prerequisites

```bash
# Install dependencies
npm install

# Install Playwright browsers
npm run playwright:install
```

### Running Tests

```bash
# Run all unit and integration tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui

# Run E2E tests in headed mode (visible browser)
npm run test:e2e:headed

# Run all tests (unit + E2E)
npm run test:all
```

## 🔧 Test Configuration

### Jest Configuration (`jest.config.js`)

- **Environment**: jsdom for React component testing
- **Setup**: Automatic mocking of Next.js router and MongoDB
- **Coverage**: 70% threshold for branches, functions, lines, and statements
- **Timeout**: 10 seconds for async operations

### Playwright Configuration (`playwright.config.ts`)

- **Browsers**: Chrome, Firefox, Safari, Mobile Chrome, Mobile Safari
- **Base URL**: http://localhost:3000
- **Retries**: 2 retries on CI, 0 locally
- **Screenshots**: On failure only
- **Video**: Retained on failure

## 📊 Test Coverage Areas

### 1. Core HL7 Processing

#### HL7Service (`__tests__/hl7-service.test.ts`)
- ✅ Message parsing with valid/invalid content
- ✅ Message generation from JSON objects
- ✅ Field editing and validation
- ✅ Metadata extraction
- ✅ DateTime parsing
- ✅ Error handling for malformed messages

#### ValidationEngine (`__tests__/validation-engine.test.ts`)
- ✅ Basic HL7 structural validation
- ✅ Custom rule set validation
- ✅ UK ITK schema validation
- ✅ Rule condition evaluation (exists, equals, regex, length)
- ✅ Error categorization by severity
- ✅ Performance with large rule sets

#### TransformationServices (`__tests__/transformation-services.test.ts`)
- ✅ JSON/XML/CSV export functionality
- ✅ Data import from multiple formats
- ✅ Format conversion accuracy
- ✅ Error handling for invalid data
- ✅ Large file processing

### 2. Security & Data Protection

#### Security Utilities (`__tests__/security.test.ts`)
- ✅ Data encryption/decryption
- ✅ Password hashing and verification
- ✅ Input sanitization (XSS, SQL injection)
- ✅ API key generation and validation
- ✅ Unicode and special character handling

### 3. API Endpoints

#### Messages API (`__tests__/api/messages.test.ts`)
- ✅ CRUD operations for messages
- ✅ Message validation endpoint
- ✅ Search and filtering functionality
- ✅ Pagination handling
- ✅ Error responses and edge cases

#### Rule Sets API (`__tests__/api/rulesets.test.ts`)
- ✅ Rule set management (CRUD)
- ✅ Rule validation and structure checking
- ✅ Active/inactive rule set filtering
- ✅ Duplicate name prevention
- ✅ Complex rule condition validation

### 4. React Components

#### MessageViewer (`__tests__/components/message-viewer.test.tsx`)
- ✅ Message display and metadata rendering
- ✅ Tab navigation (Structured, Raw, Syntax Highlighted)
- ✅ Validation trigger and results display
- ✅ Export functionality
- ✅ Accessibility features
- ✅ Error handling and edge cases

#### MessageEditor (`__tests__/components/message-editor.test.tsx`)
- ✅ Content editing and change detection
- ✅ Save/cancel functionality with confirmation
- ✅ Real-time validation feedback
- ✅ Keyboard shortcuts (Ctrl+S)
- ✅ Large content handling
- ✅ Network error handling

### 5. End-to-End Workflows

#### Message Management (`e2e/message-management.spec.ts`)
- ✅ Complete message lifecycle (create, view, edit, delete)
- ✅ Search and filtering workflows
- ✅ View mode switching
- ✅ Export functionality
- ✅ Pagination handling
- ✅ Error scenarios

#### Validation Workflows (`e2e/validation-workflows.spec.ts`)
- ✅ Standard HL7 validation
- ✅ Custom rule set creation and usage
- ✅ UK ITK validation
- ✅ Batch validation
- ✅ Validation report export
- ✅ Real-time validation during editing

## 🎯 Test Scenarios Covered

### Message Processing Scenarios
1. **Valid HL7 Messages**: ADT^A01, ORU^R01, ORM^O01
2. **Invalid Messages**: Malformed syntax, missing segments
3. **Large Messages**: 50+ segments, complex nested structures
4. **Special Characters**: Unicode, emojis, medical symbols
5. **Edge Cases**: Empty messages, null values, circular references

### Validation Scenarios
1. **Standard Rules**: Required segments, field formats
2. **Custom Rules**: Facility-specific validations
3. **UK ITK Rules**: NHS-specific requirements
4. **Cross-field Validation**: Consistency checks
5. **Conditional Rules**: Context-dependent validation

### Data Transformation Scenarios
1. **Format Conversion**: HL7 ↔ JSON ↔ XML ↔ CSV
2. **Metadata Inclusion**: With/without metadata export
3. **Large File Handling**: Performance with big datasets
4. **Error Recovery**: Graceful handling of conversion failures

### Security Scenarios
1. **Input Sanitization**: XSS, SQL injection prevention
2. **Data Encryption**: Sensitive patient data protection
3. **Authentication**: API key validation
4. **Authorization**: Role-based access control

## 📈 Performance Benchmarks

### Response Time Targets
- **Message Parsing**: < 2 seconds for messages up to 10KB
- **Validation**: < 3 seconds for standard rule sets
- **Search**: < 3 seconds for database queries
- **Export**: < 5 seconds for standard formats

### Scalability Targets
- **Concurrent Users**: 100+ simultaneous users
- **Database Size**: 1M+ messages without degradation
- **Rule Set Size**: 100+ rules per set
- **Message Size**: Up to 1MB per message

## 🐛 Error Handling Coverage

### API Error Scenarios
- Database connection failures
- Invalid request payloads
- Authentication/authorization failures
- Rate limiting and timeouts
- Malformed HL7 content

### UI Error Scenarios
- Network connectivity issues
- Invalid user input
- Browser compatibility issues
- Large file upload failures
- Validation timeout scenarios

## 🔄 Continuous Integration

### GitHub Actions Workflow
```yaml
name: Test Suite
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:coverage
      - run: npm run test:e2e
```

### Coverage Requirements
- **Minimum Coverage**: 70% for all metrics
- **Critical Paths**: 90% coverage for core HL7 processing
- **API Endpoints**: 85% coverage for all routes
- **Components**: 80% coverage for UI components

## 📝 Test Data Management

### Sample HL7 Messages
- **ADT Messages**: Patient admission, discharge, transfer
- **ORU Messages**: Lab results, diagnostic reports
- **ORM Messages**: Order management
- **Custom Messages**: Facility-specific formats

### Test Database
- **Isolation**: Each test uses isolated data
- **Cleanup**: Automatic cleanup after test completion
- **Seeding**: Consistent test data setup
- **Mocking**: External dependencies mocked

## 🚨 Known Limitations

1. **Browser Support**: E2E tests limited to modern browsers
2. **Database**: MongoDB required for integration tests
3. **Performance**: Large message tests may be slow on CI
4. **Network**: E2E tests require stable internet connection

## 📚 Best Practices

### Writing Tests
1. **Descriptive Names**: Clear test descriptions
2. **Arrange-Act-Assert**: Consistent test structure
3. **Isolation**: Tests should not depend on each other
4. **Mocking**: Mock external dependencies
5. **Edge Cases**: Test boundary conditions

### Maintaining Tests
1. **Regular Updates**: Keep tests current with code changes
2. **Flaky Tests**: Fix or remove unreliable tests
3. **Performance**: Monitor test execution time
4. **Documentation**: Update test documentation

## 🔗 Related Documentation

- [Technical Blueprint](./technical_blue_print.md)
- [Implementation Guide](./IMPLEMENTATION_README.md)
- [API Documentation](./readme.md)
- [Deployment Guide](./DEPLOYMENT.md)

---

For questions or issues with testing, please refer to the project documentation or create an issue in the repository.
