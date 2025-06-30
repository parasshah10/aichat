const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { v2: cloudinary } = require('cloudinary');
const { logger } = require('@librechat/data-schemas');
const { generateShortLivedToken } = require('~/server/services/AuthService');
const { getBufferMetadata } = require('~/server/utils');

/**
 * Uploads a file to Cloudinary
 *
 * @param {Object} params - The parameters object.
 * @param {ServerRequest} params.req - The request object from Express.
 * @param {Express.Multer.File} params.file - The file object.
 * @param {string} params.file_id - The file ID.
 * @param {string} [params.entity_id] - Optional entity ID for organization.
 * @param {string} [params.basePath='uploads'] - Base path for file organization.
 *
 * @returns {Promise<{ filepath: string, bytes: number }>}
 */
async function uploadFileToCloudinary({ req, file, file_id, entity_id, basePath = 'uploads' }) {
  try {
    const inputBuffer = await fs.promises.readFile(file.path);
    const bytes = Buffer.byteLength(inputBuffer);

    // Create folder structure: basePath/userId/entityId (if provided)
    let folder = `librechat/${basePath}/${req.user.id}`;
    if (entity_id) {
      folder += `/${entity_id}`;
    }

    // Clean filename and file_id to avoid special characters
    const cleanFilename = path.parse(file.originalname).name.replace(/[^a-zA-Z0-9_]/g, '_');
    const cleanFileId = file_id.replace(/[^a-zA-Z0-9_]/g, '_');
    
    // Upload to Cloudinary using buffer to avoid file path encoding issues
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          public_id: `${cleanFileId}__${cleanFilename}`,
          folder: folder,
          resource_type: 'auto', // Automatically detect file type
          use_filename: false, // Don't use filename to avoid encoding issues
          unique_filename: false,
        },
        (error, result) => {
          if (error) {
            logger.error(`[uploadFileToCloudinary] Cloudinary upload error:`, error);
            reject(error);
          } else {
            logger.debug(`[uploadFileToCloudinary] Cloudinary upload success: ${result.secure_url}`);
            resolve(result);
          }
        }
      ).end(inputBuffer);
    });

    // Clean up temp file
    await fs.promises.unlink(file.path);

    return {
      filepath: result.secure_url,
      bytes,
    };
  } catch (error) {
    logger.error('[uploadFileToCloudinary] Error uploading file:', error);
    throw error;
  }
}

/**
 * Saves a buffer to Cloudinary with AVIF conversion for images
 *
 * @param {Object} params - The parameters object.
 * @param {string} params.userId - The user's unique identifier.
 * @param {Buffer} params.buffer - The buffer to be saved.
 * @param {string} params.fileName - The name of the file to be saved.
 * @param {string} [params.basePath='images'] - Base path for file organization.
 * @returns {Promise<string>} - A promise that resolves to the Cloudinary URL.
 */
async function saveCloudinaryBuffer({ userId, buffer, fileName, basePath = 'images' }) {
  try {
    const folder = `librechat/${basePath}/${userId}`;
    // Clean filename to avoid special characters
    const publicId = path.parse(fileName).name.replace(/[^a-zA-Z0-9_]/g, '_');

    // Check if this is an image and convert to AVIF if needed
    const isImage = /\.(jpg|jpeg|png|gif|bmp|tiff|webp|avif)$/i.test(fileName);
    let finalBuffer = buffer;
    let resourceType = 'auto';
    let format = undefined;

    if (isImage && basePath === 'images') {
      // Import the conversion function from images.js
      const { convertToAvifIfNeeded } = require('./images');
      finalBuffer = await convertToAvifIfNeeded(buffer, fileName);
      resourceType = 'image';
      format = 'avif';
      
      logger.debug(`[saveCloudinaryBuffer] Converting image ${fileName} to AVIF for storage`);
    }

    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          public_id: publicId,
          folder: folder,
          resource_type: resourceType,
          format: format,
          use_filename: true,
          unique_filename: false,
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(finalBuffer);
    });

    return result.secure_url;
  } catch (error) {
    logger.error('[saveCloudinaryBuffer] Error saving buffer:', error);
    throw error;
  }
}

/**
 * Saves a file from a URL to Cloudinary
 *
 * @param {Object} params - The parameters object.
 * @param {string} params.userId - The user's unique identifier.
 * @param {string} params.URL - The URL of the file to be saved.
 * @param {string} params.fileName - The desired file name.
 * @param {string} [params.basePath='images'] - Base path for file organization.
 *
 * @returns {Promise<{ bytes: number, type: string, dimensions: Record<string, number>} | null>}
 */
async function saveURLToCloudinary({ userId, URL, fileName, basePath = 'images' }) {
  try {
    // First, get the file to determine metadata
    const response = await axios({
      url: URL,
      responseType: 'arraybuffer',
    });

    const buffer = Buffer.from(response.data, 'binary');
    const { bytes, type, dimensions } = await getBufferMetadata(buffer);

    const folder = `librechat/${basePath}/${userId}`;
    const publicId = path.parse(fileName).name;

    // Upload to Cloudinary from URL
    const result = await cloudinary.uploader.upload(URL, {
      public_id: publicId,
      folder: folder,
      resource_type: 'auto',
      use_filename: true,
      unique_filename: false,
    });

    return {
      bytes,
      type,
      dimensions,
    };
  } catch (error) {
    logger.error('[saveURLToCloudinary] Error saving URL:', error);
    return null;
  }
}

