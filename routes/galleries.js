const express = require('express');
const { Gallery, validate } = require('../models/gallery');
const mongoose = require('mongoose');

const { imageModel, validateSize } = require('../models/image');
const { removeImage, resizeImage } = require('../others/image_functions');
const { resolve } = require('path');

const winston = require("winston");

const router = express.Router();

router.get("/", async (req, res) => {
    const galleries = await Gallery.find().sort("name").lean();
    res.send(galleries);

});


router.get("/:id", async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).send("Id ktoré si zadal je v nesprávnom tvare.");

    const gallery = await Gallery.findById(req.params.id);
    if (!gallery) return res.status(404).send("Gallery with the given id was not found");

    // Pokiaľ gallery.image == null, tak sa ako náhľadový obrázok nastaví default.jpg
    // Pokiaľ nie, tak sa ako náhľadový obrázok zobrazí ten, ktorý má daná galéria nastavený (Pre lepšie pochopenie si pozrite "Ternary operatori") 
    const image = `${process.env.IMAGE_FOLDER}${gallery.image == null ? "/../default.jpg" : gallery.image.path}`;

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

    // Údaje galérie, ktorú ideme upraviť ( potrebujeme údaj "name" aby sme vedeli upraviť aj meno jej kolekcie )
    const galleryData = await Gallery.findById(req.params.id);
    if (!galleryData) return res.status(404).send("Gallery with the given id was not found.");


    const { error } = validate(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    const params = {
        name: req.body.name
    };

    const gallery = await Gallery.findByIdAndUpdate(req.params.id, params, { new: true });

    mongoose.connection.db.collection(galleryData.name).rename(req.body.name)
        .then(() => winston.info(`Collection "${galleryData.name}" was sucessfully renamed to "${req.body.name}"`))
        .catch(err => winston.error(`Collection was not renamed: ${err.message}`, err)) 

    res.send(gallery);



});

router.delete("/:id", async (req, res) => {

    // Kontrola, či sme zadali správne Id
    // Pokiaľ nie, navŕatime http status 400 Bad Request
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).send("Id ktoré si zadal je v nesprávnom tvare.");

    // Údaje galérie, ktorú ideme zmazať ( potrebujeme údaj "name" aby sme vedeli zmazať jej kolekciu )
    const galleryData = await Gallery.findById(req.params.id);
    if (!galleryData) return res.status(404).send("Galéria s týmto id sa nenašla");
    
    const gallery = await Gallery.findByIdAndRemove(req.params.id);

    // Inicializujeme kolekciu obrázkov pre danú gelériu (Potrebujeme z nej získať mená obrázkov )
    const Image = mongoose.models[galleryData.name] || imageModel(galleryData.name);

    // Všetok obsah kolekcie obrázkov danej galérie 
    const images = await Image.find().lean();

    // Zmažeme všetky obrázky, ktoré patria danej galérii
    images.forEach(image => {
        removeImage(`${process.env.IMAGE_FOLDER}${image.path}`, image.path);
    });
            

    // Zmažeme kolekciu obrázkov danej gálerie
    Image.collection.drop()
        .then(() => winston.info(`Collection with the name of "${galleryData.name}" was sucessfully dropped.`))
        .catch((err) => winston.error(`Colllection was not dropped: ${err.message}`, err)); 


    res.send(gallery);

});


module.exports = router;
