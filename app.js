const express = require("express");
const path = require("path");
const session = require("express-session");
const methodOverride = require('method-override');
const env = require("dotenv").config();
const db = require("./config/db");

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: false, // Set to true if using HTTPS
        httpOnly: true,
        maxAge: 72 * 60 * 60 * 1000 // 72 hours
    }
}));

// Disable caching
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
});

// Set view engine and views directory
app.set("view engine", "ejs");
app.set("views", [path.join(__dirname, "views/user"), path.join(__dirname, "views/admin")]);

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Routes
const userRouter = require("./routes/userRouter");
const adminRouter = require("./routes/adminRouter");
app.use("/", userRouter);
app.use('/admin', adminRouter);

// Database connection
db();

// Start server
const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Error handling middleware (optional)
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

module.exports = app;
