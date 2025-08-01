# CodeRabbit Server

A powerful TypeScript backend server that provides AI-powered code review services for VSCode extensions. CodeRabbit analyzes code changes, generates intelligent comments, and provides comprehensive review summaries using advanced AI models.

## 🚀 Features

- **AI-Powered Code Reviews**: Intelligent analysis using Google Gemini, OpenAI GPT, or OpenRouter models
- **Real-time Communication**: WebSocket-based real-time updates via tRPC
- **Multi-Provider AI Support**: Flexible AI provider configuration (Google, OpenAI, OpenRouter)
- **Comprehensive Analysis**: 
  - Code review comments with categorization (issues, suggestions, nitpicks)
  - PR title generation
  - Review summaries and objectives
  - Code walkthrough generation
- **Robust Infrastructure**:
  - Rate limiting and request validation
  - File size and count limits
  - Comprehensive logging and monitoring
  - Retry mechanisms with exponential backoff
  - SSL support for secure connections
- **Production Ready**: Docker support, health checks, and metrics endpoints

## 📋 Prerequisites

- **Node.js** 20+ 
- **npm** or **yarn**
- **AI Provider API Key** (Google Generative AI, OpenAI, or OpenRouter)

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd coderabbit/server
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   # Server Configuration
   PORT=5353
   HOST=localhost
   SSL=false
   
   # AI Provider Configuration
   AI_PROVIDER=google  # google, openai, or openrouter
   GOOGLE_GENERATIVE_AI_API_KEY=your_google_api_key
   OPENAI_API_KEY=your_openai_api_key
   OPENROUTER_API_KEY=your_openrouter_api_key
   
   # AI Models
   GOOGLE_AI_MODEL=models/gemini-1.5-flash
   OPENAI_AI_MODEL=gpt-4o-2024-08-06
   
   # File Validation
   MAX_FILE_SIZE=10485760          # 10MB per file
   MAX_FILES_PER_REVIEW=50         # Max files per review
   MAX_TOTAL_SIZE=52428800         # 50MB total
   
   # Rate Limiting
   RATE_LIMIT_REQUESTS=10          # Requests per window
   RATE_LIMIT_WINDOW_MS=60000      # 1 minute window
   
   # Performance
   REVIEW_TIMEOUT_MS=300000        # 5 minute timeout
   
   # Logging
   LOG_LEVEL=info                  # error, warn, info, debug
   LOG_TO_FILE=false
   ```

## 🚀 Usage

### Development Mode
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm start
```

### Using Docker
```bash
# Build the image
docker build -t coderabbit-server .

# Run the container
docker run -p 5353:5353 --env-file .env coderabbit-server
```

### Using Docker Compose
```bash
docker-compose up
```

## 📡 API Endpoints

### Health Check
```
GET /health
```
Returns server health status and configuration.

### Metrics
```
GET /metrics
```
Returns performance metrics and monitoring data.

### tRPC WebSocket
```
WS /trpc
```
Real-time communication for code review requests and updates.

## 🏗️ Architecture

### Core Components

- **`server.ts`** - Main HTTP/WebSocket server with SSL support
- **`router.ts`** - tRPC router handling review requests and subscriptions
- **`constants.ts`** - Environment configuration and validation

### Services

- **`services/reviewService.ts`** - Core review orchestration logic
- **`services/ai/`** - AI integration layer
  - `index.ts` - Unified AI provider interface
  - `prompts.ts` - AI prompt templates
  - `schemas.ts` - Zod validation schemas
  - `types.ts` - TypeScript type definitions

### Utilities

- **`utils/cache.ts`** - LRU caching with TTL support
- **`utils/config.ts`** - Configuration management
- **`utils/fileValidator.ts`** - File validation and limits
- **`utils/logger.ts`** - Structured logging
- **`utils/monitor.ts`** - Performance monitoring and metrics
- **`utils/rateLimiter.ts`** - Request rate limiting
- **`utils/retry.ts`** - Retry logic with exponential backoff

### Types

- **`types.ts`** - Shared TypeScript definitions and Zod schemas

## 🧪 Testing

The project includes comprehensive test coverage with Vitest:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Test Structure
- **`tests/services/`** - Service layer tests
- **`tests/utils/`** - Utility function tests
- **`tests/fixtures/`** - Shared test data
- **`tests/helpers/`** - Test utilities and helpers

## 🔧 Development

### Code Quality
```bash
# Lint code
npm run lint

# Format code
npm run format

# Type checking
npx tsc --noEmit
```

### Project Structure
```
src/
├── constants.ts          # Environment configuration
├── router.ts            # tRPC routes
├── server.ts            # Main server
├── types.ts             # Shared types
├── services/
│   ├── ai/              # AI provider integration
│   └── reviewService.ts # Core review logic
└── utils/               # Utility functions

tests/
├── fixtures/            # Test data
├── helpers/             # Test utilities
├── services/            # Service tests
└── utils/               # Utility tests
```

## 🚀 Deployment

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `5353` |
| `HOST` | Server host | `localhost` |
| `SSL` | Enable SSL | `false` |
| `AI_PROVIDER` | AI provider (google/openai/openrouter) | `google` |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Google AI API key | Required |
| `OPENAI_API_KEY` | OpenAI API key | Optional |
| `OPENROUTER_API_KEY` | OpenRouter API key | Optional |
| `MAX_FILE_SIZE` | Max file size in bytes | `10485760` (10MB) |
| `MAX_FILES_PER_REVIEW` | Max files per review | `50` |
| `RATE_LIMIT_REQUESTS` | Rate limit requests | `10` |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | `60000` (1 min) |
| `REVIEW_TIMEOUT_MS` | Review timeout | `300000` (5 min) |
| `LOG_LEVEL` | Logging level | `info` |

### Docker Deployment

The included `Dockerfile` uses multi-stage builds for optimized production images:

1. **Builder stage**: Installs dependencies and builds TypeScript
2. **Production stage**: Creates minimal runtime image

### Health Monitoring

The server provides built-in health checks and metrics:
- Health endpoint returns server status and configuration
- Metrics endpoint provides performance data
- Structured logging with configurable levels
- Request monitoring and error tracking

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📝 License

ISC License

## 🔗 Related Projects

This server is designed to work with the CodeRabbit VSCode extension for seamless code review integration.

---

**🚀 Ready to revolutionize your code reviews with AI!**
