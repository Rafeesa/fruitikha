const express=require("express")
const router=express.Router()
const userController =require("../controllers/user/userController")
const passport = require("passport")
const checkBlocked = require("../middlewares/checkBlocked");
const profileController=require("../controllers/user/profileController")
const cartController=require("../controllers/user/cartController")
const checkoutController=require("../controllers/user/checkoutController")
const razorpayController=require("../controllers/user/razorpayController")





//homepage
router.get("/",userController.loadHomepage)
router.get('/user/product-details/:id',checkBlocked,userController.getProductDetails);
router.get('/shop',checkBlocked,userController.getShop)

//sign up management
router.get("/signup",userController.loadSignup)
router.post("/signup",userController.signup)
router.post("/verify-otp",userController.verifyOtp)
router.post("/resend-otp",userController.resendOtp)

router.get('/auth/google',passport.authenticate('google',{scope:['profile','email']}))
router.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:'/signup'}),(req,res)=>{
    res.redirect('/')
})

router.get("/login",userController.loadLogin)
router.post("/login",userController.login)
router.get("/logout",userController.logout)


// profile 
router.get('/forgot-password',profileController.getForgotPassPage)
router.get('/profile', profileController.getProfile);

router.post('/forgot-email-valid',profileController.forgotEmailValid)
router.post("/verify-passForgot-otp",profileController.verifyForgotPassOtp)
router.get("/reset-password",profileController.getResetPassPage)
router.post("/resend-forgot-otp",profileController.resendOtp)
router.post("/reset-password",profileController.postNewPassword)

//Edit account
router.put('/update-profile',profileController.updateProfile)

//ordermanagement

router.post('/order/cancel/:id', profileController.cancelOrder);

//razorpay
router.post('/create-order', razorpayController.createOrder);
router.post('/verify-payment', razorpayController.verifyPayment);



//address management
router.get('/add-new-address', profileController.getAddNewAddress);
router.post('/my-address',profileController.addNewAddress);
router.get('/edit-address/:id', profileController.getEditAddressForm);
router.put('/edit-address/:id',profileController.editAddress)
router.delete('/delete-address/:id', profileController.deleteAddress);




//cart management
router.get('/cart',checkBlocked,cartController.getCartPage);
router.post('/cart/add',cartController.addToCart)
router.post('/cart/remove', cartController.removeFromCart);
router.post('/cart/update', cartController.updateCartQuantity);  


//checkout management
router.get('/checkout',checkoutController.getCheckoutPage)
router.post('/place-order',checkoutController.placeOrder);




//changepassword
router.post('/changePassword',profileController.changePassword)




module.exports=router 