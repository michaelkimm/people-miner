---
name: create-migration
description: Create a Prisma migration with validation
disable-model-invocation: true
arguments:
  - name: name
    description: Migration name (e.g., add-user-role, update-candidate-fields)
    required: true
---

# Create Prisma Migration

Guide for creating a safe Prisma migration in this project.

## Steps

1. **Modify Schema**: Edit `backend/prisma/schema.prisma` with the required changes
   - Follow existing naming conventions (camelCase for fields, PascalCase for models)
   - Add appropriate `@default()` values for new required fields
   - Consider adding `?` for optional fields to avoid breaking existing data

2. **Validate Schema**: Run prisma format to check syntax
   ```bash
   cd backend && npx prisma format
   ```

3. **Create Migration**: Generate the migration
   ```bash
   cd backend && npm run prisma:migrate -- --name {{name}}
   ```

4. **Update Prisma Client**: Regenerate the client
   ```bash
   cd backend && npm run prisma:generate
   ```

5. **Verify**: Check the generated migration in `backend/prisma/migrations/`

## Common Patterns in This Project

- `String @id @default(cuid())` for IDs
- `Int @default(0)` for counters
- `Float?` for optional scores
- `Boolean @default(false)` for flags
- `DateTime @default(now())` for timestamps
- Use `@relation` with explicit foreign keys

## Rollback

If migration fails:
```bash
cd backend && npx prisma migrate reset
```

**Warning**: This resets all data in dev. For production, use `prisma migrate resolve`.
