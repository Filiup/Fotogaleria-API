const mongoose = require('mongoose');
const Joi = require('joi');

const imageSchema = new mongoose.Schema({
    path: {
        type: String,
        minlength: 3,
        trim: true,
        required: true
    },

    fullpath: {
        type: String,
        minlength: 5,
        trim: true,
        required: true
    },

    name: {
        type: String,
        minlength: 3,
        trim: true,
        required: true
    },

    uploaded: {
        type: Date,
        default: Date.now()
    },

    exif: {
        type: Object,
        default: null
    }
});


const Gallery = mongoose.model("Gallery", new mongoose.Schema({
    name: {
        type: String,
        minlength: 3,
        maxlength: 15,
        trim: true,
        required: true

    },
    created: {
        type: Date,
        default: Date.now()
    },


    images: {
        type: imageSchema
    }


}));

function validateGallery(gallery) {
    const schema = {
        name: Joi.string().min(3).max(15).required()
    }

    return Joi.validate(gallery, schema);
}

function validateSize(size) {
    const schema = {
        width: Joi.number().integer().min(200).max(2000).required(),
        height: Joi.number().integer().min(200).max(2000).required()

    };
    return Joi.validate(size, schema);
};





module.exports.Gallery = Gallery;
module.exports.validate = validateGallery;
module.exports.validateSize = validateSize;