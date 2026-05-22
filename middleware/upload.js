// middleware/upload.js
// Multer configuration for file uploads (event banners, profile pics)
// Created by Ayush

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Use memory storage to be compatible with read-only filesystems on hosting services like Render
const storage = multer.memoryStorage();

// Check file type helper (only images)
function checkFileType(file, cb) {
  const filetypes = /jpeg|jpg|png|webp|gif/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Error: Only images are allowed! (jpeg, jpg, png, webp, gif)'));
  }
}

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    checkFileType(file, cb);
  }
});

module.exports = upload;
