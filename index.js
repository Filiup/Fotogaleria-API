require('dotenv').config();
const express = require('express');
const { existsSync, mkdirSync } = require('fs');

// Pokiaľ neexistuje priečinok pre fotky galerii, tak ho vytvorime
if (!existsSync(process.env.IMAGE_FOLDER)) {
    mkdirSync(process.env.IMAGE_FOLDER, { recursive: true });
}

const app = express();

require("./startup/logging")();
require("./startup/routes")(app);
require("./startup/db")();


const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Listening on port ${port}...`));