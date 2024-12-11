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
        console.log("hai",req.body)
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


const createreOrder = async (req, res) => {
  try {
    const { orderID, amount } = req.body;

    console.log('Received orderID:', orderID);
    console.log('Received amount:', amount);

    if (!orderID || !amount) {
      throw new Error('Missing orderID or amount in the request body');
    }

    // Fetch the existing order using the provided orderID
    const existingOrder = await Order.findOne({ orderID });
    console.log("existing order=......", existingOrder);

    if (!existingOrder) {
      return res.status(404).json({
        success: false,
        message: 'Order not found. Cannot process repayment.',
      });
    }

    let razorpayOrderID = existingOrder.razorpayOrderID;

    // Create a new Razorpay order if none exists or it's expired
    if (!razorpayOrderID || isExpired(razorpayOrderID)) {
      const razorpayInstance = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_SECRET,
      });

      console.log("Amount sent to Razorpay (in paise):", existingOrder.totalCost * 100);

      const razorpayOrder = await razorpayInstance.orders.create({
        amount: existingOrder.totalCost * 100, // Amount in paise
        currency: 'INR',
        receipt: `receipt_${existingOrder.orderID}`,
      });

      razorpayOrderID = razorpayOrder.id;

      // Save the new Razorpay Order ID in the database
      existingOrder.razorpayOrderID = razorpayOrderID;
      await existingOrder.save();
    }

    res.json({
      success: true,
      paymentDetails: {
        id: razorpayOrderID, // Razorpay order ID
        amount: existingOrder.totalCost * 100, // Amount in paise
      },
      key_id: process.env.RAZORPAY_KEY_ID, // Razorpay key
      orderId: existingOrder.orderID, // Original orderID
    });
  } catch (error) {
    console.error('Error in createReOrder:', error);
    res.status(500).json({
      success: false,
      errors: [error.message],
    });
  }
};


