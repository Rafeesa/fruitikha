const User = require('../models/userSchema');


const userAuth = async (req, res, next) => {
  try {
    if (req.session.user || req.isAuthenticated()) {
      const userId = req.session.user || req.user._id;
      const user = await User.findById(userId);

      if (user && !user.isBlocked) {
        req.currentUser = user;
        return next();
      }
      console.log('User blocked or not found');
      return res.redirect('/login');
    }
    console.log('No authentication found');
    return res.redirect('/login');
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).send('Server error');
  }
};
const adminAuth = (req, res, next) => {
  User.findOne({ isAdmin: true })
    .then((data) => {
      if (data) {
        next();
      } else {
        res.redirect('/admin/login');
      }
    })
    .catch((error) => {
      console.log('Error in adminauth middleware');
      res.status(500).send('internal server error');
    });
};

module.exports = {
  userAuth,
  adminAuth,
};
