const express = require("express");
const galeries = require("../routes/galleries");
const images = require("../routes/images");
const frontend = require("../routes/frontend")
const helmet = require("helmet");
const morgan = require("morgan");
const winston = require("winston");

// Middleware
const error = require("../middleware/error");
const cors = require("../middleware/cors");

module.exports = (app) => {
  app.use(express.json());
  app.use(helmet());

  if (app.get("env") === "development") {
    app.use(morgan("tiny"));
    winston.info("Morgan enabled ...");
  }

  app.use(cors);
  app.use("/", frontend);
  app.use("/api/galleries/images", images);
  app.use("/api/galleries", galeries);

  app.use(error);
};
