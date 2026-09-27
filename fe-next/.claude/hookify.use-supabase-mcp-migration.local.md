---
name: use-supabase-mcp-migration
enabled: true
event: file
action: warn
conditions:
  - field: file_path
    operator: regex_match
    pattern: (migrations?|supabase).*(\.sql$|/\d{14}_.*\.sql$)
---

⚠️ **SQL Migration File Detected - Use Supabase MCP Instead!**

You're creating a SQL migration file directly. **Please use the Supabase MCP `apply_migration` tool instead.**

## Why Use MCP?

1. **Immediate Application**: `mcp__supabase__apply_migration` applies the migration directly to the database
2. **No Manual Steps**: User doesn't need to run `npm run db:migrate` separately
3. **Validation**: MCP validates the SQL before applying
4. **Consistency**: Ensures migrations are tracked and applied in order

## How to Use

Instead of writing to a migration file, call:

```
mcp__supabase__apply_migration({
  name: "your_migration_name_in_snake_case",
  query: "YOUR SQL STATEMENT HERE"
})
```

## Example

```sql
-- Instead of creating: supabase/migrations/20250118123456_add_user_column.sql
-- Use the MCP tool:

mcp__supabase__apply_migration({
  name: "add_user_column",
  query: "ALTER TABLE users ADD COLUMN created_at TIMESTAMP DEFAULT NOW();"
})
```

**Remember:** The MCP handles timestamping and ordering automatically!
