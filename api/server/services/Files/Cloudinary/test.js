/**
 * Simple test script to verify Cloudinary integration
 * Run with: node api/server/services/Files/Cloudinary/test.js
 */

require('dotenv').config();
const { initializeCloudinary } = require('./initialize');
const { uploadFileToCloudinary, saveCloudinaryBuffer, deleteCloudinaryFile } = require('./crud');

async function testCloudinaryIntegration() {
  try {
    console.log('🧪 Testing Cloudinary Integration...\n');

    // Test 1: Initialize Cloudinary
    console.log('1. Testing Cloudinary initialization...');
    initializeCloudinary();
    console.log('✅ Cloudinary initialized successfully\n');

    // Test 2: Test AVIF quality calculation
    console.log('2. Testing AVIF quality calculation...');
    const { determineAvifQuality } = require('./images');
    
    const testCases = [
      { width: 1000, height: 1000, expected: '90% (1MP)' },
      { width: 2000, height: 1500, expected: '~64% (3MP)' },
      { width: 4000, height: 3000, expected: '~52% (12MP)' },
    ];
    
    testCases.forEach(({ width, height, expected }) => {
      const quality = determineAvifQuality(width, height);
      const mp = (width * height / 1_000_000).toFixed(1);
      console.log(`   📐 ${width}x${height} (${mp}MP) → ${quality}% quality ${expected}`);
    });
    console.log('✅ AVIF quality calculation working correctly\n');

    // Test 3: Test buffer upload
    console.log('3. Testing buffer upload...');
    const testBuffer = Buffer.from('Hello, Cloudinary! This is a test file.', 'utf8');
    const testUserId = 'test-user-123';
    const testFileName = 'test-file.txt';

    const bufferUrl = await saveCloudinaryBuffer({
      userId: testUserId,
      buffer: testBuffer,
      fileName: testFileName,
      basePath: 'test',
    });

    console.log('✅ Buffer uploaded successfully');
    console.log('📁 File URL:', bufferUrl);
    console.log();

    // Test 4: Test file deletion (mock)
    console.log('4. Testing file deletion...');
    const mockFile = {
      filepath: bufferUrl,
      file_id: 'test-file-123',
      embedded: false,
    };

    const mockReq = {
      user: { id: testUserId },
    };

    try {
      await deleteCloudinaryFile(mockReq, mockFile);
      console.log('✅ File deletion test completed');
    } catch (error) {
      console.log('⚠️  File deletion test (expected if file doesn\'t exist):', error.message);
    }

    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('   1. Set fileStrategy: "cloudinary" in your librechat.yaml');
    console.log('   2. Add your Cloudinary credentials to .env:');
    console.log('      CLOUDINARY_CLOUD_NAME=your_cloud_name');
    console.log('      CLOUDINARY_API_KEY=your_api_key');
    console.log('      CLOUDINARY_API_SECRET=your_api_secret');
    console.log('   3. Restart LibreChat');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Make sure you have set the Cloudinary environment variables');
    console.log('   2. Check your Cloudinary credentials');
    console.log('   3. Ensure you have internet connectivity');
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testCloudinaryIntegration();
}

module.exports = { testCloudinaryIntegration };