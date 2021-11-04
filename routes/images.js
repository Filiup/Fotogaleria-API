const express = require('express');
const mongoose = require('mongoose');
const winston = require('winston');

const router = express.Router();

// Multer 
const multer = require('multer');
const config = require('../multer/gallery_images');
const upload = config.single("image");


const { resolve } = require('path');

// Vlastné moduly
const { Gallery } = require('../models/gallery');
const { resizeImage, removeImage } = require('../others/image_functions');
const { updatePreviewImage, resetPreviewImage } = require('../others/previewImage');
const exif = require('../others/exif');



router.get("/:gallery", async (req, res) => {
    // Najprv pozrieme, že či daná galéria existuje, pokiaľ nie navrátime 400 Bad Request
    const images = await Gallery.find({name: req.params.gallery}).select("images -_id").lean();
    if (!images.length) return res.status(404).send("Daná galéria neexistuje.");


    res.send(images[0].images);

    
});

router.get("/:gallery/:id", async (req, res) => {

    // Kontrola, či sme zadali správne Id
    // Pokiaľ nie, navŕatime http status 400 Bad Request

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).send("Id ktoré si zadal je v nesprávnom tvare.");

    // Hľadáme galériu podľa mena, ktoré uživateľ zadal
    const gallery = await Gallery.findOne({ name: req.params.gallery }).select("images -_id").lean();

    // Pokiaľ taká galéria neexistuje, navrátime status 404 Not Found
    if (!gallery) return res.status(404).send("Daná galéria neexistuje.");

    // Kontrolujeme, či sa v galérii nachádza obrázok, ktorého id uživateľ zadal
    const image = gallery.images.find( image => image._id == req.params.id);

    // Pokiaľ nie, navrátime 404 not found
    if (!image) return res.status(404).send("Daná fotografia sa v tejto galérii nenachádza.");

   
    // Pokiaľ existuje galéria a zároveň obsahuje aj daný obrázok, tak obrázok zobrazíme

    const imagePath = `${process.env.IMAGE_FOLDER}${image.path}`; // Priecinok kde sa nachadzaju obrazky + meno obrazka

   
    // Pokiaľ uživateľ zadal query string
    if (Object.keys(req.query).length) {
        // Pokiaľ uživateľ pošle query image=false, namiesto obrázka sa mu zobrazia jeho údaje v databáze
        if (req.query.image === "false") return res.send(image);

        // Skontrolujeme, že či uživateľ zadal správne veľkosti
        const { error } = validateSize(req.query);
        if (error) return res.status(400).send(error.details[0].message);

        // Pokiaľ uživateľ poslal query string s výškou a zároveň šírkou, zmeníme veľkosť obrázka
        const resizedImage = await resizeImage(imagePath, parseInt(req.query.width), parseInt(req.query.height));

        // Pošleme obrázok so zmenenou veľkosťou 
        // resizedImage je buffer, preto nastavujeme ContentType a poslielame binarne dáta
        res.contentType('image/jpeg');
        return res.end(resizedImage, 'binary');
    }

    // Pokiaľ uživateľ neposlal query string, tak mu pošleme obrázok s pôvodnou veľkosťou
    res.sendFile(resolve(imagePath));

    
})



// Form data
router.post("/:gallery" ,async (req, res) => {
    const gallery = req.params.gallery;

    // Middleware, ktorý nám do Request objektu pribalí file a uloźi za nás obrázok do priečinka
    upload(req, res, async err => {
        // Error patriaci knižnici multer
        if (err instanceof multer.MulterError) {
            winston.error(err.message, err);
            return res.status(400).send(err.message);
        }

        // Neznámy error ( error ktorý nepatrí knižnici multer )
        // Môže byť náš vlastný ( New Error() )
        else if (err) {
            winston.error(err.message, err);
            return res.status(400).send(err.message);
        }
        
        // Skontrolujeme, či galéria ktorú uživateľ zadal ako :id existuje, pokiaľ nie navrátime 404 Not Found a odstránime obrázok, ktorý middleware nahral
        const galleryNames = await Gallery.find({ name: gallery });
        if (!galleryNames.length) {
            removeImage(`${process.env.IMAGE_FOLDER}${req.file.originalname}`, req.file.originalname);
            return res.status(404).send("Daná galéria neexistuje.");
        }

        // Pokiaľ sa obrázok v kolekcii už nachádza, navrátime 400 Bad Request
        const imagePaths = await Gallery.findOne({"images.path": req.file.originalname });
        if (imagePaths) return res.status(400).send("Obrázok s týmto menom sa už v galérii nachádza.");

        // Exif data obrázka
        const exifData = await exif(resolve(`${process.env.IMAGE_FOLDER}${req.file.originalname}`));

        // Do kolekcie pridáme nový dokument obsahujúci údaje  obrázka

        const image = await Gallery.findOneAndUpdate(
            { name: gallery }, {
            $push: {
                images: {
                    path: req.file.originalname,
                    fullpath: `${req.params.gallery}/${req.file.originalname}`,
                    name: req.file.originalname.split(".")[0],

                    // Pokiaľ obrázok obsahuje exif dáta, tak sa uložia do DB, pokiaľ nie tak sa uloží: exif: null
                    exif: exifData != undefined ? exifData : null   
                }  
            }
        }, { safe: true, upsert: true, new: true }).select("images -_id").lean();



        // Zmenenie náhľadového obrázka pre danú galériu
        // Funkcii posielame vždy prvý obrázok z poľa
        updatePreviewImage(req.params.gallery, image.images[0]);

        // Použivateľovi pošleme posledný obrázok z poľa obrazkkov
        // Posledný obrázok v poli je vždy ten, čo bol najnovšie pridaný
        res.send(image.images[ image.images.length -1]);  

    });
  
});

router.delete("/:gallery/:id", async (req, res) => {
    // Najprv pozrieme, že či daná galéria existuje, pokiaľ nie navrátime 400 Bad Request
    const galleryNames = await Gallery.find({ name: req.params.gallery });
    if (!galleryNames.length) return res.status(404).send("Daná galéria neexistuje."); 

    // Kontrola, či sme zadali správne Id
    // Pokiaľ nie, navŕatime http status 400 Bad Request
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).send("Id ktoré si zadal je v nesprávnom tvare.");

    // inicializacia  modelu kolekcie (podrobnejšie vysvetlené vyššie v kóde)
    const Image = mongoose.models[req.params.gallery] || imageModel(req.params.gallery);

    // Obrázkok, ktorý musíme vymazať z priečinka

    // Pozieme sa, že či sa dané Id v galérii nachádza
    // Pokiaľ nie, navrátime 404 Not Found

    const fileToRemove = await Image.findById(req.params.id);
    if (!fileToRemove) return res.status(404).send("Obrázok s týmto Id sa v tejto galérii nenachádza");

    // Cesta k súboru, .path obsahuje meno súboru
    const pathToFile = `${process.env.IMAGE_FOLDER}${fileToRemove.path}`;


    // Zmažeme dokument s daným id
    const image = await Image.findByIdAndRemove(req.params.id);
    

    // Funkcia, ktorá vymaže obrázok z priečinka
    removeImage(pathToFile, fileToRemove.path);

    // Funkcia, ktorá resetne náhľadový obrázok galérie 
    resetPreviewImage(galleryNames[0], req.params.gallery, fileToRemove, Image);


    res.send(image);



});

// Pokiaľ uźivateľ nezadná meno galérie, pošleme mu http status status 404 (Not found) 
// Upozorníme ho, aby tak učinil

router.all("/", (req, res) => res.status(404).send("You must enter a gallery name."));


module.exports = router;


