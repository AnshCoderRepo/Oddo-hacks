const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(uploadsDir, file.fieldname);
    
    // Create specific upload directory based on field name
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext);
    
    cb(null, `${basename}-${uniqueSuffix}${ext}`);
  }
});

// File filter function
const fileFilter = (req, file, cb) => {
  // Check file type based on field name
  if (file.fieldname === 'avatar') {
    // Only allow image files for avatar
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed for avatar'), false);
    }
  } else if (file.fieldname === 'attachment') {
    // Allow various file types for attachments
    const allowedTypes = [
      'image/',
      'application/pdf',
      'text/',
      'application/json',
      'application/xml'
    ];
    
    const isAllowed = allowedTypes.some(type => file.mimetype.startsWith(type));
    
    if (isAllowed) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'), false);
    }
  } else {
    cb(new Error('Unknown file field'), false);
  }
};

// Create multer instance
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5 // Maximum 5 files
  }
});

// Middleware for handling upload errors
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 10MB.'
      });
    }
    
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Maximum is 5 files.'
      });
    }
    
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected file field.'
      });
    }
    
    return res.status(400).json({
      success: false,
      message: 'Upload error: ' + error.message
    });
  }
  
  if (error.message) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
  
  next(error);
};

// Helper function to delete file
const deleteFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
};

// Helper function to get file info
const getFileInfo = (file) => {
  if (!file) return null;
  
  return {
    filename: file.filename,
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
    path: file.path,
    url: `/uploads/${file.fieldname}/${file.filename}`
  };
};

// Middleware configurations for different upload types
const uploadConfigs = {
  // Single avatar upload
  avatar: upload.single('avatar'),
  
  // Multiple attachments
  attachments: upload.array('attachments', 5),
  
  // Mixed uploads (avatar + attachments)
  mixed: upload.fields([
    { name: 'avatar', maxCount: 1 },
    { name: 'attachments', maxCount: 5 }
  ]),
  
  // Any single file
  single: upload.single('file'),
  
  // No files (for form data only)
  none: upload.none()
};

// Cloudinary configuration (if using cloud storage)
const cloudinary = require('cloudinary').v2;

const configureCloudinary = () => {
  if (process.env.CLOUDINARY_CLOUD_NAME && 
      process.env.CLOUDINARY_API_KEY && 
      process.env.CLOUDINARY_API_SECRET) {
    
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    });
    
    return true;
  }
  return false;
};

// Upload to cloudinary
const uploadToCloudinary = (filePath, options = {}) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload(filePath, {
      resource_type: 'auto',
      folder: 'stackit',
      ...options
    }, (error, result) => {
      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    });
  });
};

// Middleware to process uploaded files
const processUpload = async (req, res, next) => {
  try {
    const isCloudinaryEnabled = configureCloudinary();
    
    if (req.file) {
      req.fileInfo = getFileInfo(req.file);
      
      if (isCloudinaryEnabled) {
        const result = await uploadToCloudinary(req.file.path);
        req.fileInfo.cloudinaryUrl = result.secure_url;
        req.fileInfo.publicId = result.public_id;
        
        // Delete local file after uploading to cloudinary
        deleteFile(req.file.path);
      }
    }
    
    if (req.files) {
      if (Array.isArray(req.files)) {
        // Array of files
        req.filesInfo = req.files.map(getFileInfo);
        
        if (isCloudinaryEnabled) {
          for (let i = 0; i < req.files.length; i++) {
            const result = await uploadToCloudinary(req.files[i].path);
            req.filesInfo[i].cloudinaryUrl = result.secure_url;
            req.filesInfo[i].publicId = result.public_id;
            
            deleteFile(req.files[i].path);
          }
        }
      } else {
        // Object with field names as keys
        req.filesInfo = {};
        
        for (const [fieldname, files] of Object.entries(req.files)) {
          req.filesInfo[fieldname] = files.map(getFileInfo);
          
          if (isCloudinaryEnabled) {
            for (let i = 0; i < files.length; i++) {
              const result = await uploadToCloudinary(files[i].path);
              req.filesInfo[fieldname][i].cloudinaryUrl = result.secure_url;
              req.filesInfo[fieldname][i].publicId = result.public_id;
              
              deleteFile(files[i].path);
            }
          }
        }
      }
    }
    
    next();
  } catch (error) {
    console.error('Error processing upload:', error);
    
    // Clean up uploaded files on error
    if (req.file) {
      deleteFile(req.file.path);
    }
    
    if (req.files) {
      const files = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
      files.forEach(file => deleteFile(file.path));
    }
    
    res.status(500).json({
      success: false,
      message: 'Error processing upload'
    });
  }
};

module.exports = {
  upload: uploadConfigs,
  handleUploadError,
  processUpload,
  deleteFile,
  getFileInfo,
  uploadToCloudinary,
  configureCloudinary
};
