const { Gallery } = require('../models/gallery');

async function deletePreviewImage(galleryName) {
    // Pomocou metódy updateOne zmeníme v dokumente s daným menom hodnotu "image" na null
    await Gallery.updateOne({name: galleryName}, {
        $unset: {
            preview: 1
        }
    });

}


async function updatePreviewImage(galleryName, image) {
    if (!image) return;
    await Gallery.findOneAndUpdate({name : galleryName}, {
        preview:  {
            path: image.path,
            fullpath: image.fullpath,
            name: image.name,
            uploaded: image.uploaded
        } 
    });
};
  


module.exports.updatePreviewImage = updatePreviewImage;
module.exports.deletePreviewImage = deletePreviewImage;

  