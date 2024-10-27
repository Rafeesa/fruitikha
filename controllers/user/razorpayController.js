const Razorpay = require('razorpay');
const crypto = require('crypto');
require('dotenv').config(); // Load environment variables
const { body, validationResult } = require('express-validator');

// Initialize Razorpay instance
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_SECRET,
});

// Create Razorpay order
const createOrder = async (req, res) => {
    console.log("Order Request Body:", req.body); // Debugging request data

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

        if (paymentMethod === "cashOnDelivery") {
            return res.json({ success: true, message: "Order placed successfully with Cash on Delivery." });
        }

        const options = {
            
            amount: amount, // Convert to paise
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
const verifyPayment = (req, res) => {
    const {  orderId, paymentId, signature } = req.body;
console.log("razorpay signature",signature)
    console.log("Payment Verification Body:", req.body); 

    try {
        const generatedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_SECRET)
            .update(`${orderId}|${paymentId}`)
            .digest('hex');

        if (generatedSignature === signature) {
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


module.exports = {
    createOrder,
    verifyPayment
};
