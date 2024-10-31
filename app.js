const express = require("express");
const path = require("path");
const session = require("express-session");
const flash = require('connect-flash');
const passport = require("./config/passport");
const methodOverride = require('method-override');
const env = require("dotenv").config();
const MongoStore = require('connect-mongo');
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
    store: MongoStore.create({ 
        mongoUrl: process.env.MONGODB_URI,  
        collectionName: 'sessions'  
    }),
    cookie: {
        secure: false, 
        httpOnly: true,
        maxAge: 72 * 60 * 60 * 1000 
    }
}));

/* Debugging session middleware
app.use((req, res, next) => {
    console.log('Current session:', req.session);
    next();
});
*/

// Passport middleware (must come after session)
app.use(passport.initialize());
app.use(passport.session());



// Middleware to make user data available in all views
app.use((req, res, next) => {
    res.locals.user = req.user || null; 
    next();
});

// Disable caching to prevent caching of user-specific pages
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
});

// Flash middleware to store messages across redirects
app.use(flash());

// Make flash messages available in templates
app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error'); 
    next();
});

app.use(checkBlocked); // Middleware to check blocked users

// Set view engine and views directory
app.set("view engine", "ejs");
app.set("views", [path.join(__dirname, "views/user"), path.join(__dirname, "views/admin")]);

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Routes
const userRouter = require("./routes/userRouter");
const adminRouter = require("./routes/adminRouter");
//const razorpayRoutes = require("./routes/razorpayRoutes"); // Import Razorpay routes

app.use("/", userRouter);
app.use('/admin', adminRouter);
//app.use("/razorpay", razorpayRoutes); // Register Razorpay routes

// Database connection
db();

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// Start the server
const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = app;
