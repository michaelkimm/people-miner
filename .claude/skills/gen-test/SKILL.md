---
name: gen-test
description: Generate NestJS unit tests following project conventions
disable-model-invocation: true
arguments:
  - name: file
    description: Path to the service or controller file to test
    required: true
---

# Generate Unit Tests

Generate comprehensive unit tests for a NestJS service or controller following this project's conventions.

## Project Test Conventions

From CLAUDE.md:
- File naming: `*.spec.ts` (colocated with source file)
- Use `describe` blocks for logical grouping
- Mock with `jest.fn()` and `mockResolvedValueOnce()`
- New public methods must have tests

## Test Structure

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { YourService } from './your.service';
// Import dependencies to mock

describe('YourService', () => {
  let service: YourService;
  let mockDependency: jest.Mocked<DependencyType>;

  beforeEach(async () => {
    mockDependency = {
      method: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        YourService,
        { provide: DependencyToken, useValue: mockDependency },
      ],
    }).compile();

    service = module.get<YourService>(YourService);
  });

  describe('methodName', () => {
    it('should do expected behavior', async () => {
      // Arrange
      mockDependency.method.mockResolvedValueOnce(expectedData);

      // Act
      const result = await service.methodName(input);

      // Assert
      expect(result).toEqual(expectedOutput);
      expect(mockDependency.method).toHaveBeenCalledWith(expectedArgs);
    });

    it('should handle edge case', async () => {
      // Test error handling, null inputs, etc.
    });
  });
});
```

## Steps

1. Read the file at `{{file}}`
2. Identify all public methods
3. Create test file at same location with `.spec.ts` extension
4. For each public method:
   - Test happy path
   - Test edge cases (null, empty, invalid input)
   - Test error handling
5. Mock all injected dependencies
6. Run tests to verify: `cd backend && npm test -- --testPathPattern=<filename>`

## Mocking Patterns Used in This Project

### PrismaService
```typescript
const mockPrismaService = {
  candidate: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};
```

### Logger
```typescript
const mockLogger = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
};
```

### External APIs (GitHub, etc.)
```typescript
const mockGitHubService = {
  getUser: jest.fn(),
  getRepositories: jest.fn(),
};
```