// Verify payment route
const verifyPayment = async (req, res) => {
  try {
    const { paymentId, orderId, signature, paymentMethod } = req.body; // Include paymentMethod in request
    console.log( paymentId)
    console.log( orderId)
    console.log( signature)
    console.log( paymentMethod)
    console.log("hai",req.body)
    const userId = req.user._id;

    // Fetch the user's cart with the items populated
    const cart = await Cart.findOne({ userId }).populate('items.productId');
    const address = await Address.findOne({ userId });

    // Validate the address
    if (!address || address.address.length === 0) {
      return res.status(400).send('No address found');
    }

    // Calculate total cost from cart items
    let subtotal = 0;

        // Calculate subtotal using the rounded sale price
        cart.items.forEach(item => {
            if (item.productId) {
                const salePrice = calculateSalePrice(item.productId);
                item.productId.salePrice = salePrice; // Update salePrice for use in the template
                subtotal += salePrice * item.quantity;
            }
        });

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
const orderID = Math.floor(100000 + Math.random() * 900000); // Random 6-digit number
      // Create the new order
      const newOrder = new Order({
        userId,
       orderID,
        paymentId,
        amount: finalTotal, // Use final total after discount
        shippingCost,
        subtotal,
        totalCost: finalTotal, // Store final total with discount applied
        discountAmount, // Store discount amount for reference
        address: address.address[0],
        items: cart.items,
        paymentStatus: 'success',
        paymentMethod: paymentMethod || 'Online Payment',
        status: 'order placed',
    });
    

      // Save the new order to the database
      const savedOrder = await newOrder.save();

      // Clear the user's cart after order placement
      await Cart.deleteOne({ userId });

      // Save order details to the session
      req.session.orderDetails = {
        orderId: orderID,
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
/*const verifyRepayment = async (req, res) => {
  try {
      const { paymentId, orderId, signature } = req.body;
      console.log('Repayment Details:', { paymentId, orderId, signature });

      // Fetch the order from the database using Razorpay orderId
      const existingOrder = await Order.findOne({ razorpayOrderID: orderId });

      if (!existingOrder) {
          return res.status(404).json({
              success: false,
              message: 'Order not found. Cannot verify repayment.',
          });
      }

      // Verify the payment signature
      const generatedSignature = crypto
          .createHmac('sha256', process.env.RAZORPAY_SECRET)
          .update(`${orderId}|${paymentId}`)
          .digest('hex');

      if (generatedSignature === signature) {
          // Update order details
          existingOrder.paymentId = paymentId;
          existingOrder.paymentStatus = 'success';
          existingOrder.status = 'order placed'; // Update status if necessary
          await existingOrder.save();

          return res.status(200).json({
              success: true,
              message: 'Repayment verified and order updated successfully',
          });
      } else {
          return res.status(400).json({
              success: false,
              message: 'Payment verification failed. Signature mismatch.',
          });
      }
  } catch (error) {
      console.error('Error in verifyRepayment:', error);
      return res.status(500).json({
          success: false,
          message: 'Internal server error while verifying repayment',
      });
  }
};*/const verifyRepayment = async (req, res) => {
  try {
    const { paymentId, orderId, signature,orderID } = req.body; // Use orderId here
    console.log('Repayment Details:', { paymentId, orderId, signature ,orderID});

    if (!paymentId || !orderId || !signature) {
        return res.status(400).json({
            success: false,
            message: 'Missing paymentId, orderId, or signature',
        });
    }

    const existingOrder = await Order.findOne({ orderID }); // Match with orderId
    console.log("existingOrder with id razorpayOrderID: orderId....",existingOrder)

    if (!existingOrder) {
        return res.status(404).json({
            success: false,
            message: 'Order not found. Cannot verify repayment.',
        });
    }

    const generatedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_SECRET)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');
console.log("generatedSignature....",generatedSignature)
    if (generatedSignature === signature) {
        existingOrder.paymentId = paymentId;
        existingOrder.paymentStatus = 'success';
        existingOrder.status = 'order placed';
        await existingOrder.save();

        return res.status(200).json({
            success: true,
            message: 'Repayment verified and order updated successfully',
        });
    } else {
        return res.status(400).json({
            success: false,
            message: 'Payment verification failed. Signature mismatch.',
        });
    }
} catch (error) {
    console.error('Error in verifyRepayment:', error);
    return res.status(500).json({
        success: false,
        message: 'Internal server error while verifying repayment',
    });
}
};



const paymentFailure = async (req, res) => {
  const { error, orderId } = req.body;
  console.log(req.body)
  console.log("payment failiure starting here")
  const userId = req.user._id;

  try {
      // Fetch the user's cart with populated items
      const cart = await Cart.findOne({ userId }).populate('items.productId');
      const address = await Address.findOne({ userId });

      // Validate the address
      if (!address || address.address.length === 0) {
          return res.status(400).json({ success: false, message: 'No address found' });
      }

      // Calculate subtotal
      let subtotal = 0;
      cart.items.forEach(item => {
          if (item.productId) {
              const salePrice = calculateSalePrice(item.productId);
              subtotal += salePrice * item.quantity;
          }
      });

      const shippingCost = cart.shippingCost || 45; // Default or calculated shipping cost
      const totalCost = subtotal + shippingCost;

      // Create the order with "payment pending" status
      const newOrder = new Order({
          userId,
          orderID: Math.floor(100000 + Math.random() * 900000), // Random 6-digit number
          orderId, // Razorpay Order ID
          amount: totalCost,
          shippingCost,
          subtotal,
          totalCost,
          address: address.address[0],
          items: cart.items,
          paymentStatus: 'payment pending',
          paymentMethod: 'Online Payment',
          status: 'order placed',
      });

      const savedOrder = await newOrder.save();

      // Clear the user's cart
      await Cart.deleteOne({ userId });

      // Respond to the client
      res.status(200).json({
          success: true,
          message: 'Order created with payment pending status',
          orderId: newOrder.orderID,
      });
  } catch (err) {
      console.error('Error handling payment failure:', err);
      res.status(500).json({ success: false, message: 'Internal server error' });
  }
};



module.exports = {
    createOrder,
    verifyPayment,
    paymentFailure,
    createreOrder,
    verifyRepayment
};
