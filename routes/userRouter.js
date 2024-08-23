const express=require("express")
const router=express.Router()
const userController =require("../controllers/user/userController")

//homepage
router.get("/",userController.loadHomepage)

//sign up management
router.get("/signup",userController.loadSignup)
router.post("/signup",userController.signup)
router.post("/verify-otp",userController.verifyOtp)
router.post("/resend-otp",userController.resendOtp)



router.get("/login",userController.loadLogin)
router.post("/login",userController.login)




module.exports=router 