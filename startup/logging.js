const winston = require("winston");
require("winston-mongodb");
require("express-async-errors");


module.exports = () => {

    winston.handleExceptions(
      new winston.transports.Console({ colorize: true, prettyPrint: true }),
      new winston.transports.File({filename: "uncaughtExceptions.log"})
    )

    process.on("unhandledRejection", (ex) => {
       throw ex;
    });
      
      
      // Logovanie do suboru
      winston.add(winston.transports.File, { filename: "logfile.log" });

      // Logovanie do databazy
      // winston.add(winston.transports.MongoDB, { db: process.env.MONGO_DB });

};