const Razorpay = require('razorpay');
const Address = require('../../models/addressSchema');
const Cart = require('../../models/cartSchema');
const Product = require('../../models/productSchema');
const User = require('../../models/userSchema');
const Order = require('../../models/orderSchema');

const crypto = require('crypto');
require('dotenv').config();
const { body, validationResult } = require('express-validator');

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_SECRET,
});
const calculateSalePrice = (product) => {
  const categoryOffer = product.category?.categoryOffer || 0;
  const productOffer = product.productOffer || 0;

  const categoryDiscount = (product.price * categoryOffer) / 100;
  const productDiscount = (product.price * productOffer) / 100;

  const maxDiscount = Math.max(categoryDiscount, productDiscount);

  // Return the rounded sale price
  return Math.round(product.price - maxDiscount);
};

// Create Razorpay order
const createOrder = async (req, res) => {
  try {
    const { amount, addressId } = req.body;
    const userId = req.user._id;

    // Fetch cart with populated product details
    const cart = await Cart.findOne({ userId }).populate('items.productId');
    if (!cart || !cart.items.length) {
      return res.status(400).json({
        success: false,
        message: 'Cart is empty',
      });
    }

    // Calculate final amounts
    const orderItems = cart.items.map((item) => ({
      productId: item.productId._id,
      quantity: item.quantity,
      price: item.productId.price,
      salePrice: calculateSalePrice(item.productId),
    }));

    const subtotal = orderItems.reduce(
      (sum, item) => sum + item.salePrice * item.quantity,
      0
    );
    const shippingCost = cart.shippingCost || 45;
    const discountAmount = req.session.discountAmount || 0;
    const finalTotal = subtotal + shippingCost - discountAmount;

    // Create Razorpay order
    const razorpayOrder = await razorpay.orders.create({
      amount: finalTotal * 100, // Convert to paise
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
      payment_capture: 1,
    });

    // Store order details in session for verification
    req.session.pendingOrder = {
      orderItems,
      subtotal,
      shippingCost,
      discountAmount,
      finalTotal,
      addressId,
      razorpayOrderId: razorpayOrder.id,
    };

    res.json({
      success: true,
      orderId: razorpayOrder.id,
      key_id: process.env.RAZORPAY_KEY_ID,
      amount: finalTotal * 100,
    });
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to create order',
      error: error.message,
    });
  }
};

