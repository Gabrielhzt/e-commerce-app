const Pool = require("pg").Pool;

const pool = new Pool({
    user: "gabrielhzt",
    password: "abc123",
    host: "localhost",
    port: 5432,
    database: "e-commerce"
});

module.exports = pool;