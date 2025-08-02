# Open CodeRabbit Server

A powerful TypeScript backend server that provides AI-powered code review services for VSCode extensions. CodeRabbit analyzes code changes, generates intelligent comments, and provides comprehensive review summaries using advanced AI models.

## 🚀 Features

- **AI-Powered Code Reviews**: Intelligent analysis using Google Gemini, OpenAI GPT models
- **Real-time Communication**: WebSocket-based real-time updates via tRPC
- **Multi-Provider AI Support**: Flexible AI provider configuration (Google, OpenAI )
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
- **AI Provider API Key** (Google Generative AI, OpenAI)

## 🛠️ Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd open-coderabbit-server
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
   AI_PROVIDER=google  # google, openai
   GOOGLE_GENERATIVE_AI_API_KEY=your_google_api_key
   OPENAI_API_KEY=your_openai_api_key

   # AI Models
   GOOGLE_AI_MODEL=models/gemini-2.5-flash
   OPENAI_AI_MODEL=gpt-4o-mini

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

## 🔌 Connecting VSCode Extension

To use your self-hosted Open CodeRabbit server with the CodeRabbit VSCode extension, follow these steps:

### Prerequisites

1. **CodeRabbit VSCode Extension**: Install the [CodeRabbit extension](https://marketplace.visualstudio.com/items?itemName=coderabbitai.coderabbit) (version 0.12.1 or higher)
2. **Running Server**: Ensure your Open CodeRabbit server is running and accessible
3. **Network Access**: Make sure the server URL is reachable and WebSocket connections are allowed

### Connection Steps

1. **Open VSCode** and navigate to the CodeRabbit extension

2. **Logout** if previously logged in to CodeRabbit cloud service

3. **Click "Self hosting CodeRabbit?"** button (located below the "Use CodeRabbit for free" button)

4. **Enter your server URL** when prompted:

   ```
   http://localhost:5353
   ```

   Or if running on a different host:

   ```
   http://your-server-ip:5353
   ```

5. **Select your Git provider**:
   - GitHub
   - GitHub Enterprise
   - GitLab
   - Self-Hosted GitLab

6. **Provide authentication** (if using GitHub/GitHub Enterprise):
   - Enter your [GitHub Personal Access Token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens)
   - Required permissions: `repo`, `read:user`

### Verification

Once connected, you should see:

- ✅ Connection status indicator in the extension
- Access to code review features in VSCode
- Real-time AI-powered code analysis

### Troubleshooting Connection Issues

**Extension can't connect to server:**

```bash
# Check if server is running
docker ps
# or
curl http://localhost:5353/health
```

**WebSocket connection failed:**

- Ensure firewall allows connections on port 5353
- Check that server is binding to `0.0.0.0` (not just `localhost`)
- Verify no proxy is blocking WebSocket connections

**Server URL not reachable:**

- Test server accessibility: `curl http://your-server:5353/health`
- Check network connectivity between VSCode and server
- Ensure Docker port mapping is correct: `0.0.0.0:5353->5353/tcp`

### Using Docker

The Open CodeRabbit server is fully containerized and production-ready with Docker support.

### Quick Start

#### Using the Docker Management Script (Recommended)

```bash
# Start development environment with hot reload
./scripts/docker.sh dev

# Start production environment
./scripts/docker.sh start

# Stop all containers
./scripts/docker.sh stop

# View logs
./scripts/docker.sh logs

# Check health
./scripts/docker.sh health
```

#### Manual Docker Commands

**Build the image:**

```bash
docker build -t open-coderabbit-server .
```

**Run production container:**

```bash
docker run -d --name open-coderabbit -p 5353:5353 --env-file .env open-coderabbit-server
```

**Using Docker Compose:**

```bash
# Production
docker-compose up -d

# Development with hot reload
docker-compose -f docker-compose.dev.yml up -d
```

### Docker Configuration

#### Multi-Stage Dockerfile

- **Builder stage**: Compiles TypeScript and installs all dependencies
- **Production stage**: Minimal runtime image with only production dependencies
- **Base image**: `node:20-alpine` for security and size optimization

#### Environment Variables

The container uses the same environment variables as the local setup. Ensure your `.env` file is properly configured:

```bash
# Copy example environment file
cp .env.example .env
# Edit with your API keys and configuration
```

#### Health Checks

Both Docker Compose configurations include health checks:

- **Endpoint**: `GET /health`
- **Interval**: 30 seconds
- **Timeout**: 10 seconds
- **Retries**: 3
- **Start period**: 40 seconds

#### Logging

Production containers are configured with log rotation:

- **Max file size**: 10MB
- **Max files**: 3
- **Format**: JSON

### Development vs Production

| Feature            | Development              | Production           |
| ------------------ | ------------------------ | -------------------- |
| **File**           | `docker-compose.dev.yml` | `docker-compose.yml` |
| **Hot Reload**     | ✅ Volume mounted        | ❌ Built-in          |
| **Build Target**   | `builder` stage          | Final stage          |
| **Dependencies**   | All (dev + prod)         | Production only      |
| **Restart Policy** | `unless-stopped`         | `unless-stopped`     |
| **Health Checks**  | ✅ Enabled               | ✅ Enabled           |

### Docker Management Script

The `scripts/docker.sh` script provides convenient commands:

```bash
./scripts/docker.sh [COMMAND]

Commands:
  build       Build the Docker image
  dev         Start development environment with hot reload
  start       Start production container
  stop        Stop running containers
  restart     Restart containers
  logs        Show container logs
  shell       Open shell in running container
  clean       Remove containers and images
  health      Check container health
  help        Show this help message
```

### Troubleshooting

**Container won't start:**

```bash
# Check logs
./scripts/docker.sh logs

# Or manually
docker-compose logs -f
```

**Health check failing:**

```bash
# Test health endpoint
curl http://localhost:5353/health

# Check container status
docker ps
```

**Port already in use:**

```bash
# Find process using port 5353
lsof -i :5353

# Or change port in docker-compose.yml
ports:
  - "5354:5353"  # Use different external port
```

## 📡 API Endpoints

### Health Check

```
GET /health
```

Returns server health status:

- **Healthy status**: Returns plain text `"OK"` with HTTP 200 (VSCode extension compatible)
- **Degraded/Unhealthy status**: Returns detailed JSON with metrics and diagnostics

**Example responses:**

```bash
# Healthy server
curl http://localhost:5353/health
# Response: "OK" (Content-Type: text/plain)
```

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

| Variable                       | Description                 | Default           |
| ------------------------------ | --------------------------- | ----------------- |
| `PORT`                         | Server port                 | `5353`            |
| `HOST`                         | Server host                 | `localhost`       |
| `SSL`                          | Enable SSL                  | `false`           |
| `AI_PROVIDER`                  | AI provider (google/openai) | `google`          |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Google AI API key           | Required          |
| `OPENAI_API_KEY`               | OpenAI API key              | Optional          |
| `MAX_FILE_SIZE`                | Max file size in bytes      | `10485760` (10MB) |
| `MAX_FILES_PER_REVIEW`         | Max files per review        | `50`              |
| `RATE_LIMIT_REQUESTS`          | Rate limit requests         | `10`              |
| `RATE_LIMIT_WINDOW_MS`         | Rate limit window           | `60000` (1 min)   |
| `REVIEW_TIMEOUT_MS`            | Review timeout              | `300000` (5 min)  |
| `LOG_LEVEL`                    | Logging level               | `info`            |

### Docker Deployment

The included `Dockerfile` uses multi-stage builds for optimized production images:

1. **Builder stage**: Installs dependencies and builds TypeScript
2. **Production stage**: Creates minimal runtime image

### Health Monitoring

The server provides built-in health checks and metrics:

- **Health endpoint** (`/health`): Returns plain text "OK" for healthy status, detailed JSON for issues
- **Metrics endpoint** (`/metrics`): Provides comprehensive performance and system data
- **Structured logging** with configurable levels (error, warn, info, debug)
- **Request monitoring** and error tracking with retry mechanisms

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
