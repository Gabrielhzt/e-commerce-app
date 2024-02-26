const express = require('express');
const app = express();
const cors = require("cors");
const pool = require("./db");
const bcrypt = require('bcrypt');
const saltRounds = 10;

app.use(cors());
app.use(express.json());

const port = process.env.PORT || 3000;

//ROUTES//

app.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Hash the password before saving it to the database
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Insert the new user into the database
        const newUser = await pool.query(
            'INSERT INTO users (username, hashed_password) VALUES ($1, $2) RETURNING *',
            [username, hashedPassword]
        );

        res.json(newUser.rows[0]);
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Server Error');
    }
});

app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Retrieve the user from the database by username
        const user = await pool.query('SELECT * FROM users WHERE username = $1', [username]);

        if (user.rows.length === 0) {
            return res.status(401).json('Invalid Credentials');
        }

        // Compare the provided password with the hashed password in the database
        const validPassword = await bcrypt.compare(password, user.rows[0].hashed_password);

        if (!validPassword) {
            return res.status(401).json('Invalid Credentials');
        }

        res.json('Login successful!');
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Server Error');
    }
});





app.listen(port, () => {
    console.log(`Server has started on port ${port}`);
});