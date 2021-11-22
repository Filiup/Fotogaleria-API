const sharp = require('sharp');
const { unlink } = require('fs');
const winston = require("winston");
const sizeOf = require('image-size');


const imageSize = (imagePath) => {
    return new Promise((resolve, reject) => {
        sizeOf(imagePath, (err, dimensions) => {
            resolve({
                width: dimensions.width, 
                height: dimensions.height
              });
        });
    });

}


async function resizeImage(image, width, height) {

    const originalSize = await imageSize(image);

    // Pokial nebol zadany rozmer, tak si ho dopocitame
    if (!width) width = height/originalSize.height * originalSize.width;
    else if (!height) height = width/originalSize.width * originalSize.height;

     
    let resizedPhoto;
    

    await sharp(image)
      .resize({ width: parseInt(width), height: parseInt(height), fit: 'fill' })
      .toBuffer()
      .then(data => resizedPhoto = data );

    return resizedPhoto;

};

function removeImage(name) {
  const path = `${process.env.IMAGE_FOLDER}${name}`;
  
  unlink(path, function(err) {
      if (err) {
        winston.error(`${name} was not removed: ${err.message}`, err);
      } else {
        winston.info(`Successfully deleted the image with the name "${name}".`);
      }
  });

}




module.exports.resizeImage = resizeImage;
module.exports.removeImage = removeImage;
