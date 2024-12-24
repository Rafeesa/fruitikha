const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const LocalStrategy = require('passport-local').Strategy;
const User = require('../models/userSchema');
const bcrypt = require('bcrypt');
const env = require('dotenv').config();

// Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: '/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user already exists with Google ID
        let user = await User.findOne({ googleId: profile.id });

        if (user) {
          // User found, return the user
          return done(null, user);
        } else {
          // Check if email already exists (signed up manually)
          let existingUser = await User.findOne({ email: profile.emails[0].value });

          if (existingUser) {
            // Update existing user's googleId
            existingUser.googleId = profile.id;
            await existingUser.save();
            return done(null, existingUser);
          } else {
            // Create a new user if no match found
            user = new User({
              name: profile.displayName,
              email: profile.emails[0].value,
              googleId: profile.id,
            });
            await user.save();
            return done(null, user);
          }
        }
      } catch (error) {
        return done(error, null);
      }
    }
  )
);


// Local Strategy
passport.use(
  new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password',
    },
    async (email, password, done) => {
      try {
        const user = await User.findOne({ email });
        if (!user) {
          return done(null, false, { message: 'Incorrect email.' });
        }
        if (user.isBlocked) {
          return done(null, false, { message: 'User is blocked by admin.' });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          return done(null, false, { message: 'Incorrect password.' });
        }
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  )
);

// Serialize user into the session
passport.serializeUser((user, done) => {
  console.log('Serializing user:', user._id);
  done(null, user._id);
});

// Deserialize user from the session
passport.deserializeUser((id, done) => {
  User.findById(id)
    .then((user) => {
      // console.log('Deserializing user:', user);
      done(null, user);
    })
    .catch((err) => {
      done(err, null);
    });
});

module.exports = passport;
