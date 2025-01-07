const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin/adminController');
const customerController = require('../controllers/admin/customerController');
const categoryController = require('../controllers/admin/categoryController');
const productController = require('../controllers/admin/productController');
const orderController = require('../controllers/admin/orderController');
const couponController = require('../controllers/admin/couponController');
const salesReportController = require('../controllers/admin/salesReportController');

const upload = require('../middlewares/multerConfig');
const { adminAuth } = require('../middlewares/auth');

//login management
router.get('/login', adminController.loadLogin);
router.post('/login', adminController.login);
router.get('/', adminAuth, adminController.loadDashboard);
router.get('/getChartData', adminAuth, adminController.getChartData);
router.get('/logout', adminController.logout);

//customer management
router.get('/users', adminAuth, customerController.customerInfo);
router.get('/blockCustomer', adminAuth, customerController.customerBlocked);
router.get('/unblockCustomer', adminAuth, customerController.customerunBlocked);

//category management
router.get('/Category', adminAuth, categoryController.getAllCategories);
router.get(
  '/categories/new',
  adminAuth,
  categoryController.showNewCategoryForm
);
router.post('/categories', adminAuth, categoryController.createCategory);
router.post(
  '/addCategoryOffer',
  adminAuth,
  categoryController.addCategoryOffer
);
router.post(
  '/removeCategoryOffer',
  adminAuth,
  categoryController.removeCategoryOffer
);
router.get('/editCategory', adminAuth, categoryController.showEditCategoryForm);
router.put('/editCategory/:id', adminAuth, categoryController.updateCategory);
router.delete('/categories/:id', adminAuth, categoryController.deleteCategory);

//Product Management
router.get('/Product', adminAuth, productController.getAllProduct);
router.get('/products/new', adminAuth, productController.showNewProductForm);
router.post(
  '/addProducts',
  adminAuth,
  upload.array('images', 3),
  productController.addProducts
);
router.get('/editProduct', adminAuth, productController.getEditProduct);
router.put(
  '/editProduct/:id',
  adminAuth,
  upload.array('images', 3),
  productController.editProduct
);
router.post('/deleteImage', adminAuth, productController.deleteSingleImage);
router.delete('/product/:id', adminAuth, productController.deleteProduct);
router.post('/addProductOffer', adminAuth, productController.addProductOffer);
router.post(
  '/removeProductOffer',
  adminAuth,
  productController.removeProductOffer
);

//order Management
router.get('/orders', adminAuth, orderController.getAllOrders);
//router.put('/orders/:id/item-status', orderController.updateOrderStatus);
router.put('/orders/:id/item/status', orderController.updateItemStatus);

router.delete('/orders/:id/delete', orderController.deleteOrder);

//coupon management
router.get('/coupon', couponController.getCouponPage);
router.get('/coupon/add', couponController.getAddCouponPage);
router.post('/coupon/add', couponController.createCoupon);
router.delete('/coupons/:code', couponController.deleteCoupon);

//sales report management
router.get('/sales-report', salesReportController.getSalesReport);
router.get(
  '/download-sales-report-pdf',
  salesReportController.downloadSalesReportPDF
);
router.get(
  '/download-sales-report-excel',
  salesReportController.downloadSalesReportExcel
);

module.exports = router;
