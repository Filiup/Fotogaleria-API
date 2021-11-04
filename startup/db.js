const mongoose = require('mongoose');
const winston = require('winston');

module.exports = () => {
    mongoose.connect(process.env.MONGO_DB, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => winston.info('Connected to MongoDB...'))
  
    mongoose.set('useFindAndModify', false);
  
    // Zakážeme, aby driver mnogoose menil mená kolekcií automaticky do plurálu (Mohlo by to robiť problémi )
    // Chceme aby meno vytvorenej kolekcie bolo rovnaké ako názov galérie
    mongoose.pluralize(null);
  
};
