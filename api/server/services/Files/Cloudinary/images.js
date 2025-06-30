const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { v2: cloudinary } = require('cloudinary');
const { resizeImageBuffer } = require('../images/resize');
const { updateUser, updateFile } = require('~/models');
const { logger } = require('~/config');

/**
 * Determines AVIF quality based on image size (matching OpenWebUI logic)
 * 
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {number} Quality percentage (50-90)
 */
function determineAvifQuality(width, height) {
  const pixels = width * height;
  const mp = pixels / 1_000_000; // Convert pixels to megapixels

  if (mp <= 2) {
    return 90; // Max quality for images up to 2MP
  } else {
    // Decrease quality inversely proportional to the square root of the image size
    let quality = 90 * Math.pow(2 / mp, 0.5);
    quality = Math.max(50, quality); // Ensure quality doesn't drop below 50%
    return Math.round(quality);
  }
}

/**
 * Converts image to AVIF using Sharp (matching OpenWebUI conversion logic)
 * 
 * @param {Buffer} inputBuffer - The input image buffer
 * @param {string} originalFilename - Original filename to check format
 * @returns {Promise<Buffer>} AVIF converted buffer or original if already WebP/AVIF
 */
async function convertToAvifIfNeeded(inputBuffer, originalFilename) {
  const sharp = require('sharp');
  
  try {
    logger.debug(`[convertToAvifIfNeeded] Processing file: ${originalFilename}`);
    
    // Check if file is already WebP or AVIF - keep as-is (matching your Python logic)
    const lowerFilename = originalFilename.toLowerCase();
    if (lowerFilename.endsWith('.webp') || lowerFilename.endsWith('.avif')) {
      logger.debug(`[convertToAvifIfNeeded] File is already WebP/AVIF, keeping original format`);
      return inputBuffer;
    }

    // For other formats, convert to AVIF
    logger.debug(`[convertToAvifIfNeeded] Getting image metadata...`);
    const metadata = await sharp(inputBuffer).metadata();
    logger.debug(`[convertToAvifIfNeeded] Metadata: ${metadata.width}x${metadata.height}, format: ${metadata.format}`);
    
    const quality = determineAvifQuality(metadata.width, metadata.height);
    
    logger.debug(`[convertToAvifIfNeeded] Converting ${originalFilename} to AVIF with quality ${quality}% (${metadata.width}x${metadata.height}, ${(metadata.width * metadata.height / 1_000_000).toFixed(1)}MP)`);

    const avifBuffer = await sharp(inputBuffer)
      .avif({ 
        quality: quality,
        effort: 4, // Good balance between compression and speed
      })
      .toBuffer();

    logger.debug(`[convertToAvifIfNeeded] AVIF conversion successful, output size: ${avifBuffer.length} bytes`);
    return avifBuffer;
  } catch (error) {
    logger.error(`[convertToAvifIfNeeded] Error during AVIF conversion:`, error);
    throw error;
  }
}

/**
 * Uploads an image to Cloudinary with AVIF conversion and optimization
 *
 * @param {Object} params - The parameters object.
 * @param {ServerRequest} params.req - The request object from Express.
 * @param {Express.Multer.File} params.file - The file object.
 * @param {string} params.file_id - The file ID.
 * @param {EModelEndpoint} params.endpoint - The endpoint.
 * @param {string} [params.resolution='high'] - The desired resolution for image resizing.
 *
 * @returns {Promise<{ filepath: string, bytes: number, width: number, height: number}>}
 */
