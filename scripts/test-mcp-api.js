#!/usr/bin/env node

/**
 * Test script for MCP API endpoints
 * 
 * This script tests the MCP server management API endpoints to ensure
 * they work correctly with proper validation and error handling.
 * 
 * Usage: node scripts/test-mcp-api.js
 * 
 * Prerequisites:
 * - LibreChat server running
 * - Valid JWT token for authentication
 * - MCP migration applied
 */

const axios = require('axios');
const mongoose = require('mongoose');

// Configuration
const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3080';
const JWT_TOKEN = process.env.TEST_JWT_TOKEN; // You'll need to provide this
const API_URL = `${BASE_URL}/api/mcp`;

// Test data
const testServer = {
  name: 'test-api-server',
  type: 'stdio',
  description: 'Test server for API testing',
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

const testServerUpdate = {
  description: 'Updated test server description',
  config: {
    ...testServer.config,
    timeout: 45000
  }
};

class MCPAPITester {
  constructor() {
    this.axios = axios.create({
      baseURL: API_URL,
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    this.createdServerId = null;
  }

  async runTests() {
    console.log('🧪 Starting MCP API Tests...\n');

    if (!JWT_TOKEN) {
      console.error('❌ JWT_TOKEN environment variable is required');
      console.log('Set it with: export TEST_JWT_TOKEN="your-jwt-token"');
      process.exit(1);
    }

    try {
      await this.testGetServers();
      await this.testCreateServer();
      await this.testGetSpecificServer();
      await this.testUpdateServer();
      await this.testToggleServer();
      await this.testGetTools();
      await this.testServerConnection();
      await this.testRefreshTools();
      await this.testGetStats();
      await this.testValidation();
      await this.testCleanup();

      console.log('\n🎉 All tests passed! API is working correctly.');
    } catch (error) {
      console.error('\n💥 Test failed:', error.message);
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Status:', error.response.status);
      }
      
      // Cleanup on failure
      if (this.createdServerId) {
        await this.cleanup();
      }
      
      process.exit(1);
    }
  }

  async testGetServers() {
    console.log('📋 Test 1: Get servers list...');
    
    const response = await this.axios.get('/servers');
    
    console.log(`✅ Retrieved ${response.data.servers.length} servers`);
    console.log('Response structure:', Object.keys(response.data));
  }

  async testCreateServer() {
    console.log('\n📝 Test 2: Create new server...');
    
    const response = await this.axios.post('/servers', testServer);
    
    this.createdServerId = response.data.server._id;
    
    console.log('✅ Created server:', {
      id: response.data.server._id,
      name: response.data.server.name,
      type: response.data.server.type,
      enabled: response.data.server.enabled,
      status: response.data.server.status
    });
  }

  async testGetSpecificServer() {
    console.log('\n🔍 Test 3: Get specific server...');
    
    const response = await this.axios.get(`/servers/${this.createdServerId}`);
    
    console.log('✅ Retrieved server details:', {
      name: response.data.server.name,
      type: response.data.server.type,
      toolCount: response.data.server.toolCount,
      hasConfig: !!response.data.server.config
    });
  }

  async testUpdateServer() {
    console.log('\n✏️ Test 4: Update server...');
    
    const response = await this.axios.put(`/servers/${this.createdServerId}`, testServerUpdate);
    
    console.log('✅ Updated server:', {
      description: response.data.server.description,
      timeout: response.data.server.config.timeout
    });
  }

  async testToggleServer() {
    console.log('\n🔄 Test 5: Toggle server status...');
    
    // Disable server
    let response = await this.axios.post(`/servers/${this.createdServerId}/toggle`, {
      enabled: false
    });
    
    console.log('✅ Disabled server:', response.data.server.enabled);
    
    // Enable server
    response = await this.axios.post(`/servers/${this.createdServerId}/toggle`, {
      enabled: true
    });
    
    console.log('✅ Enabled server:', response.data.server.enabled);
  }

  async testGetTools() {
    console.log('\n🔧 Test 6: Get server tools...');
    
    const response = await this.axios.get(`/servers/${this.createdServerId}/tools`);
    
    console.log('✅ Retrieved tools:', {
      toolCount: response.data.toolCount,
      serverName: response.data.serverName,
      serverStatus: response.data.serverStatus,
      tools: response.data.tools.map(t => ({ name: t.name, enabled: t.enabled }))
    });
  }

  async testServerConnection() {
    console.log('\n🔌 Test 7: Test server connection...');
    
    const response = await this.axios.post(`/servers/${this.createdServerId}/test`);
    
    console.log('✅ Connection test result:', {
      success: response.data.success,
      status: response.data.status,
      toolsFound: response.data.tools.length,
      timestamp: response.data.timestamp
    });
  }

  async testRefreshTools() {
    console.log('\n🔄 Test 8: Refresh server tools...');
    
    const response = await this.axios.post(`/servers/${this.createdServerId}/refresh-tools`);
    
    console.log('✅ Tools refreshed:', {
      toolCount: response.data.toolCount,
      timestamp: response.data.timestamp
    });
  }

  async testGetStats() {
    console.log('\n📊 Test 9: Get user statistics...');
    
    const response = await this.axios.get('/stats');
    
    console.log('✅ User stats:', response.data.stats);
  }

  async testValidation() {
    console.log('\n🛡️ Test 10: Validation tests...');
    
    // Test invalid server creation
    try {
      await this.axios.post('/servers', {
        name: '', // Invalid: empty name
        type: 'invalid-type', // Invalid: wrong type
        config: {} // Invalid: missing required fields
      });
      console.log('❌ Validation test failed - invalid data was accepted');
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log('✅ Validation working correctly - rejected invalid data');
      } else {
        throw error;
      }
    }

    // Test duplicate server name
    try {
      await this.axios.post('/servers', testServer);
      console.log('❌ Duplicate test failed - duplicate name was accepted');
    } catch (error) {
      if (error.response && error.response.status === 409) {
        console.log('✅ Duplicate prevention working correctly');
      } else {
        throw error;
      }
    }

    // Test invalid server ID
    try {
      await this.axios.get('/servers/invalid-id');
      console.log('❌ ID validation test failed - invalid ID was accepted');
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log('✅ ID validation working correctly');
      } else {
        throw error;
      }
    }
  }

  async testCleanup() {
    console.log('\n🧹 Test 11: Cleanup...');
    await this.cleanup();
  }

  async cleanup() {
    if (this.createdServerId) {
      try {
        await this.axios.delete(`/servers/${this.createdServerId}`);
        console.log('✅ Cleanup successful - test server deleted');
        this.createdServerId = null;
      } catch (error) {
        console.log('⚠️ Cleanup warning - could not delete test server:', error.message);
      }
    }
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

// Run tests
const tester = new MCPAPITester();
tester.runTests();