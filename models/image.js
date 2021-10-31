const mongoose = require('mongoose');
const Joi = require('joi');

function imageModel(name) {
    const Image = mongoose.model(name, new mongoose.Schema({
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



    }));

    return Image;
}


function validateSize(size) {
    const schema = {
        width: Joi.number().integer().min(200).max(2000).required(),
        height: Joi.number().integer().min(200).max(2000).required()

    };
    return Joi.validate(size, schema);
};


module.exports.imageModel = imageModel;
module.exports.validateSize = validateSize;

