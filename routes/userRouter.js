const express = require('express');
const router = express.Router();
const userController = require('../controllers/user/userController');
const passport = require('passport');
//const checkBlocked = require("../middlewares/checkBlocked");
const profileController = require('../controllers/user/profileController');
const cartController = require('../controllers/user/cartController');
const checkoutController = require('../controllers/user/checkoutController');
const razorpayController = require('../controllers/user/razorpayController');
const walletController = require('../controllers/user/walletController');
const wishlistController = require('../controllers/user/wishlistController');
const orderController = require('../controllers/user/orderController');
const couponController = require('../controllers/user/couponController');
const { userAuth } = require('../middlewares/auth');

//homepage
router.get('/', userController.loadHomepage);
router.get(
  '/user/product-details/:id',
  userAuth,
  userController.getProductDetails
);
router.get('/shop', userController.getShop);

//sign up management
router.get('/signup', userController.loadSignup);
router.post('/signup', userController.signup);
router.get('/checkReferral', userController.checkReferralCode);
router.post('/verify-otp', userController.verifyOtp);
router.post('/resend-otp', userController.resendOtp);

router.get(
  '/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);
router.get(
  '/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/signup' }),
  (req, res) => {
    res.redirect('/');
  }
);

router.get('/login', userController.loadLogin);
router.post('/login', userController.login);
router.get('/logout', userController.logout);

// profile
router.get('/forgot-password', profileController.getForgotPassPage);
router.get('/profile', profileController.getProfile);

router.post('/forgot-email-valid', profileController.forgotEmailValid);
router.post('/verify-passForgot-otp', profileController.verifyForgotPassOtp);
router.get('/reset-password', profileController.getResetPassPage);
router.post('/resend-forgot-otp', profileController.resendOtp);
router.post('/reset-password', profileController.postNewPassword);

//Edit account
router.put('/update-profile', profileController.updateProfile);

//razorpay
router.post('/create-razorpay-order', razorpayController.createOrder);
router.post('/verify-payment', razorpayController.verifyPayment);
router.post('/payment-failure', razorpayController.paymentFailure);
router.post('/create-razorpay-reorder', razorpayController.createreOrder);
router.post('/verify-repayment', razorpayController.verifyRepayment);

//wallet
router.get('/wallet', walletController.getWallet);
router.post('/wallet-payment', walletController.payWithWallet);

//wishlist
router.get('/wishlist', wishlistController.getWishlist);
router.post('/addToWishlist', wishlistController.addToWishlist);
//router.delete('/removeWishlist/:id',wishlistController.removeWishlist)
router.delete('/removeWishlist/:productId', wishlistController.removeWishlist);

//myOrder
router.get('/myOrder', orderController.getOrders);
router.post('/order/return/:id', orderController.handleReturnRequest);
router.post('/order/cancel', profileController.cancelOrder);
router.get('/order/details/:orderId', orderController.getOrderDetails);

//coupon management
router.post('/couponapply', couponController.applyCoupon);
//router.post('/deleteCoupon',couponController.deleteCoupon)

//address management
router.get('/add-new-address', profileController.getAddNewAddress);
router.post('/my-address', profileController.addNewAddress);
router.get('/edit-address/:id', profileController.getEditAddressForm);
router.put('/edit-address/:id', profileController.editAddress);
router.delete('/delete-address/:id', profileController.deleteAddress);

//cart management
router.get('/cart', cartController.getCartPage);
router.post('/cart/add', cartController.addToCart);
router.post('/cart/remove', cartController.removeFromCart);
router.post('/cart/update', cartController.updateCartQuantity);

//checkout management
router.get('/checkout', checkoutController.getCheckoutPage);
router.post('/place-order', checkoutController.placeOrder);
router.get('/orderSuccess', checkoutController.getOrderSuccessPage);
router.get('/order/invoice/:id', orderController.getInvoicePdf);

//changepassword
router.post('/changePassword', profileController.changePassword);

router.get('/available', couponController.availableCoupon);

module.exports = router;
