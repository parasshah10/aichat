#!/usr/bin/env node

require('dotenv').config();

/**
 * MCP Database Migration Script
 * 
 * This script handles database migrations for MCP server functionality.
 * All migrations are reversible and safe.
 * 
 * Usage:
 *   node scripts/migrate-mcp.js up                    # Run all pending migrations
 *   node scripts/migrate-mcp.js up 001-create-mcp-servers  # Run specific migration
 *   node scripts/migrate-mcp.js down 001-create-mcp-servers # Rollback specific migration
 *   node scripts/migrate-mcp.js status               # Show migration status
 * 
 * Environment Variables:
 *   MONGO_URI - MongoDB connection string (default: mongodb://localhost:27017)
 *   DB_NAME   - Database name (default: librechat)
 */

const MigrationRunner = require('../api/migrations/utils/migration-runner');
const path = require('path');
const fs = require('fs').promises;

async function showUsage() {
  console.log(`
MCP Database Migration Tool

Usage:
  node scripts/migrate-mcp.js <command> [migration-name]

Commands:
  up [migration-name]    Run migrations (all pending or specific)
  down <migration-name>  Rollback specific migration
  status                 Show migration status
  list                   List available migrations

Examples:
  node scripts/migrate-mcp.js up
  node scripts/migrate-mcp.js up 001-create-mcp-servers
  node scripts/migrate-mcp.js down 001-create-mcp-servers
  node scripts/migrate-mcp.js status

Environment Variables:
  MONGO_URI=${process.env.MONGO_URI || 'mongodb://localhost:27017'}
  DB_NAME=${process.env.DB_NAME || 'librechat'}
`);
}

async function listMigrations(migrationsDir) {
  try {
    const files = await fs.readdir(migrationsDir);
    const migrationFiles = files
      .filter(f => f.endsWith('.js'))
      .sort();

    console.log('\n📋 Available migrations:');
    for (const file of migrationFiles) {
      console.log(`  - ${file}`);
    }
    console.log('');
  } catch (error) {
    console.error('❌ Error listing migrations:', error.message);
  }
}

async function showStatus(runner, migrationsDir) {
  try {
    const files = await fs.readdir(migrationsDir);
    const availableMigrations = files
      .filter(f => f.endsWith('.js'))
      .map(f => path.basename(f, '.js'))
      .sort();

    const appliedMigrations = await runner.getAppliedMigrations();

    console.log('\n📊 Migration Status:');
    console.log('==================');
    
    for (const migration of availableMigrations) {
      const isApplied = appliedMigrations.includes(migration);
      const status = isApplied ? '✅ Applied' : '⏳ Pending';
      console.log(`  ${migration}: ${status}`);
    }
    
    console.log(`\nTotal: ${availableMigrations.length} migrations, ${appliedMigrations.length} applied\n`);
  } catch (error) {
    console.error('❌ Error showing status:', error.message);
  }
}

async function main() {
  const [,, action, migrationName] = process.argv;
  
  if (!action || ['help', '--help', '-h'].includes(action)) {
    await showUsage();
    return;
  }

  if (!['up', 'down', 'status', 'list'].includes(action)) {
    console.error('❌ Invalid action. Use: up, down, status, or list');
    await showUsage();
    process.exit(1);
  }

  const connectionString = 'mongodb+srv://arcticaurora:arcticaurora@librechat.leugagg.mongodb.net/?retryWrites=true&w=majority&appName=librechat';
  const dbName = 'LibreChat';
  const migrationsDir = path.join(__dirname, '../api/migrations/mcp');

  // Check if migrations directory exists
  try {
    await fs.access(migrationsDir);
  } catch (error) {
    console.error(`❌ Migrations directory not found: ${migrationsDir}`);
    process.exit(1);
  }

  if (action === 'list') {
    await listMigrations(migrationsDir);
    return;
  }

  const runner = new MigrationRunner(connectionString, dbName);
  
  try {
    console.log(`🔌 Connecting to MongoDB: ${connectionString}`);
    console.log(`📁 Database: ${dbName}`);
    console.log(`📂 Migrations directory: ${migrationsDir}`);
    console.log('');

    await runner.connect();
    
    if (action === 'status') {
      await showStatus(runner, migrationsDir);
    } else if (action === 'up') {
      if (migrationName) {
        const migrationPath = path.join(migrationsDir, `${migrationName}.js`);
        try {
          await fs.access(migrationPath);
          await runner.runMigration(migrationPath);
        } catch (error) {
          if (error.code === 'ENOENT') {
            console.error(`❌ Migration file not found: ${migrationName}.js`);
            process.exit(1);
          }
          throw error;
        }
      } else {
        await runner.runAllMigrations(migrationsDir);
      }
    } else if (action === 'down') {
      if (!migrationName) {
        console.error('❌ Migration name required for rollback');
        console.error('Usage: node scripts/migrate-mcp.js down <migration-name>');
        process.exit(1);
      }
      
      const migrationPath = path.join(migrationsDir, `${migrationName}.js`);
      try {
        await fs.access(migrationPath);
        
        // Confirm rollback
        console.log(`⚠️  About to rollback migration: ${migrationName}`);
        console.log('⚠️  This may result in data loss!');
        
        // In a real scenario, you might want to add a confirmation prompt here
        // For now, we'll proceed with the rollback
        await runner.rollbackMigration(migrationPath);
      } catch (error) {
        if (error.code === 'ENOENT') {
          console.error(`❌ Migration file not found: ${migrationName}.js`);
          process.exit(1);
        }
        throw error;
      }
    }
    
    console.log('\n🎉 Migration operation completed successfully');
  } catch (error) {
    console.error('\n💥 Migration operation failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    await runner.close();
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

main();