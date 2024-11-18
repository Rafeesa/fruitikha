const Razorpay = require('razorpay');
const Address = require('../../models/addressSchema');
const Cart = require('../../models/cartSchema');
const Product = require('../../models/productSchema');
const User = require("../../models/userSchema");
const Order=require("../../models/orderSchema")

const crypto = require('crypto');
require('dotenv').config(); 
const { body, validationResult } = require('express-validator');

// Initialize Razorpay instance
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_SECRET,
});

// Create Razorpay order
const createOrder = async (req, res) => {
    console.log("Order Request Body:", req.body); 

    // Validate amount field
    await body('amount')
        .isNumeric().withMessage('Amount must be a number')
        .run(req);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
        const { amount, paymentMethod } = req.body;
        console.log("amount passing",amount)

        if (paymentMethod === "cashOnDelivery") {
            return res.json({ success: true, message: "Order placed successfully with Cash on Delivery." });
        }

        const options = {
            
            amount: amount, 
            currency: "INR",
            receipt: `receipt_${Date.now()}`,
            payment_capture: 1,
        };

        const order = await razorpay.orders.create(options);
        console.log('Order Created:', order); 

        res.json({
            success: true,
            orderId:order.id,
            key_id: process.env.RAZORPAY_KEY_ID 
        });
    } catch (error) {
        console.error("Error creating Razorpay order:", error);
        res.status(500).json({
            success: false,
            message: "Unable to create order",
            error: error.message // Send error details for easier debugging
        });
    }
};

// Verify Razorpay payment
/*const verifyPayment = async(req, res) => {
    const {  orderId, paymentId, signature } = req.body;
console.log("razorpay signature",signature)
    console.log("Payment Verification Body:", req.body); 

    try {
        const generatedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_SECRET)
            .update(`${orderId}|${paymentId}`)
            .digest('hex');

        if (generatedSignature === signature) {
            const userId = req.session.userId; // Assuming user is stored in session
            console.log(userId)

      // Fetch user's cart
      const cart = await Cart.findOne({ userId });
      if (!cart) return res.status(400).send({ success: false, message: 'Cart not found' });

      // Create the new order
      const newOrder = new Order({
        userId,
        orderId: orderId,
        paymentId: paymentId,
        amount: cart.totalCost,
        items: cart.items,
        addressId: addressId, // Save the address used
        paymentStatus: 'Paid',
        orderStatus: 'Processing',
      });

      const savedOrder = await newOrder.save();

      // Clear the cart after order is placed
      await Cart.deleteOne({ userId });

      // Save order details to session
      req.session.orderDetails = {
        orderId: savedOrder._id,
        totalCost: cart.totalCost,
        orderItems: cart.items,
        shippingCost: cart.shippingCost || 0, // Add shipping cost logic
        subtotal: cart.subtotal || 0 // Add subtotal logic
      };
            console.log("Payment Verified:", generatedSignature);

            return res.json({ success: true, message: "Payment verified successfully" });
        } else {
            console.warn("Payment Verification Failed:", { generatedSignature, signature });
            return res.status(400).json({ success: false, message: "Payment verification failed" });
        }
    } catch (error) {
        console.error("Error during payment verification:", error);
        res.status(500).json({
            success: false,
            message: "Payment verification error",
            error: error.message 
        });
    }
};
*/
// Verify payment route
const verifyPayment = async (req, res) => {
  try {
    const { paymentId, orderId, signature, paymentMethod } = req.body; // Include paymentMethod in request
    const userId = req.user._id;

    // Fetch the user's cart with the items populated
    const cart = await Cart.findOne({ userId }).populate('items.productId');
    const address = await Address.findOne({ userId });

    // Validate the address
    if (!address || address.address.length === 0) {
      return res.status(400).send('No address found');
    }

    // Calculate total cost from cart items
    const subtotal = cart.items.reduce((acc, item) => {
      return acc + item.productId.salePrice * item.quantity;
    }, 0);

    const shippingCost = cart.shippingCost || 45; // Assign default or calculated shipping cost
    const totalCost = subtotal + shippingCost;

    // Verify the payment signature
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    if (generatedSignature === signature) {
      // Calculate discount amount based on subtotal
let discountAmount = 0;
if (subtotal > 150 && subtotal < 500) {
    discountAmount = 50;
} else if (subtotal > 500) {
    discountAmount = 100;
}

// Apply discount to totalCost
const finalTotal = totalCost - discountAmount;

      // Create the new order
      const newOrder = new Order({
        userId,
        orderId,
        paymentId,
        amount: finalTotal, // Use final total after discount
        shippingCost,
        subtotal,
        totalCost: finalTotal, // Store final total with discount applied
        discountAmount, // Store discount amount for reference
        address: address.address[0],
        items: cart.items,
        paymentStatus: 'Paid',
        paymentMethod: paymentMethod || 'Online Payment',
        status: 'order placed',
    });
    

      // Save the new order to the database
      const savedOrder = await newOrder.save();

      // Clear the user's cart after order placement
      await Cart.deleteOne({ userId });

      // Save order details to the session
      req.session.orderDetails = {
        orderId: savedOrder._id,
        totalCost: finalTotal,
        orderItems: cart.items,
        shippingCost,
        subtotal,
        discountAmount, // Add discountAmount to session
        paymentMethod: newOrder.paymentMethod
    };
    
      return res.status(200).json({ success: true, message: 'Payment verified and order created successfully' });
    } else {
      res.status(400).json({ success: false, message: 'Payment verification failed' });
    }
  } catch (err) {
    console.error('Payment verification error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const paymentFailure=async(req, res) => {
  const { error, orderId } = req.body;

  // Log the error details in a database or file
  console.error(`Payment failed for Order ID ${orderId}:`, error);

  // Respond to the client
  res.status(200).json({ success: true, message: 'Payment failure logged successfully.' });
};


module.exports = {
    createOrder,
    verifyPayment,
    paymentFailure
};
