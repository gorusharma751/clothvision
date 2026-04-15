import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

let configured = false;

export const configureCloudinary = () => {
  if (configured) return;
  if (process.env.CLOUDINARY_CLOUD_NAME) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true
    });
    configured = true;
    console.log('☁️  Cloudinary configured');
  }
};

export const isCloudinaryEnabled = () => !!process.env.CLOUDINARY_CLOUD_NAME;

// Upload Buffer to Cloudinary → returns secure URL
export const uploadToCloudinary = async (buffer, options = {}) => {
  configureCloudinary();
  if (!isCloudinaryEnabled()) return null;

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder || 'clothvision/generated',
        resource_type: 'image',
        transformation: [{ quality: 'auto:best', fetch_format: 'auto' }],
        ...options
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result.secure_url);
      }
    );
    Readable.from(buffer).pipe(stream);
  });
};

// Upload local file to Cloudinary → returns secure URL
export const uploadFileToCloudinary = async (filePath, options = {}) => {
  configureCloudinary();
  if (!isCloudinaryEnabled()) return null;

  const result = await cloudinary.uploader.upload(filePath, {
    folder: options.folder || 'clothvision/uploads',
    resource_type: 'image',
    transformation: [{ quality: 'auto:good' }],
    ...options
  });
  return result.secure_url;
};

// Upload video buffer to Cloudinary -> returns secure URL
export const uploadVideoToCloudinary = async (buffer, options = {}) => {
  configureCloudinary();
  if (!isCloudinaryEnabled()) return null;

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder || 'clothvision/videos',
        resource_type: 'video',
        ...options
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result.secure_url);
      }
    );
    Readable.from(buffer).pipe(stream);
  });
};
