const express = require('express');
const galeries = require("../routes/galleries");
const images = require("../routes/images");
const error = require('../middleware/error');
const helmet = require('helmet');
const morgan = require('morgan');
const winston = require('winston');


module.exports = app => {

    app.use(express.json());
    app.use(helmet());

    if (app.get('env') === "development") {
        app.use(morgan("tiny"));
        winston.info("Morgan enabled ...");
      }
      
    app.use("/api/galleries", galeries);
    app.use("/api/galleries/images", images);
    app.use(error);

}
