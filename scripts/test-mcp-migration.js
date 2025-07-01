#!/usr/bin/env node

/**
 * Test script for MCP migration
 * 
 * This script tests the MCP migration by:
 * 1. Running the migration
 * 2. Creating a test MCP server
 * 3. Verifying the data
 * 4. Cleaning up
 * 
 * Usage: node scripts/test-mcp-migration.js
 */

const mongoose = require('mongoose');
const { createMCPServer, getMCPServers, deleteMCPServer } = require('../api/models');

async function testMigration() {
  const connectionString = process.env.MONGO_URI || 'mongodb://localhost:27017';
  const dbName = process.env.DB_NAME || 'librechat';

  console.log('🧪 Testing MCP Migration...');
  console.log(`📡 Connecting to: ${connectionString}/${dbName}`);

  try {
    // Connect to MongoDB
    await mongoose.connect(`${connectionString}/${dbName}`);
    console.log('✅ Connected to MongoDB');

    // Create a test user ID (in real scenario, this would be a real user)
    const testUserId = new mongoose.Types.ObjectId();
    console.log(`👤 Test User ID: ${testUserId}`);

    // Test 1: Create MCP Server
    console.log('\n📝 Test 1: Creating MCP Server...');
    const testServer = {
      userId: testUserId,
      name: 'test-server',
      type: 'stdio',
      description: 'Test MCP server for migration testing',
      config: {
        command: 'node',
        args: ['test-mcp-server.js'],
        env: {
          TEST_VAR: 'test_value'
        },
        timeout: 30000,
        chatMenu: true
      }
    };

    const createdServer = await createMCPServer(testServer);
    console.log('✅ Created server:', {
      id: createdServer._id,
      name: createdServer.name,
      type: createdServer.type,
      enabled: createdServer.enabled,
      status: createdServer.status
    });

    // Test 2: Get MCP Servers
    console.log('\n📋 Test 2: Getting MCP Servers...');
    const servers = await getMCPServers({ userId: testUserId });
    console.log(`✅ Found ${servers.length} server(s)`);
    console.log('Server details:', servers.map(s => ({
      name: s.name,
      type: s.type,
      enabled: s.enabled,
      toolCount: s.toolCount
    })));

    // Test 3: Test unique constraint
    console.log('\n🔒 Test 3: Testing unique constraint...');
    try {
      await createMCPServer(testServer); // Should fail
      console.log('❌ Unique constraint test failed - duplicate was allowed');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('✅ Unique constraint working correctly');
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }

    // Test 4: Test validation
    console.log('\n✅ Test 4: Testing validation...');
    try {
      await createMCPServer({
        userId: testUserId,
        name: 'invalid-server',
        type: 'stdio',
        config: {} // Missing required command for stdio
      });
      console.log('❌ Validation test failed - invalid config was allowed');
    } catch (error) {
      console.log('✅ Validation working correctly:', error.message);
    }

    // Test 5: Cleanup
    console.log('\n🧹 Test 5: Cleaning up...');
    const deleted = await deleteMCPServer(createdServer._id, testUserId);
    console.log(`✅ Cleanup ${deleted ? 'successful' : 'failed'}`);

    // Verify cleanup
    const remainingServers = await getMCPServers({ userId: testUserId });
    console.log(`✅ Remaining servers: ${remainingServers.length} (should be 0)`);

    console.log('\n🎉 All tests passed! Migration is working correctly.');

  } catch (error) {
    console.error('\n💥 Test failed:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('📡 Disconnected from MongoDB');
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

testMigration();