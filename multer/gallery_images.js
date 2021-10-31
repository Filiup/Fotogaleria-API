const multer = require('multer');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, process.env.IMAGE_FOLDER);
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname)
    }
});

const fileFilter = (req, file, cb) => {
    // Reject a file => cb(null, false);
    // Accept a file => cb(null, true);

    if (file.mimetype === "image/jpeg" || file.mimetype === "image/png") {
        cb(null, true);
    } else {
        cb(new Error("Server can store only PNG and JPEG image files."), false);
    }

}
const upload = multer({storage: storage, fileFilter: fileFilter, limits: {
    fileSize : 1024 * 1024 * parseInt(process.env.IMAGE_MAX_SIZE) // Môžme uploadovať obrázky s maximálnou veľkosťou IMAGE_MAX_SIZE (systemová premenná, .env)
}});


module.exports = upload;