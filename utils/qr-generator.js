



const QRCode = require('qrcode');


async function generateQRCode(text) {
  try {
    
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
    
    return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(text)}`;
  }
}

module.exports = {
  generateQRCode
};
