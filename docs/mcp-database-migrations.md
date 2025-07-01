# MCP Database Migrations

## Overview
This document outlines the database migration strategy for implementing user-defined MCP servers. All migrations are designed to be reversible and safe.

## Migration Philosophy
1. **Reversible**: Every migration has a corresponding rollback
2. **Safe**: No data loss during migrations
3. **Tested**: All migrations tested in development
4. **Versioned**: Clear version tracking
5. **Documented**: Each migration documented

## Migration Files Structure
```
api/migrations/
├── mcp/
│   ├── 001-create-mcp-servers.js
│   ├── 002-add-mcp-server-indexes.js
│   └── README.md
└── utils/
    ├── migration-runner.js
    └── rollback-runner.js
```

## Migration 001: Create MCP Servers Collection

### Purpose
Create the initial `mcpServers` collection with proper schema validation.

### Schema
```javascript
{
  _id: ObjectId,
  userId: ObjectId,           // Required, indexed
  name: String,               // Required, unique per user
  type: String,               // Required, enum: ['stdio', 'websocket', 'sse', 'streamable-http']
  enabled: Boolean,           // Default: true
  
  config: {
    // Connection details (varies by type)
    command: String,          // For stdio
    args: [String],           // For stdio
    env: Object,              // For stdio
    url: String,              // For web-based types
    headers: Object,          // For web-based types
    
    // OAuth configuration (optional)
    oauth: {
      authorization_url: String,
      token_url: String,
      client_id: String,
      client_secret: String,   // Encrypted
      scope: String,
      redirect_uri: String,
      token_exchange_method: String
    },
    
    // Timeouts and options
    timeout: Number,          // Default: 30000
    initTimeout: Number,      // Default: 10000
    iconPath: String,
    chatMenu: Boolean,        // Default: true
    serverInstructions: Mixed,
    customUserVars: Object
  },
  
  // Metadata
  description: String,
  createdAt: Date,            // Default: Date.now
  updatedAt: Date,            // Default: Date.now
  lastConnected: Date,
  status: String,             // enum: ['online', 'offline', 'error', 'connecting', 'unknown']
  errorMessage: String,
  
  // Tool cache
  toolCount: Number,          // Default: 0
  tools: [{
    name: String,
    description: String,
    enabled: Boolean,         // Default: true
    schema: Object,
    lastUpdated: Date
  }]
}
```

### Validation Rules
- `userId` must exist in users collection
- `name` must be unique per user
- `type` must be valid enum value
- `config.url` must be valid URL for web types
- `config.command` required for stdio type

### Indexes
- `{ userId: 1, name: 1 }` - Unique compound index
- `{ userId: 1, enabled: 1 }` - Query optimization
- `{ status: 1 }` - Status filtering
- `{ createdAt: 1 }` - Sorting

### Migration Script
```javascript
// 001-create-mcp-servers.js
const { MongoClient } = require('mongodb');

async function up(db) {
  // Create collection with validation
  await db.createCollection('mcpServers', {
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['userId', 'name', 'type', 'config'],
        properties: {
          userId: { bsonType: 'objectId' },
          name: { 
            bsonType: 'string',
            minLength: 1,
            maxLength: 100
          },
          type: {
            bsonType: 'string',
            enum: ['stdio', 'websocket', 'sse', 'streamable-http']
          },
          enabled: { bsonType: 'bool' },
          config: { bsonType: 'object' },
          description: { 
            bsonType: 'string',
            maxLength: 500
          },
          status: {
            bsonType: 'string',
            enum: ['online', 'offline', 'error', 'connecting', 'unknown']
          }
        }
      }
    }
  });

  // Create indexes
  await db.collection('mcpServers').createIndex(
    { userId: 1, name: 1 }, 
    { unique: true }
  );
  await db.collection('mcpServers').createIndex({ userId: 1, enabled: 1 });
  await db.collection('mcpServers').createIndex({ status: 1 });
  await db.collection('mcpServers').createIndex({ createdAt: 1 });

  console.log('✅ Created mcpServers collection with validation and indexes');
}

async function down(db) {
  // Drop collection (this removes all data!)
  await db.collection('mcpServers').drop();
  console.log('✅ Dropped mcpServers collection');
}

module.exports = { up, down };
```

## Migration 002: Add Additional Indexes

### Purpose
Add performance indexes based on usage patterns.

### New Indexes
- `{ userId: 1, type: 1 }` - Filter by user and type
- `{ userId: 1, lastConnected: 1 }` - Sort by last connection
- `{ "tools.name": 1 }` - Tool name search

### Migration Script
```javascript
// 002-add-mcp-server-indexes.js
async function up(db) {
  const collection = db.collection('mcpServers');
  
  await collection.createIndex({ userId: 1, type: 1 });
  await collection.createIndex({ userId: 1, lastConnected: 1 });
  await collection.createIndex({ "tools.name": 1 });
  
  console.log('✅ Added additional indexes to mcpServers');
}

async function down(db) {
  const collection = db.collection('mcpServers');
  
  await collection.dropIndex({ userId: 1, type: 1 });
  await collection.dropIndex({ userId: 1, lastConnected: 1 });
  await collection.dropIndex({ "tools.name": 1 });
  
  console.log('✅ Removed additional indexes from mcpServers');
}

module.exports = { up, down };
```

## Migration Runner Utility

### Purpose
Utility to run migrations safely with rollback capability.

