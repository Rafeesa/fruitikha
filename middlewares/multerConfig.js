// middlewares/multerConfig.js
const multer = require('multer');
const path = require('path');

// Set up storage engine
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../public/uploads')); // Save files in /uploads directory
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname); // Append timestamp to original filename
  }
});

// Initialize upload middleware
const upload = multer({ storage: storage });

module.exports = upload;
