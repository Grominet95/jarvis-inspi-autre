const fs = require('fs');
const https = require('https');
const path = require('path');

// Ensure public directory exists
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Generate icons using online service
const generateIcon = (name, size, text) => {
  const url = `https://ui-avatars.com/api/?name=${text}&size=${size}&background=0D47A1&color=FFFFFF&format=png`;
  const filePath = path.join(publicDir, name);
  
  const file = fs.createWriteStream(filePath);
  https.get(url, (response) => {
    response.pipe(file);
  });
  
  console.log(`Generated: ${name}`);
};

// Create icons - Updated to use 'J' for JARVIS instead of 'G' for Gideon
generateIcon('favicon.ico', 64, 'J');
generateIcon('logo192.png', 192, 'J');
generateIcon('logo512.png', 512, 'J');

console.log('Icons generated successfully!');
