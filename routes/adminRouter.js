const express=require("express")
const router=express.Router()
const adminController=require("../controllers/admin/adminController")
const customerController=require("../controllers/admin/customerController")
const categoryController=require("../controllers/admin/categoryController")
const productController =require("../controllers/admin/productController");
const orderController = require('../controllers/admin/orderController');


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
 router.get('/categories/new', adminAuth, categoryController.showNewCategoryForm);
 router.post('/categories', adminAuth, categoryController.createCategory);
 router.get('/editCategory', adminAuth, categoryController.showEditCategoryForm);
 router.put("/editCategory/:id", adminAuth, categoryController.updateCategory);
 router.delete('/categories/:id', adminAuth, categoryController.deleteCategory);



//Product Management
router.get('/Product',adminAuth,productController.getAllProduct);
router.get('/products/new', adminAuth, productController.showNewProductForm);
router.post('/addProducts',adminAuth,upload.array("images",3),productController.addProducts)
router.get("/editProduct",adminAuth,productController.getEditProduct)
router.put("/editProduct/:id",adminAuth,upload.array("images",3),productController.editProduct)
router.post("/deleteImage",adminAuth,productController.deleteSingleImage)
router.delete("/product/:id", adminAuth, productController.deleteProduct);

//order Management
router.get('/orders',adminAuth,orderController.getAllOrders)
router.put('/orders/:id/status',orderController.updateOrderStatus)
router.delete('/orders/:id/delete', orderController.deleteOrder);




module.exports=router