```javascript
// utils/migration-runner.js
const { MongoClient } = require('mongodb');
const fs = require('fs').promises;
const path = require('path');

class MigrationRunner {
  constructor(connectionString, dbName) {
    this.connectionString = connectionString;
    this.dbName = dbName;
    this.client = null;
    this.db = null;
  }

  async connect() {
    this.client = new MongoClient(this.connectionString);
    await this.client.connect();
    this.db = this.client.db(this.dbName);
    
    // Ensure migrations collection exists
    await this.ensureMigrationsCollection();
  }

  async ensureMigrationsCollection() {
    const collections = await this.db.listCollections({ name: 'migrations' }).toArray();
    if (collections.length === 0) {
      await this.db.createCollection('migrations');
      await this.db.collection('migrations').createIndex({ name: 1 }, { unique: true });
    }
  }

  async getAppliedMigrations() {
    const migrations = await this.db.collection('migrations').find({}).toArray();
    return migrations.map(m => m.name);
  }

  async markMigrationApplied(name) {
    await this.db.collection('migrations').insertOne({
      name,
      appliedAt: new Date(),
      version: process.env.npm_package_version || 'unknown'
    });
  }

  async markMigrationRolledBack(name) {
    await this.db.collection('migrations').deleteOne({ name });
  }

  async runMigration(migrationPath) {
    const migrationName = path.basename(migrationPath, '.js');
    const appliedMigrations = await this.getAppliedMigrations();
    
    if (appliedMigrations.includes(migrationName)) {
      console.log(`⏭️  Skipping ${migrationName} (already applied)`);
      return;
    }

    console.log(`🚀 Running migration: ${migrationName}`);
    
    try {
      const migration = require(migrationPath);
      await migration.up(this.db);
      await this.markMigrationApplied(migrationName);
      console.log(`✅ Migration ${migrationName} completed successfully`);
    } catch (error) {
      console.error(`❌ Migration ${migrationName} failed:`, error);
      throw error;
    }
  }

  async rollbackMigration(migrationPath) {
    const migrationName = path.basename(migrationPath, '.js');
    const appliedMigrations = await this.getAppliedMigrations();
    
    if (!appliedMigrations.includes(migrationName)) {
      console.log(`⏭️  Skipping rollback of ${migrationName} (not applied)`);
      return;
    }

    console.log(`🔄 Rolling back migration: ${migrationName}`);
    
    try {
      const migration = require(migrationPath);
      await migration.down(this.db);
      await this.markMigrationRolledBack(migrationName);
      console.log(`✅ Rollback of ${migrationName} completed successfully`);
    } catch (error) {
      console.error(`❌ Rollback of ${migrationName} failed:`, error);
      throw error;
    }
  }

  async runAllMigrations(migrationsDir) {
    const files = await fs.readdir(migrationsDir);
    const migrationFiles = files
      .filter(f => f.endsWith('.js'))
      .sort(); // Run in order

    for (const file of migrationFiles) {
      await this.runMigration(path.join(migrationsDir, file));
    }
  }

  async rollbackAllMigrations(migrationsDir) {
    const files = await fs.readdir(migrationsDir);
    const migrationFiles = files
      .filter(f => f.endsWith('.js'))
      .sort()
      .reverse(); // Rollback in reverse order

    for (const file of migrationFiles) {
      await this.rollbackMigration(path.join(migrationsDir, file));
    }
  }

  async close() {
    if (this.client) {
      await this.client.close();
    }
  }
}

module.exports = MigrationRunner;
```

## Usage Examples

### Running Migrations
```bash
# Run all pending migrations
node scripts/migrate.js up

# Run specific migration
node scripts/migrate.js up 001-create-mcp-servers

# Rollback last migration
node scripts/migrate.js down

# Rollback specific migration
node scripts/migrate.js down 001-create-mcp-servers

# Rollback all migrations (DANGEROUS!)
node scripts/migrate.js down --all
```

### Migration Script
```javascript
// scripts/migrate.js
const MigrationRunner = require('../api/migrations/utils/migration-runner');
const path = require('path');

async function main() {
  const [,, action, migrationName] = process.argv;
  
  if (!action || !['up', 'down'].includes(action)) {
    console.error('Usage: node migrate.js <up|down> [migration-name]');
    process.exit(1);
  }

  const connectionString = process.env.MONGO_URI || 'mongodb://localhost:27017';
  const dbName = process.env.DB_NAME || 'librechat';
  const migrationsDir = path.join(__dirname, '../api/migrations/mcp');

  const runner = new MigrationRunner(connectionString, dbName);
  
  try {
    await runner.connect();
    
    if (action === 'up') {
      if (migrationName) {
        await runner.runMigration(path.join(migrationsDir, `${migrationName}.js`));
      } else {
        await runner.runAllMigrations(migrationsDir);
      }
    } else if (action === 'down') {
      if (migrationName) {
        await runner.rollbackMigration(path.join(migrationsDir, `${migrationName}.js`));
      } else {
        console.error('Specify migration name for rollback or use --all flag');
        process.exit(1);
      }
    }
    
    console.log('🎉 Migration operation completed successfully');
  } catch (error) {
    console.error('💥 Migration operation failed:', error);
    process.exit(1);
  } finally {
    await runner.close();
  }
}

main();
```

## Safety Checklist

Before running migrations:
- [ ] Backup database
- [ ] Test migrations in development
- [ ] Verify rollback procedures work
- [ ] Check disk space
- [ ] Ensure application is stopped
- [ ] Have rollback plan ready

## Rollback Procedures

### Emergency Rollback
1. Stop the application
2. Run rollback migration
3. Verify data integrity
4. Restart application with previous code
5. Monitor for issues

### Partial Rollback
1. Identify problematic migration
2. Run specific rollback
3. Fix migration script
4. Re-run corrected migration

## Monitoring

### Migration Status
- Track applied migrations in database
- Log all migration operations
- Monitor migration performance
- Alert on migration failures

### Post-Migration Checks
- Verify collection exists
- Check index creation
- Validate data integrity
- Test application functionality

---

*This document will be updated as migrations are implemented and tested*