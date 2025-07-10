import '@testing-library/jest-dom'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return '/'
  },
}))

// Mock MongoDB
jest.mock('./lib/mongodb', () => ({
  getCollection: jest.fn(),
  connectToDatabase: jest.fn(),
}))

// Mock environment variables
process.env.MONGODB_URI = 'mongodb://localhost:27017/test'
process.env.NEXTAUTH_SECRET = 'test-secret'

// Mock Next.js server environment
global.Request = class Request {
  constructor(url, options = {}) {
    this.url = url
    this.method = options.method || 'GET'
    this.headers = new Map(Object.entries(options.headers || {}))
    this.body = options.body
  }
}

global.Response = class Response {
  constructor(body, options = {}) {
    this.body = body
    this.status = options.status || 200
    this.headers = new Map(Object.entries(options.headers || {}))
  }

  static json(data, options = {}) {
    return new Response(JSON.stringify(data), {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers }
    })
  }
}

global.Headers = class Headers extends Map {
  constructor(init) {
    super()
    if (init) {
      if (Array.isArray(init)) {
        init.forEach(([key, value]) => this.set(key, value))
      } else if (typeof init === 'object') {
        Object.entries(init).forEach(([key, value]) => this.set(key, value))
      }
    }
  }
}

// Global test utilities
global.fetch = jest.fn()

// Cleanup after each test
afterEach(() => {
  jest.clearAllMocks()
})