const createreOrder = async (req, res) => {
  try {
    const { orderID } = req.body;

    const existingOrder = await Order.findOne({
      orderID,
      paymentStatus: { $in: ['payment pending', 'payment failed'] },
    });

    if (!existingOrder) {
      return res.status(404).json({
        success: false,
        message: 'Order not found or payment already completed',
      });
    }

    const razorpayInstance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_SECRET,
    });

    // Create new Razorpay order
    const razorpayOrder = await razorpayInstance.orders.create({
      amount: existingOrder.totalCost * 100,
      currency: 'INR',
      receipt: `receipt_${existingOrder.orderID}`,
      notes: {
        originalOrderId: existingOrder.orderID.toString(),
      },
    });

    // Update existing order with new Razorpay orderId
    existingOrder.orderId = razorpayOrder.id;
    existingOrder.paymentStatus = 'payment pending';
    await existingOrder.save();

    res.json({
      success: true,
      paymentDetails: {
        id: razorpayOrder.id,
        amount: existingOrder.totalCost * 100,
      },
      key_id: process.env.RAZORPAY_KEY_ID,
      orderID: existingOrder.orderID,
    });
  } catch (error) {
    console.error('Error in createReOrder:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
// Verify payment route
const verifyPayment = async (req, res) => {
  try {
    const { paymentId, orderId, signature, addressId, paymentMethod } =
      req.body;

    const userId = req.session.passport?.user;
    if (!userId) {
      return res
        .status(400)
        .json({ success: false, message: 'User not found' });
    }

    // Fixed signature verification
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    if (generatedSignature !== signature) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature',
      });
    }

    // Get cart and address
    const cart = await Cart.findOne({ userId }).populate('items.productId');
    if (!cart || !cart.items.length) {
      return res.status(400).json({
        success: false,
        message: 'Cart is empty',
      });
    }
    console.log('cart :', cart);
    console.log('hai');
    const address = await Address.findOne({ userId });
    if (!address || address.address.length === 0) {
      return res.status(400).send('No address found');
    }

    console.log('address', address);
    // Calculate totals
    let subtotal = 0;
    const orderItems = cart.items.map((item) => {
      const salePrice = calculateSalePrice(item.productId);
      subtotal += salePrice * item.quantity;

      return {
        productId: item.productId._id,
        quantity: item.quantity,
        price: item.productId.price,
        salePrice: salePrice,
        status: 'OrderPlaced', // Set initial status for each item
      };
    });

    const shippingCost = cart.shippingCost || 45;
    const discountAmount = req.session.discountAmount || 0;
    const totalCost = subtotal + shippingCost - discountAmount;

    // Create order
    const orderID = Math.floor(100000 + Math.random() * 900000);
    const newOrder = new Order({
      userId,
      orderID,
      items: orderItems,
      address: address,
      subtotal,
      shippingCost,
      totalCost,
      status: 'OrderPlaced',
      paymentMethod: 'Razorpay',
      paymentStatus: 'success',
    });

    await newOrder.save();
    console.log('Order created:', newOrder._id); // Debug log

    req.session.orderDetails = {
      orderId: orderID,
      totalCost,
      orderItems,
      shippingCost,
      subtotal,
      discountAmount,
      paymentMethod: newOrder.paymentMethod,
    };

    // Update stock and clear cart
    for (const item of cart.items) {
      await Product.findByIdAndUpdate(item.productId._id, {
        $inc: { stock: -item.quantity },
      });
    }

    await Cart.deleteOne({ userId });
    delete req.session.discountAmount;

    res.status(200).json({
      success: true,
      message: 'Payment verified and order created successfully',
      orderId: orderID,
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};
const verifyRepayment = async (req, res) => {
  try {
    const { paymentId, orderId, signature, orderID } = req.body;

    if (!paymentId || !orderId || !signature || !orderID) {
      return res.status(400).json({
        success: false,
        message: 'Missing required payment details',
      });
    }

    const existingOrder = await Order.findOne({ orderID }).populate({
      path: 'items.productId',
      populate: {
        path: 'category',
        select: 'categoryOffer',
      },
    });

    if (!existingOrder) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    if (generatedSignature === signature) {
      // Update order items with recalculated sale prices
      existingOrder.items = existingOrder.items.map((item) => ({
        ...item,
        salePrice: calculateSalePrice(item.productId),
      }));

      existingOrder.paymentId = paymentId;
      existingOrder.paymentStatus = 'success';
      existingOrder.status = 'order placed';
      await existingOrder.save();

      return res.status(200).json({
        success: true,
        message: 'Payment verified successfully',
      });
    }

    return res.status(400).json({
      success: false,
      message: 'Payment verification failed',
    });
  } catch (error) {
    console.error('Error in verifyRepayment:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};
const paymentFailure = async (req, res) => {
  const { error, orderId } = req.body;
  const userId = req.user._id;

  try {
    const cart = await Cart.findOne({ userId }).populate({
      path: 'items.productId',
      populate: {
        path: 'category',
        select: 'categoryOffer',
      },
    });

    if (!cart || !cart.items.length) {
      return res.status(400).json({
        success: false,
        message: 'Cart is empty',
      });
    }

    const address = await Address.findOne({ userId });
    if (!address || address.address.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No address found',
      });
    }

    let subtotal = 0;
    const orderItems = cart.items.map((item) => {
      if (!item.productId) {
        throw new Error('Product not found in cart');
      }

      const salePrice = calculateSalePrice(item.productId);
      const itemTotal = salePrice * item.quantity;
      subtotal += itemTotal;

      return {
        productId: item.productId._id,
        quantity: item.quantity,
        price: item.productId.price,
        salePrice: salePrice,
        status: 'OrderPlaced',
      };
    });

    const shippingCost = cart.shippingCost || 45;
    const totalCost = subtotal + shippingCost;

    const newOrder = new Order({
      userId,
      orderID: Math.floor(100000 + Math.random() * 900000),
      orderId,
      items: orderItems,
      address: address.address[0],
      subtotal,
      shippingCost,
      totalCost,
      paymentStatus: 'payment pending',
      paymentMethod: 'Online Payment',
      status: 'payment pending',
    });

    await newOrder.validate();
    const savedOrder = await newOrder.save();
    await Cart.deleteOne({ userId });

    res.status(200).json({
      success: true,
      message: 'Order created with payment pending status',
      orderId: newOrder.orderID,
    });
  } catch (err) {
    console.error('Error handling payment failure:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Internal server error',
      details: err.errors
        ? Object.keys(err.errors).map((key) => ({
            field: key,
            message: err.errors[key].message,
          }))
        : undefined,
    });
  }
};
module.exports = {
  createOrder,
  verifyPayment,
  paymentFailure,
  createreOrder,
  verifyRepayment,
};
