const express = require('express');
const { Gallery, validate, validateSize } = require('../models/gallery');
const mongoose = require('mongoose');

const { removeImage, resizeImage } = require('../others/image_functions');
const { resolve } = require('path');

const router = express.Router();

router.get("/", async (req, res) => {
    const galleries = await Gallery.find().sort("name").select("-images").lean();
    res.send(galleries);

});


router.get("/:id", async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).send("Id ktoré si zadal je v nesprávnom tvare.");

    // Metóda populate() nám z gallery.images poľa vytiahne prvý obrázok, kt. bude vždy náhľadový
    const gallery = await Gallery.findById(req.params.id).populate("images").lean();
    if (!gallery) return res.status(404).send("Gallery with the given id was not found");

    // gallery.images premenujeme na gallery.preview
    gallery.preview = gallery.images;
    delete gallery.images;
    
    // Pokiaľ nám metóda populate() navráti pole, tak preview vymažeme
    if (gallery.preview instanceof Array) delete gallery.preview;
    
    // Pokiaľ gallery.preview nie je nastavené, tak sa ako náhľadový obrázok nastaví default.jpg
    // Pokiaľ nie, tak sa ako náhľadový obrázok zobrazí ten, ktorý má daná galéria nastavený (Pre lepšie pochopenie si pozrite "Ternary operatori") 
    const image = `${process.env.IMAGE_FOLDER}${!gallery.preview ? "/../default.jpg" : gallery.preview.path}`;

     // Pokiaľ uživateľ zadal query string
    if (Object.keys(req.query).length) {
        // Pokiaľ uživateľ pošle query image=false, namiesto náhľadového obrázka sa mu zobrazia údaje daného dokumentu
        if (req.query.image === "false") return res.send(gallery);

        // Skontrolujeme, že či uživateľ zadal správne veľkosti
        const { error } = validateSize(req.query);
        if (error) return res.status(400).send(error.details[0].message);

        // Pokiaľ uživateľ poslal query string s výškou a zároveň šírkou, zmeníme veľkosť náhľ. obrázka
        const resizedImage = await resizeImage(image, parseInt(req.query.width), parseInt(req.query.height));

        // Pošleme náhľ. obrázok so zmenenou veľkosťou 
        // resizedImage je buffer, preto nastavujeme ContentType a poslielame binarne dáta
        res.contentType('image/jpeg');
        return res.end(resizedImage, 'binary');


    }

    // Pokiaľ uživateľ neposlal query string, tak mu pošleme náhľ. obrázok s pôvodnou veľkosťou
    res.sendFile(resolve(image));


});

router.post("/" ,async (req, res) => {
    // Skontrolujeme, či uživateľ poslal názov galérie v správnom tvare
    // Pokiaľ nie, tak navrátime 400 Bad Request

    const { error } = validate(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    // Skontrolujeme, či galéria s rovnakým menom už neexistuje
    // Pokiaľ áno, navrátime 400 Bad Request

    const galleryNames = await Gallery.find({name: req.body.name});
    if (galleryNames.length) return res.status(400).send("Galéria s týmto názvom už existuje.");    


    const gallery = new Gallery({
        name: req.body.name,
    });

    await gallery.save();

    res.send(gallery.toObject());


}); 

router.put("/:id", async (req, res) => {
    // Kontrola, či sme zadali správne Id
    // Pokiaľ nie, navŕatime http status 400 Bad Request
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).send("Id ktoré si zadal je v nesprávnom tvare.");

    // Kontrolujeme, že či uźivateľ zadal nové meno v správnom tvare 
    // Pokiaľ nie, navrátime 400 Bad request
    const { error } = validate(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    const params = {
        name: req.body.name
    };

    // Zmeníme meno galérie
    // Pokiaľ galéria s daným id neexistuje, navrátime 404 Not Found
    const gallery = await Gallery.findByIdAndUpdate(req.params.id, params, { new: true }).select("-images");
    if (!gallery) return  res.status(404).send("Gallery with the given id was not found.");
    res.send(gallery);



});

router.delete("/:id", async (req, res) => {

    // Kontrola, či sme zadali správne Id
    // Pokiaľ nie, navŕatime http status 400 Bad Request
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).send("Id ktoré si zadal je v nesprávnom tvare.");

    // Odstránime galériu
    // Pokiaľ galéria s daným id neexistuje, navrátime 404 Not Found
    const gallery = await Gallery.findByIdAndRemove(req.params.id).select("images").lean();
    if (!gallery) return res.status(404).send("Galéria s týmto id sa nenašla");


    // Zmažeme všetky obrázky, ktoré patria danej galérii
    gallery.images.forEach(image => {
        removeImage(`${process.env.IMAGE_FOLDER}${image.path}`, image.path);
    });
            
    res.send(gallery);

});


module.exports = router;
