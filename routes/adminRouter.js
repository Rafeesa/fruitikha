const express=require("express")
const router=express.Router()
const adminController=require("../controllers/admin/adminController")
const customerController=require("../controllers/admin/customerController")
const categoryController=require("../controllers/admin/categoryController")
const productController =require("../controllers/admin/productController");


const upload = require('../middlewares/multerConfig'); 
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



//Product Management
router.get('/Product',adminAuth,productController.getAllProduct);
router.get('/products/new', adminAuth, productController.showNewProductForm);
router.post('/addProducts',adminAuth,upload.array("images",3),productController.addProducts)
router.get("/editProduct",adminAuth,productController.getEditProduct)
router.post("/editProduct/:id",adminAuth,upload.array("images",3),productController.editProduct)
router.post("/deleteImage",adminAuth,productController.deleteSingleImage)
router.delete("/product/:id", adminAuth, productController.deleteProduct);





module.exports=router
