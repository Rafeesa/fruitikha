const User = require('../models/userSchema');

const checkBlocked = async (req, res, next) => {
  try {
    if (req.session.userId) {
      // Find the logged-in user by ID stored in the session
      const user = await User.findById(req.session.userId);

      // If the user is blocked, destroy the session and redirect them
      if (user && user.isBlocked) {
        req.session.destroy((err) => {
          if (err) {
            console.error('Error destroying session:', err);
          }
          return res.redirect('/?blocked=true'); // Redirect to home or login page
        });
      } else {
        // If not blocked, continue to the next middleware
        next();
      }
    } else {
      // If no user is logged in, continue
      next();
    }
  } catch (error) {
    console.error('Error checking blocked status:', error);
    res.status(500).send('Internal Server Error');
  }
};

module.exports = checkBlocked;
