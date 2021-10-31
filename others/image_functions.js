const sharp = require('sharp');
const { unlink } = require('fs');
const winston = require("winston");


async function resizeImage(image, width, height) {
    let resizedPhoto;

    await sharp(image)
      .resize({ width: width, height: height, fit: 'fill' })
      .toBuffer()
      .then(data => resizedPhoto = data );

    return resizedPhoto;

};

function removeImage(path, name) {
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
