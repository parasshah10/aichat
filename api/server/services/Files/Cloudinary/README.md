# Cloudinary Integration for LibreChat

This directory contains the Cloudinary file storage strategy implementation for LibreChat, providing cloud-based file and image storage with automatic optimization.

## Features

- ✅ **File Upload Support** - Upload any file type to Cloudinary
- ✅ **Smart AVIF Conversion** - Automatic conversion to AVIF format with intelligent quality scaling
- ✅ **Image Optimization** - Advanced compression and format conversion
- ✅ **Avatar Processing** - Optimized avatar uploads with face detection and AVIF compression
- ✅ **CDN Delivery** - Global CDN for fast file access
- ✅ **Automatic Cleanup** - File deletion support
- ✅ **Folder Organization** - Files organized by user and type
- ✅ **Security** - Secure URLs and access control

## Setup Instructions

### 1. Create a Cloudinary Account

1. Go to [Cloudinary](https://cloudinary.com/) and create a free account
2. Navigate to your Dashboard to find your credentials

### 2. Configure Environment Variables

Add the following to your `.env` file:

```bash
# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_API_KEY=your_api_key_here
CLOUDINARY_API_SECRET=your_api_secret_here
```

### 3. Update LibreChat Configuration

In your `librechat.yaml` file, set the file strategy to Cloudinary:

```yaml
# File strategy: local/s3/firebase/azure_blob/cloudinary
fileStrategy: "cloudinary"
```

### 4. Install Dependencies

The Cloudinary package should be automatically installed. If not, run:

```bash
cd api
npm install cloudinary
```

### 5. Test the Integration

Run the test script to verify everything is working:

```bash
node api/server/services/Files/Cloudinary/test.js
```

### 6. Restart LibreChat

Restart your LibreChat instance to apply the changes.

## File Organization

Files are organized in Cloudinary with the following structure:

```
librechat/
├── images/
│   └── {userId}/
│       └── {fileId}__{filename}
├── uploads/
│   └── {userId}/
│       └── {fileId}__{filename}
└── avatars/
    └── {userId}/
        └── avatar-{timestamp} or agent-{agentId}-avatar-{timestamp}
```

## Image Processing

LibreChat's Cloudinary integration applies intelligent AVIF conversion:

### Smart AVIF Conversion Logic
- **WebP/AVIF files**: Kept in original format (no unnecessary conversion)
- **Other formats**: Automatically converted to AVIF for maximum efficiency
- **Quality scaling**: 
  - 90% quality for images ≤ 2MP
  - Decreasing quality for larger images (using square root scaling)
  - Minimum 50% quality floor for very large images
- **Avatar optimization**: High-quality AVIF conversion (85% quality) with face detection

### Additional Cloudinary Features
- **CDN Delivery**: Global content delivery network
- **Responsive Images**: On-the-fly resizing and cropping
- **Advanced Processing**: Face detection, smart cropping, and more

## Advantages over Local Storage

1. **No Local Disk Usage** - Files stored in the cloud
2. **Global CDN** - Fast delivery worldwide
3. **Automatic Optimization** - Images optimized automatically
4. **Scalability** - No storage limits on your server
5. **Backup & Reliability** - Cloudinary handles backups
6. **Advanced Features** - AI-powered image enhancements available

## Troubleshooting

### Common Issues

1. **"Missing Cloudinary configuration" Error**
   - Ensure all three environment variables are set correctly
   - Check for typos in variable names

2. **Upload Failures**
   - Verify your Cloudinary credentials
   - Check your account's upload limits
   - Ensure internet connectivity

3. **Images Not Loading**
   - Check if URLs are being generated correctly
   - Verify Cloudinary account is active
   - Check browser console for CORS issues

### Debug Mode

Enable debug logging to see detailed Cloudinary operations:

```bash
DEBUG_LOGGING=true
```

## API Reference

### Core Functions

- `uploadFileToCloudinary()` - Upload any file type
- `uploadImageToCloudinary()` - Upload and optimize images
- `processCloudinaryAvatar()` - Process user/agent avatars
- `saveCloudinaryBuffer()` - Upload from buffer
- `deleteCloudinaryFile()` - Delete files
- `getCloudinaryURL()` - Generate file URLs

### Configuration Options

All standard Cloudinary options are supported. Advanced configurations can be added to the upload functions as needed.

## Support

For issues specific to the LibreChat Cloudinary integration, please check:

1. This README for common solutions
2. LibreChat documentation
3. Cloudinary documentation for API-specific issues

## Contributing

When contributing to the Cloudinary integration:

1. Follow the existing code patterns
2. Add appropriate error handling
3. Update tests if needed
4. Document any new features