async function uploadImageToCloudinary({ req, file, file_id, endpoint, resolution = 'high' }) {
  try {
    // Check if file exists
    const fileExists = await fs.promises.access(file.path).then(() => true).catch(() => false);
    
    if (!fileExists) {
      throw new Error(`File does not exist at path: ${file.path}`);
    }
    
    // Read file buffer
    const inputBuffer = await fs.promises.readFile(file.path);
    
    // Step 1: Convert to AVIF if needed (for optimization) - NO RESIZING
    const convertedBuffer = await convertToAvifIfNeeded(inputBuffer, file.originalname);
    
    // Step 2: Get original dimensions without resizing
    const sharp = require('sharp');
    const metadata = await sharp(convertedBuffer).metadata();
    const resizedBuffer = convertedBuffer; // Use converted buffer without resizing
    const width = metadata.width;
    const height = metadata.height;

    // Clean user ID and create folder path
    const cleanUserId = req.user.id.replace(/[^a-zA-Z0-9_]/g, '_');
    const folder = `librechat/images/${cleanUserId}`;
    
    // Clean filename to avoid special characters that could cause issues
    const parsedName = path.parse(file.originalname).name;
    const cleanFilename = parsedName.replace(/[^a-zA-Z0-9_]/g, '_');
    
    // Clean the file_id too (remove hyphens from UUID)
    const cleanFileId = file_id.replace(/[^a-zA-Z0-9_]/g, '_');
    
    const publicId = `${cleanFileId}__${cleanFilename}`;

    // AUTO-FIX: Clean environment variables by removing all non-alphanumeric characters from ends
    const config = cloudinary.config();
    const cleanValue = (value) => {
      if (!value) return value;
      // Remove all non-alphanumeric characters from start and end, keeping only the core value
      return value.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, '');
    };
    
    const cleanConfig = {
      cloud_name: cleanValue(config.cloud_name),
      api_key: cleanValue(config.api_key),
      api_secret: cleanValue(config.api_secret),
      secure: true,
    };
    
    cloudinary.config(cleanConfig);
    
    // Upload to Cloudinary using buffer stream to avoid encoding issues
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          public_id: publicId,
          folder: folder,
          resource_type: 'image',
          use_filename: false, // Don't use filename to avoid encoding issues
          unique_filename: false,
        },
        (error, result) => {
          if (error) {
            logger.error(`[uploadImageToCloudinary] Cloudinary upload error:`, error);
            reject(error);
          } else {
            logger.debug(`[uploadImageToCloudinary] Cloudinary upload success: ${result.secure_url}`);
            resolve(result);
          }
        }
      ).end(resizedBuffer);
    });

    // Clean up temp file
    await fs.promises.unlink(file.path);

    logger.info(`[uploadImageToCloudinary] Successfully uploaded ${file.originalname}: ${result.secure_url}`);

    return {
      filepath: result.secure_url,
      bytes: result.bytes,
      width: result.width,
      height: result.height,
    };
  } catch (error) {
    logger.error('[uploadImageToCloudinary] Error uploading image:', error);
    throw error;
  }
}

/**
 * Prepares Cloudinary images for payload handling
 *
 * @param {Object} req - The request object.
 * @param {MongoFile} file - The file object.
 * @returns {Promise<[MongoFile, string]>} - A promise that resolves to an array of results from updateFile and base64 encoding.
 */
async function prepareCloudinaryImage(req, file) {
  try {
    const promises = [];
    promises.push(updateFile({ file_id: file.file_id }));
    
    // For Cloudinary, fetch the image and convert to base64
    // This is the most reliable method for all image types
    const response = await axios({
      url: file.filepath,
      responseType: 'arraybuffer',
    });
    const base64Data = Buffer.from(response.data, 'binary').toString('base64');
    promises.push(Promise.resolve(base64Data));
    
    return await Promise.all(promises);
  } catch (error) {
    logger.error('[prepareCloudinaryImage] Error preparing image:', error);
    throw error;
  }
}

/**
 * Uploads a user's avatar to Cloudinary and returns the URL
 *
 * @param {object} params - The parameters object.
 * @param {Buffer} params.buffer - The Buffer containing the avatar image.
 * @param {string} params.userId - The user ID.
 * @param {string} params.manual - A string flag indicating whether the update is manual ('true' or 'false').
 * @param {string} [params.agentId] - Optional agent ID if this is an agent avatar.
 * @returns {Promise<string>} - A promise that resolves with the URL of the uploaded avatar.
 */
async function processCloudinaryAvatar({ buffer, userId, manual, agentId }) {
  try {
    const timestamp = new Date().getTime();
    const publicId = agentId
      ? `agent-${agentId}-avatar-${timestamp}`
      : `avatar-${timestamp}`;
    
    const folder = `librechat/avatars/${userId}`;

    // Convert avatar to AVIF for maximum efficiency (avatars are small, so use high quality)
    const sharp = require('sharp');
    const avifBuffer = await sharp(buffer)
      .avif({ 
        quality: 85, // High quality for avatars since they're small
        effort: 6, // Higher effort for better compression on small images
      })
      .toBuffer();

    // Upload to Cloudinary with avatar-specific optimizations
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          public_id: publicId,
          folder: folder,
          resource_type: 'image',
          format: 'avif', // Use AVIF for avatars for maximum compression
          quality: 'auto:good',
          transformation: [
            {
              width: 200,
              height: 200,
              crop: 'fill', // Crop to square and fill
              gravity: 'face', // Focus on face if detected
              radius: 'max', // Make it circular (optional)
            }
          ],
          use_filename: true,
          unique_filename: false,
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(avifBuffer);
    });

    const isManual = manual === 'true';
    let url = `${result.secure_url}?manual=${isManual}`;

    // Only update user record if this is a user avatar (manual === 'true')
    if (isManual && !agentId) {
      await updateUser(userId, { avatar: url });
    }

    logger.info(`[processCloudinaryAvatar] Successfully uploaded avatar as AVIF: ${url}`);

    return url;
  } catch (error) {
    logger.error('[processCloudinaryAvatar] Error processing avatar:', error);
    throw error;
  }
}

module.exports = {
  uploadImageToCloudinary,
  prepareCloudinaryImage,
  processCloudinaryAvatar,
  convertToAvifIfNeeded,
  determineAvifQuality,
};