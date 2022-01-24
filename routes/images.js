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
const { Gallery, validateSize } = require('../models/gallery');
const { resizeImage, removeImage } = require('../others/image_functions');
const exif = require('../others/exif');

// Funkcia, ktora porovna 2 polia
const equals = (a, b) => JSON.stringify(a) === JSON.stringify(b);


router.get("/:gallery", async (req, res) => {
    // Najprv pozrieme, že či daná galéria existuje, pokiaľ nie navrátime 400 Bad Request
    const images = await Gallery.findOne({name: req.params.gallery}).select("images -_id").lean();
    if (!images) return res.status(404).send("Daná galéria neexistuje.");


    res.send(images.images);

    
});

router.get("/:gallery/:id", async (req, res) => {

    // Kontrola, či sme zadali správne Id
    // Pokiaľ nie, navŕatime http status 400 Bad Request

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).send("Id ktoré si zadal je v nesprávnom tvare.");

    // Hľadáme galériu podľa mena, ktoré uživateľ zadal
    // Pokiaľ taká galéria neexistuje, navrátime status 404 Not Found

    const gallery = await Gallery.findOne({ name: req.params.gallery }).select("images -_id").lean();
    if (!gallery) return res.status(404).send("Daná galéria neexistuje.");

    // Kontrolujeme, či sa v galérii nachádza obrázok, ktorého id uživateľ zadal
    // Pokiaľ nie, navrátime 404 not found

    const image = gallery.images.find( image => image._id == req.params.id);
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
        const gallery = await Gallery.findOne({ name: req.params.gallery }).select("images").lean();
        if (!gallery) {
            removeImage(req.file.originalname);
            return res.status(404).send("Daná galéria neexistuje.");
        }

       // Pokiaľ sa obrázok v kolekcii už nachádza, navrátime 400 Bad Request
       const sameImage = gallery.images ? gallery.images.find( image => image.path == req.file.originalname) : false;
       if (sameImage) return res.status(400).send("Obrázok s týmto menom sa už v galérii nachádza.");

        // Exif data obrázka
        const exifData = await exif(resolve(`${process.env.IMAGE_FOLDER}${req.file.originalname}`));

        // Do kolekcie pridáme nový dokument obsahujúci údaje  obrázka

        const image = await Gallery.findOneAndUpdate(
            { name: req.params.gallery }, {
            $push: {
                images: {
                    path: req.file.originalname,
                    fullpath: `${req.params.gallery}/${req.file.originalname}`,
                    name: req.file.originalname.split(".")[0],

                    // Pokiaľ obrázok obsahuje exif dáta, tak sa uložia do DB, pokiaľ nie tak sa uloží: exif: null
                    exif: exifData != undefined ? exifData : null   
                }  
            }
        }, { safe: true, upsert: true, new: true }).select("images").lean();


        // Použivateľovi pošleme posledný obrázok z poľa obrazkkov
        // Posledný obrázok v poli je vždy ten, čo bol najnovšie pridaný
        res.send(image.images[ image.images.length -1]);  

    });
  
});

router.delete("/:gallery/:id", async (req, res) => {
    // Kontrola, či sme zadali správne Id
    // Pokiaľ nie, navŕatime http status 400 Bad Request
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).send("Id ktoré si zadal je v nesprávnom tvare.");

    // Hľadáme galériu podľa mena, ktoré uživateľ zadal
    // Pokiaľ taká galéria neexistuje, navrátime status 404 Not Found

    const gallery = await Gallery.findOne({ name: req.params.gallery }).select("images -_id").lean();
    if (!gallery) return res.status(404).send("Daná galéria neexistuje.");

    // Kontrolujeme, či sa v galérii nachádza obrázok, ktorého id uživateľ zadal
    // Pokiaľ nie, navrátime 404 not found

    // image nám navráti objekt obrázka, ktorý ideme odstraňovať
    const image = gallery.images.find( image => image._id == req.params.id);
    if (!image) return res.status(404).send("Daná fotografia sa v tejto galérii nenachádza.");

    await Gallery.findOneAndUpdate(
        {name: req.params.gallery},
        { $pull: { images: image }},
        { new : true }
    );

    /* V tomto kroku zabránime tomu, aby sa vymazal obrázok aj napriek tomu, ze sa nachádza aj v inej galérii*/

    // Nájdeme všetky galérie okrem tej, ktorú ideme zmazať, z údajov budeme selectovať len "images.path" (mená ich obrázkov)
    const images = await Gallery.find({name: {$ne: gallery.name}}).select("images.path -_id").lean();

    let names;
    // Pokiaľ sa v poly nenchádza len prázdny objekt
    if (!equals(images, [{}] )) {

        // pole "images" upravíme tak, aby sme dostali iba "1D" pole obsahujúce mená obrázkov všetkých galerií okrem tej, ktorú ideme zmazať
        // vyzerať bude daakto takto: ["image1.png", "image2.png", "image3.png"]
        names = images.map((image) => image.images.map(path => path.path) );
        names = [].concat(...names);
    } else names = [];
    
    // Zmazanie obrazka z priecinka, 
    // Obrázok zmažeme len vtedy, ked sa nenachádza v poly "names" (nenachádza sa ešte aj v inej galérii)
    if (!names.includes(image.path) ) removeImage(image.path); 
    res.send(image);

});

// Pokiaľ použivateľ nezadná meno galérie, pošleme mu http status status 404 (Not found) 
// Upozorníme ho, aby tak učinil

router.all("/", (req, res) => res.status(404).send("You must enter a gallery name."));


module.exports = router;


