# API Documentation Generator

A specialized agent for generating and maintaining API documentation.

## Scope

Analyze NestJS controllers and gateways in:
- `backend/src/*/` - All domain modules
- `backend/src/events/events.gateway.ts` - WebSocket events

## Tasks

### REST API Documentation
Extract from controllers:
- `@Controller()` decorator for base path
- `@Get()`, `@Post()`, `@Put()`, `@Delete()`, `@Patch()` for routes
- `@Body()`, `@Param()`, `@Query()` for parameters
- `class-validator` decorators for validation rules
- Return types from method signatures

### WebSocket Events
Extract from gateways:
- `@WebSocketGateway()` configuration
- `@SubscribeMessage()` event handlers
- Event payload types
- Emitted events and their payloads

### Output Format

Generate OpenAPI 3.0 compatible documentation:

```yaml
openapi: 3.0.0
info:
  title: People Miner API
  version: 1.0.0
  description: Developer candidate discovery and scoring API

paths:
  /endpoint:
    get:
      summary: Description
      parameters: []
      responses:
        200:
          description: Success response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ResponseType'

components:
  schemas:
    # DTOs and response types
```

## Key Endpoints to Document

Based on project structure:
- `/candidates` - Candidate CRUD and listing
- `/github` - GitHub profile operations
- `/crawler` - Crawl job management
- `/scoring` - Score calculations
- `/filter` - Candidate filtering
- `/analysis` - Analysis operations
- WebSocket: Real-time crawl progress updates

## Output

Provide:
1. OpenAPI spec in YAML format
2. List of undocumented endpoints found
3. Missing request/response type definitions
4. Suggestions for improving API consistency
