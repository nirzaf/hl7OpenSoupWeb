#!/usr/bin/env node

/**
 * Comprehensive Test Runner for HL7 OpenSoup Web
 * 
 * This script provides a unified interface for running all types of tests
 * with proper setup, teardown, and reporting.
 */

const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
}

// Test configuration
const testConfig = {
  unit: {
    command: 'npm',
    args: ['test', '--', '--coverage'],
    description: 'Unit and Integration Tests'
  },
  e2e: {
    command: 'npx',
    args: ['playwright', 'test'],
    description: 'End-to-End Tests'
  },
  lint: {
    command: 'npm',
    args: ['run', 'lint'],
    description: 'Code Linting'
  }
}

// Utility functions
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function logHeader(message) {
  log('\n' + '='.repeat(60), 'cyan')
  log(`  ${message}`, 'bright')
  log('='.repeat(60), 'cyan')
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green')
}

function logError(message) {
  log(`❌ ${message}`, 'red')
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow')
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue')
}

// Check if required dependencies are installed
function checkDependencies() {
  logHeader('Checking Dependencies')
  
  const requiredPackages = [
    'jest',
    '@playwright/test',
    '@testing-library/react',
    '@testing-library/jest-dom'
  ]
  
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))
  const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies }
  
  let missingPackages = []
  
  requiredPackages.forEach(pkg => {
    if (!allDeps[pkg]) {
      missingPackages.push(pkg)
    } else {
      logSuccess(`${pkg} is installed`)
    }
  })
  
  if (missingPackages.length > 0) {
    logError('Missing required packages:')
    missingPackages.forEach(pkg => log(`  - ${pkg}`, 'red'))
    log('\nPlease run: npm install', 'yellow')
    process.exit(1)
  }
  
  logSuccess('All dependencies are installed')
}

// Setup test environment
function setupTestEnvironment() {
  logHeader('Setting Up Test Environment')
  
  // Check for .env.test file
  if (!fs.existsSync('.env.test')) {
    logWarning('.env.test file not found, creating default...')
    const defaultEnv = `
# Test Environment Configuration
MONGODB_URI=mongodb://localhost:27017/hl7opensoup_test
NEXTAUTH_SECRET=test-secret-key
NODE_ENV=test
`.trim()
    
    fs.writeFileSync('.env.test', defaultEnv)
    logSuccess('Created .env.test file')
  }
  
  // Ensure test directories exist
  const testDirs = ['__tests__', 'e2e', 'coverage']
  testDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
      logSuccess(`Created ${dir} directory`)
    }
  })
  
  logSuccess('Test environment setup complete')
}

// Run a specific test suite
function runTestSuite(suiteName) {
  return new Promise((resolve, reject) => {
    const config = testConfig[suiteName]
    if (!config) {
      reject(new Error(`Unknown test suite: ${suiteName}`))
      return
    }
    
    logHeader(`Running ${config.description}`)
    
    const process = spawn(config.command, config.args, {
      stdio: 'inherit',
      shell: true
    })
    
    process.on('close', (code) => {
      if (code === 0) {
        logSuccess(`${config.description} completed successfully`)
        resolve()
      } else {
        logError(`${config.description} failed with exit code ${code}`)
        reject(new Error(`Test suite failed: ${suiteName}`))
      }
    })
    
    process.on('error', (error) => {
      logError(`Failed to start ${config.description}: ${error.message}`)
      reject(error)
    })
  })
}

// Generate test report
function generateTestReport() {
  logHeader('Generating Test Report')
  
  const reportData = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    testSuites: []
  }
  
  // Check for Jest coverage report
  const coveragePath = path.join('coverage', 'coverage-summary.json')
  if (fs.existsSync(coveragePath)) {
    const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'))
    reportData.coverage = coverage.total
    logSuccess('Jest coverage report found')
  }
  
  // Check for Playwright report
  const playwrightReportPath = path.join('playwright-report', 'index.html')
  if (fs.existsSync(playwrightReportPath)) {
    reportData.playwrightReport = playwrightReportPath
    logSuccess('Playwright report found')
  }
  
  // Save report
  const reportPath = path.join('coverage', 'test-report.json')
  fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2))
  logSuccess(`Test report saved to ${reportPath}`)
  
  // Display summary
  if (reportData.coverage) {
    log('\nCoverage Summary:', 'bright')
    log(`  Lines: ${reportData.coverage.lines.pct}%`, 'cyan')
    log(`  Functions: ${reportData.coverage.functions.pct}%`, 'cyan')
    log(`  Branches: ${reportData.coverage.branches.pct}%`, 'cyan')
    log(`  Statements: ${reportData.coverage.statements.pct}%`, 'cyan')
  }
}

// Main execution function
async function main() {
  const args = process.argv.slice(2)
  const command = args[0] || 'all'
  
  try {
    // Always check dependencies and setup environment
    checkDependencies()
    setupTestEnvironment()
    
    switch (command) {
      case 'unit':
        await runTestSuite('unit')
        break
        
      case 'e2e':
        await runTestSuite('e2e')
        break
        
      case 'lint':
        await runTestSuite('lint')
        break
        
      case 'all':
        logHeader('Running All Test Suites')
        await runTestSuite('lint')
        await runTestSuite('unit')
        await runTestSuite('e2e')
        break
        
      case 'quick':
        logHeader('Running Quick Test Suite (Unit Tests Only)')
        await runTestSuite('unit')
        break
        
      case 'ci':
        logHeader('Running CI Test Suite')
        process.env.CI = 'true'
        await runTestSuite('lint')
        await runTestSuite('unit')
        await runTestSuite('e2e')
        break
        
      case 'help':
        displayHelp()
        return
        
      default:
        logError(`Unknown command: ${command}`)
        displayHelp()
        process.exit(1)
    }
    
    generateTestReport()
    logSuccess('\n🎉 All tests completed successfully!')
    
  } catch (error) {
    logError(`\n💥 Test execution failed: ${error.message}`)
    process.exit(1)
  }
}

function displayHelp() {
  log('\nHL7 OpenSoup Web Test Runner', 'bright')
  log('\nUsage: node scripts/test-runner.js [command]', 'cyan')
  log('\nCommands:', 'bright')
  log('  unit     Run unit and integration tests only', 'cyan')
  log('  e2e      Run end-to-end tests only', 'cyan')
  log('  lint     Run code linting only', 'cyan')
  log('  all      Run all test suites (default)', 'cyan')
  log('  quick    Run quick test suite (unit tests only)', 'cyan')
  log('  ci       Run CI test suite with strict settings', 'cyan')
  log('  help     Display this help message', 'cyan')
  log('\nExamples:', 'bright')
  log('  node scripts/test-runner.js unit', 'yellow')
  log('  node scripts/test-runner.js e2e', 'yellow')
  log('  node scripts/test-runner.js all', 'yellow')
  log('\nEnvironment Variables:', 'bright')
  log('  CI=true              Enable CI mode', 'cyan')
  log('  NODE_ENV=test        Set test environment', 'cyan')
  log('  MONGODB_URI=...      Override test database URI', 'cyan')
}

// Handle process signals
process.on('SIGINT', () => {
  log('\n\nTest execution interrupted by user', 'yellow')
  process.exit(130)
})

process.on('SIGTERM', () => {
  log('\n\nTest execution terminated', 'yellow')
  process.exit(143)
})

// Run the main function
if (require.main === module) {
  main()
}

module.exports = {
  runTestSuite,
  checkDependencies,
  setupTestEnvironment,
  generateTestReport
}
