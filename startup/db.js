const mongoose = require('mongoose');
const winston = require('winston');

module.exports = () => {
    mongoose.connect(process.env.MONGO_DB, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => winston.info('Connected to MongoDB...'))
  
    mongoose.set('useFindAndModify', false);

};
