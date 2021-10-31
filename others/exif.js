const exifr = require('exifr');
const winston = require('winston');

const exifInfo = [
    "Make", 
    "Model", 
    "FileSource", 
    "ExifImageWidth", 
    "ExifImageHeight", 
    "FocalLength", 
    "FNumber", 
    "ShutterSpeedValue", 
    "ISO", 
    "Flash", 
    "DateTimeOriginal", 
    "CreateDate",
    "GPSLatitude",
    "GPSLongitude"

];
module.exports = image => exifr.parse(image, exifInfo)
    .then(output => output)
    .catch(err => winston.error(err, err));

