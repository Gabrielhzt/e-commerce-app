const express = require('express');
const app = express();
const cors = require("cors");
const pool = require("./db");

app.use(cors());
app.use(express.json());

const port = process.env.PORT || 3000;

//ROUTES//



app.listen(port, () => {
    console.log(`Server has started on port ${port}`);
});