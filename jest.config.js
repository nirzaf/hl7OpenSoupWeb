const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/', '<rootDir>/e2e/'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    // Handle CSS imports
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    // Handle image imports
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': '<rootDir>/__mocks__/fileMock.js',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-syntax-highlighter|@radix-ui|mongodb|bson)/)',
  ],
  moduleNameMapper: {
    '^react-syntax-highlighter$': '<rootDir>/__mocks__/react-syntax-highlighter.js',
    '^react-syntax-highlighter/(.*)$': '<rootDir>/__mocks__/react-syntax-highlighter.js',
  },
  collectCoverageFrom: [
    'lib/**/*.{js,ts}',
    'components/**/*.{js,ts,tsx}',
    'app/**/*.{js,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
  ],
  coverageThreshold: {
    global: {
      branches: 50, // Reduced for initial setup
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
  testTimeout: 10000,
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)
