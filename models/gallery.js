const mongoose = require('mongoose');
const Joi = require('joi');

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

    image: {
        type: new mongoose.Schema({
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
            }


        }, { _id : false }),
        default: null,
    }


}));

function validateGallery(gallery) {
    const schema = {
        name: Joi.string().min(3).max(15).invalid("gallery", "galleries", "log").required()
    }

    return Joi.validate(gallery, schema);
}




module.exports.Gallery = Gallery;
module.exports.validate = validateGallery;