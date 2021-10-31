const { Gallery } = require('../models/gallery');

async function deletePreviewImage(galleryName) {
    // Pomocou metódy updateOne zmeníme v dokumente s daným menom hodnotu "image" na null
    await Gallery.updateOne({name: galleryName}, {
        $set: {
            image: null
        }
    });

}


async function updatePreviewImage(gallery, imageModel) {
    // Z databázy vytiahneme všetky obrázky pre daný ImageModel a potom z nich vyberieme len ten prvý ( Prvý obrázok bude vždy náhľadový )
    const images = await imageModel.find().lean().select("-_id -__v"); 
    const previewImage = images[0];
  
    // Pokiaľ daná galéria obsahuje aspoň jeden obrázok, tak zmeníme jej náhľadový obrázok 
    if (images.length) {
        await Gallery.findByIdAndUpdate(gallery._id, {
            image: {
                path: previewImage.path,
                fullpath: previewImage.fullpath,
                name: previewImage.name,
                uploaded: previewImage.uploaded
            }
        }, { new: true });
    
    }
  
  };
  
async function resetPreviewImage(galleryModel, galleryName, imageDocument, imageModel) {
    const GalleryPreview = galleryModel.image;
  
    // Pokiaľ sa meno náhľadového obrázku v galérii rovná menu obrázku v jej kolekcii, ktorý ideme vymazať, tak to znamená, že náhľadový obrázok bol vymazaný
  
    if (GalleryPreview.path === imageDocument.path) {
        // Zmažeme náhľadový obrázok
        deletePreviewImage(galleryName);
        
        // Zavoláme funkciu updatePreviewImage kvôli tomu, aby sa zmenil náhľadový obrázok na iný
        // ( pokiaľ kolekcia galérie obsahuje ešte nejaké fotky, pokiaľ nie tak ostane hodnota null )
        updatePreviewImage(galleryModel, imageModel);
  
  
    };
  
}

module.exports.updatePreviewImage = updatePreviewImage;
module.exports.resetPreviewImage = resetPreviewImage;

  