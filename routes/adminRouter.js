const express=require("express")
const router=express.Router()
const adminController=require("../controllers/admin/adminController")
const customerController=require("../controllers/admin/customerController")
const categoryController=require("../controllers/admin/categoryController")
const productController =require("../controllers/admin/productController");
const { upload } = require('../middlewares/upload');

const {userAuth,adminAuth}=require("../middlewares/auth")






//login management
router.get("/login",adminController.loadLogin)
router.post("/login",adminController.login)
router.get("/",adminAuth,adminController.loadDashboard)

//customer management
router.get("/users",adminAuth,customerController.customerInfo)
router.get("/blockCustomer",adminAuth,customerController.customerBlocked)
router.get("/unblockCustomer",adminAuth,customerController.customerunBlocked)

//category management
 router.get('/Category',adminAuth,categoryController.getAllCategories);
 
// Show form to create a new category
router.get('/categories/new', adminAuth, categoryController.showNewCategoryForm);

// Handle form submission to create a new category
router.post('/categories', adminAuth, categoryController.createCategory);


// Show edit form for a category
router.get('/editCategory', adminAuth, categoryController.showEditCategoryForm);

// Update a category
router.post("/editCategory/:id", adminAuth, categoryController.updateCategory);


// Delete a category
router.delete('/categories/:id', adminAuth, categoryController.deleteCategory);










module.exports=router
