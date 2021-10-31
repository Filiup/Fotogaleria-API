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
const { imageModel, validateSize } = require('../models/image');
const { resizeImage, removeImage } = require('../others/image_functions');
const { updatePreviewImage, resetPreviewImage } = require('../others/previewImage');
const exif = require('../others/exif');



router.get("/:gallery", async (req, res) => {
    // Najprv pozrieme, že či daná galéria existuje, pokiaľ nie navrátime 400 Bad Request
    const galleryNames = await Gallery.find({ name: req.params.gallery });
    if (!galleryNames.length) return res.status(404).send("Daná galéria neexistuje.");

    // Pokiaľ áno, inicializujeme jej model kolekcie a navrátime jeho obsah
    const Image = mongoose.models[req.params.gallery] || imageModel(req.params.gallery);
    const images = await Image.find().sort("name").lean();

    res.send(images);

    
});

router.get("/:gallery/:id", async (req, res) => {

    // Kontrola, či sme zadali správne Id
    // Pokiaľ nie, navŕatime http status 400 Bad Request

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).send("Id ktoré si zadal je v nesprávnom tvare.");

    // Najprv pozrieme, že či daná galéria existuje, pokiaľ nie navrátime 400 Bad Request
    const galleryNames = await Gallery.find({ name: req.params.gallery });
    if (!galleryNames.length) return res.status(404).send("Daná galéria neexistuje.");

    // Pokiaľ galéria existuje, tak skontolujeme, že či sa v nej nachádza daná fotka, ktorú si chce uživateľ zobraziť
    // Modely kolekcie pri obrázky sa vytvárajú dynamicky pomocou funkcie imageModel()

    // Najprv skontrolujeme že či je daný model kolekcie už inicializovaný, pokiaľ nie tak ho inicializujeme
    // Pokiaľ kolekcia neexistuje tak sa sama vytvorí 
    const Image = mongoose.models[req.params.gallery] || imageModel(req.params.gallery);

    // V tomto kroku kontrolujeme, že či sa fotografia nachádza v danej galérii
    // Pokiaľ nie, navrátime 400 Bad Request
    
    const image = await Image.findById(req.params.id);
    if (!image) return res.status(400).send("Daná fotografia sa v tejto galérii nenachádza.");

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

        // Najprv skontrolujeme že či je daný model kolekcie už inicializovaný, pokiaľ nie tak ho inicializujeme
        // Pokiaľ kolekcia neexistuje tak sa sama vytvorí 
        const Image = mongoose.models[gallery] || imageModel(gallery);

        // Pokiaľ sa obrázok v kolekcii už nachádza, navrátime 400 Bad Request
        const imagePaths = await Image.find({path: req.file.originalname });
        if (imagePaths.length) return res.status(400).send("Obrázok s týmto menom sa už v galérii nachádza.");

        // Exif data obrázka
        const exifData = await exif(resolve(`${process.env.IMAGE_FOLDER}${req.file.originalname}`));

        // Do kolekcie pridáme nový dokument obsahujúci údaje ohľadom obrázka

        const image = new Image({
            path: req.file.originalname,
            fullpath: `${req.params.gallery}/${req.file.originalname}`,
            name: req.file.originalname.split(".")[0],

            // Pokiaľ obrázok obsahuje exif dáta, tak sa uložia do DB, pokiaľ nie tak sa uloží: exif: null
            exif: exifData != undefined ? exifData : null 
     
        });
        
        await image.save();


        // Zmenenie náhľadového obrázka pre danú galériu
        updatePreviewImage(galleryNames[0], Image);
     
        res.send(image.toObject());  

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



module.exports = router;


// TODO
// Skús zmazat ten debilný waring ktorý ti stále háže Node pri zapnutí aplikácie DONE

// Obrázok multer zapíše do priečinka, aj keď sme navratili 404ku (Pozri post handler), skús to opraviť DONE
// Napíš get a get:id  handler pre obrázky  DONE !!!!
// Napís Delete handler pre obrázky, môžu sa mazať pomocou ID DONE !!!
// Riadok 41 (tam kde je split metóda) uprav tak, aby si použil "extname" metódu knižnice path ZATIAĽ NEPOTREBNÉ
// Oprav fullpath parameter pri /images endpointe, zmeň v post requeste do co ukladas DONE

// Všade, kde ako parameter posielaš id, tak pomocou "mongoose.Types.ObjectId.isValid" over, či je v správnom tvare DONE
// Napíš kód pre GET "/:gallery/:image" tak, aby sa pomocou query string dalo nastavovať rozlisenie obrazka DONE
// Nastav limit veľkosti pre obrázky DONE
// Do image.js môžeš pridať a následne aj ukladať URL NEPOTREBNÉ

// Oprav blbosti ako napr put a delete request v /api/galleries DONE 

// Uprav GET request pre obrázok tak, aby namiesto mena obrázka stačilo ID, query parameter image=false namiesto obrázka zobrazí jeho údaje  DONE

// Urob funkciu, ktorej úlohou bude kontrolovať, či si do galérie pridal fotku, pokiaľ áno tak nech zoberie prvú a nastavý ju ako DONE
// náhľadový obrázok v kolekcii galleries DONE

// Urob get/:id handler v galleries.js pre zobrazovanie náhľadových obrázkov DONE
// Urob funkciu, ktorej úlohou bude kontrolovať či si nezmazal náhľadový obrázok, pokiaľ áno, tak nech v kolekcii galleries nastaví image na Null DONE
// V index.js pouvažuj nad zmenením routra z /api/images na /api/galleries/images DONE

// V súbore image_functions.js ošetri "throw err"; DONE
// použi nejaký error logger (winston.js) DONE
// Urob menší refactoring  
// EXIF !!!!! DONE

// Dôkladne otestuj celé API a na základe toho oprav bugy