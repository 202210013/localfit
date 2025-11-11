const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists - use e-comm-images instead of uploads
const uploadDir = path.join(__dirname, '../../e-comm-images');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Save directly to e-comm-images directory without subfolders
    console.log('📁 Upload destination:', uploadDir);
    console.log('📁 Directory exists:', fs.existsSync(uploadDir));
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename like PHP backend
    const timestamp = Math.floor(Date.now() / 1000).toString(16); // Hex timestamp
    const randomString = Math.random().toString(36).substring(2, 8);
    const extension = path.extname(file.originalname);
    // Remove spaces and special characters from original filename to avoid URL encoding issues
    const cleanOriginalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `${timestamp}${randomString}_${cleanOriginalName}`;
    
    console.log('📄 Original filename:', file.originalname);
    console.log('📄 Generated filename:', filename);
    console.log('📄 File mimetype:', file.mimetype);
    
    cb(null, filename);
  }
});

// File filter for images
const imageFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images are allowed.'), false);
  }
};

// Configure upload middleware
const upload = multer({
  storage: storage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 1 // Single file upload
  }
});

// Single image upload
const uploadSingle = upload.single('image');

// Multiple image upload
const uploadMultiple = upload.array('images', 5);

// Error handling middleware for multer
const handleUploadError = (error, req, res, next) => {
  console.log('❌ Upload error occurred:', error);
  
  if (error instanceof multer.MulterError) {
    console.log('❌ Multer error code:', error.code);
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File too large',
        message: 'File size must be less than 50MB'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        error: 'Too many files',
        message: 'Maximum 5 files allowed'
      });
    }
  }
  
  if (error.message === 'Invalid file type. Only images are allowed.') {
    return res.status(400).json({
      success: false,
      error: 'Invalid file type',
      message: 'Only image files are allowed'
    });
  }
  
  console.error('Upload error:', error);
  return res.status(500).json({
    success: false,
    error: 'Upload failed',
    message: 'An error occurred during file upload'
  });
};

// Get relative file path for database storage
function getRelativeFilePath(filePath) {
  // Since we're saving directly to e-comm-images folder, just return the filename
  const path = require('path');
  return path.basename(filePath);
}

module.exports = {
  uploadSingle,
  uploadMultiple,
  handleUploadError,
  getRelativeFilePath
};