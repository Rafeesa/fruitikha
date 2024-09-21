const express = require("express");
const path = require("path");
const session = require("express-session");
const flash = require('connect-flash');
const passport = require("./config/passport");
const methodOverride = require('method-override');
const env = require("dotenv").config();
const db = require("./config/db");
const checkBlocked = require('./middlewares/checkBlocked');


const app = express();

// Middleware for JSON and URL-encoded form data
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

app.use((req, res, next) => {
    console.log('Current session:', req.session);
    next();
});


// Passport middleware (initialized after session)
app.use(passport.initialize());
app.use(passport.session());

// Flash middleware
app.use(flash());

// Disable caching (to prevent caching of user-specific pages)
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
});

// Make flash messages available in templates
app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error'); // Add this to capture Passport error flash messages
    next();
});

// Middleware to make user data available in all views
app.use((req, res, next) => {
    res.locals.user = req.user || null; // Set user data from Passport, or null if not logged in
    next();
});

// Debugging: Check if req.user is set
// app.use((req, res, next) => {
//     console.log("Logged in user:", req.user); // For development/debugging purposes
//     next();
// });
app.use(checkBlocked);
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
