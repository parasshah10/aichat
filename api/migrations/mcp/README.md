# MCP Database Migrations

This directory contains database migrations for MCP (Model Context Protocol) server functionality.

## Overview

These migrations enable user-defined MCP servers in LibreChat by creating the necessary database schema and supporting infrastructure.

## Migration Files

### 001-create-mcp-servers.js
Creates the `mcpservers` collection with:
- Schema validation for all MCP server types
- Indexes for performance and uniqueness constraints
- Support for stdio, websocket, sse, and streamable-http transports
- Tool caching and status tracking
- User isolation (servers are scoped to users)

## Running Migrations

### Prerequisites
- MongoDB running and accessible
- Environment variables set:
  - `MONGO_URI` (default: mongodb://localhost:27017)
  - `DB_NAME` (default: librechat)

### Commands

```bash
# Check migration status
node scripts/migrate-mcp.js status

# Run all pending migrations
node scripts/migrate-mcp.js up

# Run specific migration
node scripts/migrate-mcp.js up 001-create-mcp-servers

# Rollback specific migration (CAREFUL!)
node scripts/migrate-mcp.js down 001-create-mcp-servers

# List available migrations
node scripts/migrate-mcp.js list

# Show help
node scripts/migrate-mcp.js help
```

### Testing

```bash
# Test the migration
node scripts/test-mcp-migration.js
```

## Safety Features

### Reversible Migrations
Every migration has both `up()` and `down()` methods:
- `up()` - Applies the migration
- `down()` - Reverses the migration (may cause data loss!)

### Migration Tracking
- Applied migrations are tracked in the `migrations` collection
- Prevents duplicate application of migrations
- Enables selective rollbacks

### Validation
- Schema validation prevents invalid data
- Unique constraints prevent conflicts
- Comprehensive error handling

## Schema Details

### MCPServer Collection
```javascript
{
  _id: ObjectId,
  userId: ObjectId,           // User who owns this server
  name: String,               // Server name (unique per user)
  type: String,               // Transport type
  enabled: Boolean,           // Whether server is active
  config: {                   // Type-specific configuration
    command: String,          // For stdio
    args: [String],           // For stdio
    url: String,              // For web types
    headers: Object,          // For web types
    oauth: Object,            // OAuth configuration
    // ... other options
  },
  description: String,        // Optional description
  status: String,             // Connection status
  errorMessage: String,       // Error details
  toolCount: Number,          // Number of tools
  tools: [{                   // Tool cache
    name: String,
    description: String,
    enabled: Boolean,
    schema: Object
  }],
  lastConnected: Date,        // Last successful connection
  createdAt: Date,
  updatedAt: Date
}
```

### Indexes
- `{ userId: 1, name: 1 }` - Unique per user
- `{ userId: 1, enabled: 1 }` - Query optimization
- `{ userId: 1, type: 1 }` - Filter by type
- `{ status: 1 }` - Status monitoring
- `{ createdAt: 1 }` - Sorting
- `{ userId: 1, lastConnected: 1 }` - Connection tracking
- `{ "tools.name": 1 }` - Tool search

## Rollback Considerations

### Data Loss Warning
Rolling back migrations may result in data loss:
- `001-create-mcp-servers` rollback will delete ALL user MCP servers
- Always backup your database before rollbacks
- Test rollbacks in development first

### Safe Rollback Procedure
1. Stop the LibreChat application
2. Backup the database
3. Run the rollback migration
4. Verify the rollback was successful
5. Restart with previous code version

### Emergency Recovery
If a migration fails:
1. Check the error logs
2. Fix any data inconsistencies manually
3. Re-run the migration or rollback
4. Contact support if needed

## Development

### Adding New Migrations
1. Create new file: `00X-description.js`
2. Implement `up()` and `down()` functions
3. Test thoroughly in development
4. Document the changes
5. Update this README

### Migration Template
```javascript
/**
 * Migration: Description
 * Created: YYYY-MM-DD
 * Reversible: Yes/No
 */

async function up(db) {
  // Apply changes
  console.log('Applying migration...');
  // ... implementation
  console.log('✅ Migration completed');
}

async function down(db) {
  // Reverse changes
  console.log('Rolling back migration...');
  // ... implementation
  console.log('✅ Rollback completed');
}

module.exports = { up, down };
```

## Troubleshooting

### Common Issues

#### Connection Errors
- Verify MongoDB is running
- Check MONGO_URI environment variable
- Ensure database permissions

#### Validation Errors
- Check data format matches schema
- Verify required fields are present
- Review enum values

#### Duplicate Key Errors
- Check for existing data conflicts
- Verify unique constraints
- Clean up test data

### Getting Help
- Check the logs for detailed error messages
- Review the migration code
- Test in development environment first
- Consult the main documentation

## Security Notes

### Sensitive Data
- OAuth client secrets should be encrypted
- Environment variables should be secured
- Database access should be restricted

### User Isolation
- All operations are scoped to users
- Cross-user access is prevented
- Admin operations require special permissions

---

For more information, see the main implementation documentation in `docs/mcp-user-servers-implementation.md`.