/**
 * Gets a Cloudinary file URL
 *
 * @param {Object} params - The parameters object.
 * @param {string} params.fileName - The file name including user path.
 * @param {string} [params.basePath='images'] - Base path for file organization.
 *
 * @returns {string} The Cloudinary URL.
 */
async function getCloudinaryURL({ fileName, basePath = 'images' }) {
  // For Cloudinary, the fileName should already be a full URL
  // But if it's a path, we can construct the URL
  if (fileName.startsWith('http')) {
    return fileName;
  }
  
  // Construct Cloudinary URL if needed
  const folder = `librechat/${basePath}`;
  const publicId = `${folder}/${fileName}`;
  
  return cloudinary.url(publicId, {
    secure: true,
    resource_type: 'auto',
  });
}

/**
 * Deletes a file from Cloudinary
 *
 * @param {ServerRequest} req - The request object from Express.
 * @param {MongoFile} file - The file object to be deleted.
 *
 * @returns {Promise<void>}
 */
async function deleteCloudinaryFile(req, file) {
  try {
    // Handle RAG deletion if needed
    if (file.embedded && process.env.RAG_API_URL) {
      const jwtToken = generateShortLivedToken(req.user.id);
      await axios.delete(`${process.env.RAG_API_URL}/documents`, {
        headers: {
          Authorization: `Bearer ${jwtToken}`,
          'Content-Type': 'application/json',
          accept: 'application/json',
        },
        data: [file.file_id],
      });
    }

    // Extract public_id from Cloudinary URL
    const publicId = extractPublicIdFromUrl(file.filepath);
    
    if (publicId) {
      // Try to determine resource type from the URL or file extension
      let resourceType = 'image'; // Default to image
      
      // Check if it's likely a video file
      if (file.filepath.includes('/video/') || /\.(mp4|avi|mov|wmv|flv|webm|mkv)$/i.test(file.filepath)) {
        resourceType = 'video';
      }
      // Check if it's likely a raw file (documents, etc.)
      else if (file.filepath.includes('/raw/') || /\.(pdf|doc|docx|txt|csv|json|xml)$/i.test(file.filepath)) {
        resourceType = 'raw';
      }
      
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
      });
      
      if (result.result === 'ok') {
        logger.debug(`[deleteCloudinaryFile] Successfully deleted file: ${publicId}`);
      } else if (result.result === 'not found') {
        logger.warn(`[deleteCloudinaryFile] File not found in Cloudinary: ${publicId}`);
      } else {
        logger.warn(`[deleteCloudinaryFile] Unexpected result from Cloudinary: ${result.result} for ${publicId}`);
      }
    } else {
      logger.warn(`[deleteCloudinaryFile] Could not extract public_id from: ${file.filepath}`);
    }
  } catch (error) {
    logger.error('[deleteCloudinaryFile] Error deleting file:', error);
    throw error;
  }
}

/**
 * Gets a readable stream for a file from Cloudinary
 *
 * @param {ServerRequest} req - The request object from Express
 * @param {string} filepath - The Cloudinary URL.
 * @returns {Promise<ReadableStream>} A readable stream of the file.
 */
async function getCloudinaryFileStream(req, filepath) {
  try {
    // For Cloudinary, we can stream directly from the URL
    const response = await axios({
      method: 'GET',
      url: filepath,
      responseType: 'stream',
    });
    return response.data;
  } catch (error) {
    logger.error('Error getting Cloudinary file stream:', error);
    throw error;
  }
}

/**
 * Extracts the public_id from a Cloudinary URL
 *
 * @param {string} url - The Cloudinary URL
 * @returns {string|null} The public_id or null if not found
 */
function extractPublicIdFromUrl(url) {
  try {
    // Cloudinary URL format: https://res.cloudinary.com/{cloud_name}/{resource_type}/upload/{version}/{public_id}.{format}
    // or: https://res.cloudinary.com/{cloud_name}/{resource_type}/upload/{transformations}/{version}/{public_id}.{format}
    const urlParts = url.split('/');
    const uploadIndex = urlParts.findIndex(part => part === 'upload');
    
    if (uploadIndex === -1) return null;
    
    // Get everything after 'upload'
    const pathAfterUpload = urlParts.slice(uploadIndex + 1);
    
    // Remove version number if present (starts with 'v' followed by digits)
    let startIndex = 0;
    if (pathAfterUpload[0] && /^v\d+$/.test(pathAfterUpload[0])) {
      startIndex = 1; // Skip the version part
    }
    
    // Get the path without version and remove file extension
    const pathWithoutVersion = pathAfterUpload.slice(startIndex).join('/');
    const publicId = pathWithoutVersion.replace(/\.[^/.]+$/, ''); // Remove file extension
    
    return publicId;
  } catch (error) {
    logger.error('Error extracting public_id from URL:', error);
    return null;
  }
}

module.exports = {
  uploadFileToCloudinary,
  saveCloudinaryBuffer,
  saveURLToCloudinary,
  getCloudinaryURL,
  deleteCloudinaryFile,
  getCloudinaryFileStream,
};