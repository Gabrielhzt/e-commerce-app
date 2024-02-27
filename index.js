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

//get all products
app.get("/products", async (req, res) => {
    try {
        const allProduct = await pool.query("SELECT * FROM products");
        res.json(allProduct.rows);
    } catch (err) {
        console.error(err.message);
    }
});

//get a product

app.get("/products/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const product = await pool.query("SELECT * FROM products WHERE product_id = $1", [id]);

        res.json(product.rows[0]);
    } catch (err) {
        console.error(err.message);
    }
})

//get account info
app.get("/account/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const account = await pool.query("SELECT username FROM users WHERE user_id = $1", [id]);

        res.json(account.rows[0])
    } catch (err) {
        console.error(err.message);
    }
})

//update account info
app.put("/account/update/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { username } = req.body;

        const updateAccount = await pool.query(
            "UPDATE users SET username = $1 WHERE user_id = $2 RETURNING *",
            [username, id]
        );

        if (updateAccount.rows.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json({ message: "Your username was updated!", updatedUser: updateAccount.rows[0] });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Server Error" });
    }
});

//delete account
app.delete("/account/delete/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const deleteUser = await pool.query("DELETE FROM users WHERE user_id = $1", [id]);

        if (deleteUser.rowCount === 0) {
            // No user found with the given ID
            return res.status(404).json({ error: "User not found" });
        }

        // Successful deletion
        res.json({ message: "Your account was successfully deleted" });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Server Error" });
    }
});


//get cart
app.get('/order-details/:order_id', async (req, res) => {
    try {
        const { order_id } = req.params;
        
        // Retrieve order details based on the order_id
        const orderDetails = await pool.query(
            'SELECT * FROM orderdetails WHERE order_id = $1',
            [order_id]
        );

        res.json(orderDetails.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server Error' });
    }
});


//create cart
app.post("/cart/create", async (req, res) => {
    try {
        const { user_id } = req.body;
        const cart = await pool.query("INSERT INTO orders (user_id) VALUES ($1)", [user_id]);

        res.json("Your cart is created!")
    } catch (err) {
        console.error(err.message);
    }
});



//add products in the cart
app.post('/cart/add-product', async (req, res) => {
    try {
        const { user_id, product_id, quantity } = req.body;

        // Check if there's an open order for the user
        const openOrder = await pool.query(
            'SELECT order_id FROM orders WHERE user_id = $1 AND status = $2',
            [user_id, 'open']
        );

        let order_id;

        if (openOrder.rows.length > 0) {
            // If open order exists, use its order_id
            order_id = openOrder.rows[0].order_id;
        } else {
            // If no open order, create a new one and retrieve order_id
            const newOrder = await pool.query(
                'INSERT INTO orders (user_id, status) VALUES ($1, $2) RETURNING order_id',
                [user_id, 'open']
            );
            order_id = newOrder.rows[0].order_id;
        }

        // Insert the product into orderdetails using the retrieved order_id
        await pool.query(
            'INSERT INTO orderdetails (product_id, quantity, order_id) VALUES ($1, $2, $3)',
            [product_id, quantity, order_id]
        );

        res.json({ message: 'Product added to order successfully', order_id });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server Error' });
    }
});

//delete product in the cart
app.delete("/cart/delete-product", async (req, res) => {
    try {
        const {product_id} = req.body;
        const deleteproduct = await pool.query("DELETE FROM orderdetails WHERE product_id = $1", [product_id]);

        res.json("The product was succesfully deleted!");
    } catch (err) {
        console.error(err.message);
    }
});

//Validate the order
app.put("/cart/order/:order_id", async (req, res) => {
    try {
        const { order_id } = req.params;
        const validate = await pool.query("UPDATE orders SET status = 'close' WHERE order_id = $1", [order_id]);

        res.json("Your order is validated");
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server Error' });
    }
});

//See all the past order
app.get("/past-order/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const allOrder = await pool.query("SELECT * FROM orders WHERE user_id = $1", [id]);

        res.json(allOrder.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server Error' });
    }
});



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

        res.json("Your account is created");
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