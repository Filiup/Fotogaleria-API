const mongoose = require('mongoose');
const Joi = require('joi');

function imageModel(name) {
    const Image = mongoose.model(name, new mongoose.Schema({


    }));

    return Image;
}




module.exports.imageModel = imageModel;


