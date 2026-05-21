// utils/qrGenerator.js
// Tool to generate QR codes for tickets.
// Teammate's note: We are storing the QR code as a Base64 Data URL, which can be directly shown in <img> tags! So smart.

const QRCode = require('qrcode');

/**
 * Generates a QR Code as a Data URL (base64 image)
 * @param {string} text The ticket code/ID to encode
 * @returns {Promise<string>} Base64 image string
 */
async function generateQRCode(text) {
  try {
    // Generate QR code with options
    const url = await QRCode.toDataURL(text, {
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      width: 250,
      margin: 1
    });
    return url;
  } catch (err) {
    console.error('Error generating QR code:', err);
    // Fallback: Just return a dummy placeholder QR URL
    return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(text)}`;
  }
}

module.exports = {
  generateQRCode
};
