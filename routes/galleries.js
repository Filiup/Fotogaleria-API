const express = require("express");
const { Gallery, validate, validateSize } = require("../models/gallery");
const mongoose = require("mongoose");
const { isEmpty } = require("lodash");

const { removeImage, resizeImage } = require("../others/image_functions");
const { resolve } = require("path");

const router = express.Router();


router.get("/", async (req, res) => {
  const galleries = await Gallery.find().select("-images").lean();
  res.send(galleries);
});

router.get("/:id", async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id))
    return res.status(400).send("Id ktoré si zadal je v nesprávnom tvare.");

  
  // Skontrolujeme, či galéria s daným id existuje
  // Pokial nie tak navrátime 404 not found
  const gallery = await Gallery.findById(req.params.id).lean();
  if (!gallery)
    return res.status(404).send("Gallery with the given id was not found");
  
  // Nahradime preview """foreign Key""" obrázkom, ktorý mu prináleží 
  if (gallery.preview)
    gallery.preview = gallery.images.find(image => image._id.toString() == gallery.preview.toString());
  
  // Pokiaľ gallery.preview nie je nastavené, tak sa ako náhľadový obrázok nastaví default.jpg
  // Pokiaľ nie, tak sa ako náhľadový obrázok zobrazí ten, ktorý má daná galéria nastavený (Pre lepšie pochopenie si pozrite "Ternary operatori")
  const image = `${process.env.IMAGE_FOLDER}${
    !gallery.preview ? "/../default.jpg" : gallery.preview.path
  }`;

  // Pokiaľ uživateľ zadal query string
  if (Object.keys(req.query).length) {
    // Pokiaľ uživateľ pošle query image=false, namiesto náhľadového obrázka sa mu zobrazia údaje daného dokumentu
    if (req.query.image === "false") return res.send(gallery);

    // Skontrolujeme, že či uživateľ zadal správne veľkosti
    const { error } = validateSize(req.query);
    if (error) return res.status(400).send(error.details[0].message);

    // Pokiaľ uživateľ poslal query string s výškou a zároveň šírkou, zmeníme veľkosť náhľ. obrázka
    const resizedImage = await resizeImage(
      image,
      parseInt(req.query.width),
      parseInt(req.query.height)
    );

    // Pošleme náhľ. obrázok so zmenenou veľkosťou
    // resizedImage je buffer, preto nastavujeme ContentType a poslielame binarne dáta
    res.contentType("image/jpeg");
    return res.end(resizedImage, "binary");
  }

  // Pokiaľ uživateľ neposlal query string, tak mu pošleme náhľ. obrázok s pôvodnou veľkosťou
  res.sendFile(resolve(image));
});

router.post("/", async (req, res) => {
  // Skontrolujeme, či uživateľ poslal názov galérie v správnom tvare
  // Pokiaľ nie, tak navrátime 400 Bad Request

  const { error } = validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  // Skontrolujeme, či galéria s rovnakým menom už neexistuje
  // Pokiaľ áno, navrátime 400 Bad Request

  const galleryNames = await Gallery.find({ name: req.body.name });
  if (galleryNames.length)
    return res.status(400).send("Galéria s týmto názvom už existuje.");

  const gallery = new Gallery({
    name: req.body.name,
  });

  await gallery.save();

  res.send(gallery.toObject());
});

router.put("/:id", async (req, res) => {
  // Kontrola, či sme zadali správne Id
  // Pokiaľ nie, navŕatime http status 400map(el => el.gogo.filter(path => !isEmpty(path) ))adal je v nesprávnom tvare.");

  // Kontrolujeme, že či uźivateľ zadal nové meno v správnom tvare
  // Pokiaľ nie, navrátime 400 Bad request
  const { error } = validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  // Skontrolujeme, či galéria s rovnakým menom už neexistuje
  // Pokiaľ áno, navrátime 400 Bad Request

  const galleryNames = await Gallery.find({ name: req.body.name });
  if (galleryNames.length)
    return res.status(400).send("Galéria s týmto názvom už existuje.");

  const params = {
    name: req.body.name,
  };

  // Zmeníme meno galérie
  // Pokiaľ galéria s daným id neexistuje, navrátime 404 Not Found
  const gallery = await Gallery.findByIdAndUpdate(req.params.id, params, {
    new: true,
  }).select("-images");
  if (!gallery)
    return res.status(404).send("Gallery with the given id was not found.");
  res.send(gallery);
});

router.delete("/:id", async (req, res) => {
  // Kontrola, či sme zadali správne Id
  // Pokiaľ nie, navŕatime http status 400 Bad Request
  if (!mongoose.Types.ObjectId.isValid(req.params.id))
    return res.status(400).send("Id ktoré si zadal je v nesprávnom tvare.");

  // Odstránime galériu
  // Pokiaľ galéria s daným id neexistuje, navrátime 404 Not Found
  const gallery = await Gallery.findByIdAndRemove(req.params.id).lean();
  if (!gallery) return res.status(404).send("Galéria s týmto id sa nenašla");



  /* V tomto kroku zabránime tomu, aby sa vymazal obrázok aj napriek tomu, ze sa nachádza aj v inej galérii*/

  // Nájdeme všetky galérie okrem tej, ktorú ideme zmazať, z údajov budeme selectovať len "images.path" (mená ich obrázkov)
  let images = await Gallery.find({name: {$ne: gallery.name}}).select("images.path -_id").lean();
  let names = [];

  // Pokiaľ nie sú všetky objekty v poly images prázdne (ostatné galérie majú obrázky)
  if (!images.every(image => isEmpty(image))) {
    // Pokiaľ pole images obsahuje nejaké objekty ktoré nemajú "images" property (daktoré galérie nemajú obrázky), tak ich vyfiltrujeme preč
    images = images.filter(image => image.hasOwnProperty("images"));
    //
    
    // pole "images" upravíme tak, aby sme dostali iba "1D" pole obsahujúce mená obrázkov všetkých galerií okrem tej, ktorú ideme zmazať
    // vyzerať bude daakto takto: ["image1.png", "image2.png", "image3.png"]

    names = images.map((image) => image.images.map(path => path.path) );
    names = [].concat(...names);
  
  } 

  // Zmažeme všetky obrázky, ktoré patria danej galérii
  if (gallery.images instanceof Array) {
    gallery.images.forEach((image) => {
      // Obrázok zmažeme len vtedy, ked sa nenachádza v poly "names" (nenachádza sa ešte aj v inej galérii)
      if (!names.includes(image.path) )
        removeImage(image.path);
    });
  }

  res.send(gallery);
});

module.exports = router;
