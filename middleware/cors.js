
module.exports = (req, res, next) => {

    // Sem zadame URI aplikacie, ktorej dovolime posielat requesty na nase API
    // * => povolujeme posielanie reuqstov z kazdej jednej aplikacie
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Povolene REST metody
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

    // Povolene hlavicky
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

    // Odovzdanie kontroly dalsiemu middleware
    next();
};