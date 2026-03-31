const sharp = require('sharp');
const path = require('path');

const inputPath = path.join(__dirname, 'public', 'auth-img.png');
const outputPath = path.join(__dirname, 'public', 'auth-img.webp');

sharp(inputPath)
  .metadata()
  .then(metadata => {
    console.log('Original metadata:', metadata);
    return sharp(inputPath)
      .resize(1920) // Resize to max 1920px width
      .webp({ quality: 80 })
      .toFile(outputPath);
  })
  .then(info => {
    console.log('Optimization complete:', info);
  })
  .catch(err => {
    console.error('Optimization failed:', err);
  });
