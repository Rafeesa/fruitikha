const Address = require('../../models/addressSchema');
const Cart = require('../../models/cartSchema');
const Product = require('../../models/productSchema');
const User = require("../../models/userSchema");
const Order=require("../../models/orderSchema")





const getCheckoutPage = async (req, res) => { 
    try {
        const addresses = await Address.find({ userId: req.user.id });
        let userAddresses = addresses.length > 0 ? addresses[0].address : [];

        const cart = await Cart.findOne({ userId: req.user.id }).populate('items.productId');
        if (!cart) {
            return res.status(404).send('Cart not found');
        }
        
        let subtotal = 0;
        cart.items.forEach(item => {
            if (item.productId) {
                subtotal += item.productId.salePrice * item.quantity;
            }
        });

        const shippingCost = 45;
        const totalCost = subtotal + shippingCost;

        // Store values in session for further use after coupon application
        req.session.subtotal = subtotal;
        req.session.shippingCost = shippingCost;

        res.render('checkout', {
            user: req.user,
            addresses: userAddresses,  
            cartItems: cart.items, 
            subtotal: subtotal,
            shippingCost: shippingCost,
            discountAmount: 0, // No discount initially
            totalCost: totalCost,
            finalTotal: totalCost // Initial total without any discount
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

const placeOrder = async (req, res) => {
    try {
        const userId = req.user._id;
        const cart = await Cart.findOne({ userId }).populate('items.productId');
        
        if (!cart || cart.items.length === 0) {
            return res.status(400).send('Your cart is empty');
        }

        const address = await Address.findOne({ userId });
        if (!address || address.address.length === 0) {
            return res.status(400).send('No address found');
        }

        let subtotal = 0;
        cart.items.forEach(item => {
            subtotal += item.productId.salePrice * item.quantity;
        });
        
        const shippingCost = 45;
        const totalCost = subtotal + shippingCost;
        const discountAmount = req.session.discountAmount || 0;
        const finalTotal = req.session.finalTotal || 0;


        const paymentMethod = req.body.paymentMethod || 'Cash On Delivery';

        const newOrder = new Order({
            userId: userId,
            items: cart.items,
            address: address.address[0],
            subtotal: subtotal,
            shippingCost: shippingCost,
            discountAmount: discountAmount,
            totalCost: finalTotal,
            paymentMethod: paymentMethod,  // Use defined paymentMethod
            status: 'order placed'
        });
        

        const savedOrder = await newOrder.save();

        // Update product stock
        for (let item of cart.items) {
            const product = await Product.findById(item.productId._id);
            if (product) {
                product.stock -= item.quantity;
                if (product.stock < 0) {
                    product.stock = 0;
                }
                await product.save();
            }
        }

        // Clear the cart
        await Cart.deleteOne({ userId });
        req.session.orderDetails = {
            orderId: savedOrder._id,
            totalCost: finalTotal,
            orderItems: cart.items,
            shippingCost: 45,
            subtotal,
            discountAmount: discountAmount,
            paymentMethod: savedOrder.paymentMethod
        };
        console.log('Payment Method:', paymentMethod);

        // Redirect to the success page
        res.redirect('/orderSuccess');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error placing order');
    }
};

const getOrderSuccessPage = (req, res) => {
    // Check if orderDetails exist in the session
    if (!req.session.orderDetails) {
        return res.redirect('/'); // Redirect to home or another page if no order details are found
    }

    const { orderId, totalCost, orderItems, subtotal, shippingCost, discountAmount, paymentMethod } = req.session.orderDetails;

    res.render('orderSuccess', {
        title: 'Order Success',
        orderId,
        totalCost,
        orderItems,
        subtotal,
        shippingCost,
        discountAmount, // Include discount amount for display
        paymentMethod // Include payment method for display
    });
};



module.exports = {
    getCheckoutPage,
    placeOrder,
    getOrderSuccessPage
    
}