/**
 * Migration: Create MCP Servers Collection
 * 
 * This migration creates the mcpServers collection with proper schema validation,
 * indexes, and constraints for user-defined MCP servers.
 * 
 * Created: 2024-01-XX
 * Reversible: Yes
 */

async function up(db) {
  console.log('Creating mcpServers collection...');

  // Create collection with validation
  await db.createCollection('mcpservers', {
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['userId', 'name', 'type', 'config'],
        properties: {
          userId: { 
            bsonType: 'objectId',
            description: 'User ID who owns this MCP server'
          },
          name: { 
            bsonType: 'string',
            minLength: 1,
            maxLength: 100,
            description: 'Server name, must be unique per user'
          },
          type: {
            bsonType: 'string',
            enum: ['stdio', 'websocket', 'sse', 'streamable-http'],
            description: 'MCP server transport type'
          },
          enabled: { 
            bsonType: 'bool',
            description: 'Whether the server is enabled'
          },
          config: { 
            bsonType: 'object',
            description: 'Server configuration object'
          },
          description: { 
            bsonType: 'string',
            maxLength: 500,
            description: 'Optional server description'
          },
          status: {
            bsonType: 'string',
            enum: ['online', 'offline', 'error', 'connecting', 'unknown'],
            description: 'Current server status'
          },
          errorMessage: {
            bsonType: 'string',
            description: 'Error message if status is error'
          },
          toolCount: {
            bsonType: 'int',
            minimum: 0,
            description: 'Number of tools provided by this server'
          },
          tools: {
            bsonType: 'array',
            items: {
              bsonType: 'object',
              required: ['name', 'enabled'],
              properties: {
                name: { bsonType: 'string' },
                description: { bsonType: 'string' },
                enabled: { bsonType: 'bool' },
                schema: { bsonType: 'object' },
                lastUpdated: { bsonType: 'date' }
              }
            },
            description: 'Array of tools provided by this server'
          },
          lastConnected: {
            bsonType: 'date',
            description: 'Last successful connection timestamp'
          },
          createdAt: {
            bsonType: 'date',
            description: 'Creation timestamp'
          },
          updatedAt: {
            bsonType: 'date',
            description: 'Last update timestamp'
          }
        }
      }
    }
  });

  console.log('Creating indexes...');

  // Create indexes for performance and constraints
  const collection = db.collection('mcpservers');
  
  // Unique compound index: user can't have duplicate server names
  await collection.createIndex(
    { userId: 1, name: 1 }, 
    { 
      unique: true,
      name: 'userId_name_unique'
    }
  );

  // Query optimization indexes
  await collection.createIndex(
    { userId: 1, enabled: 1 },
    { name: 'userId_enabled' }
  );

  await collection.createIndex(
    { userId: 1, type: 1 },
    { name: 'userId_type' }
  );

  await collection.createIndex(
    { status: 1 },
    { name: 'status' }
  );

  await collection.createIndex(
    { createdAt: 1 },
    { name: 'createdAt' }
  );

  await collection.createIndex(
    { userId: 1, lastConnected: 1 },
    { name: 'userId_lastConnected' }
  );

  await collection.createIndex(
    { 'tools.name': 1 },
    { name: 'tools_name' }
  );

  console.log('✅ Created mcpServers collection with validation and indexes');
  
  // Log the indexes for verification
  const indexes = await collection.indexes();
  console.log('📋 Created indexes:', indexes.map(idx => idx.name));
}

async function down(db) {
  console.log('🔄 Rolling back: Dropping mcpServers collection...');
  
  // Drop the entire collection (this removes all data!)
  await db.collection('mcpservers').drop();
  
  console.log('✅ Dropped mcpServers collection');
  console.log('⚠️  All MCP server data has been removed');
}

module.exports = { up, down };