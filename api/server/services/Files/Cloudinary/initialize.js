const { v2: cloudinary } = require('cloudinary');
const { logger } = require('~/config');

/**
 * Initializes Cloudinary with environment variables
 */
const initializeCloudinary = () => {
  try {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error(
        'Missing Cloudinary configuration. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET environment variables.'
      );
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });

    logger.info('Cloudinary initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize Cloudinary:', error);
    throw error;
  }
};

module.exports = {
  initializeCloudinary,
};