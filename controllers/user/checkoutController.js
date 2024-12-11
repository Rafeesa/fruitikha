const Address = require('../../models/addressSchema');
const Cart = require('../../models/cartSchema');
const Product = require('../../models/productSchema');
const User = require("../../models/userSchema");
const Order=require("../../models/orderSchema")





const calculateSalePrice = (product) => {
    const categoryOffer = product.category?.categoryOffer || 0;
    const productOffer = product.productOffer || 0;

    const categoryDiscount = (product.price * categoryOffer) / 100;
    const productDiscount = (product.price * productOffer) / 100;

    const maxDiscount = Math.max(categoryDiscount, productDiscount);

    // Return the rounded sale price
    return Math.round(product.price - maxDiscount);
};

const getCheckoutPage = async (req, res) => { 
    try {
        const addresses = await Address.find({ userId: req.user.id });
        let userAddresses = addresses.length > 0 ? addresses[0].address : [];

        const cart = await Cart.findOne({ userId: req.user.id }).populate('items.productId');
        if (!cart) {
            return res.status(404).send('Cart not found');
        }

        let subtotal = 0;

        // Calculate subtotal using the rounded sale price
        cart.items.forEach(item => {
            if (item.productId) {
                const salePrice = calculateSalePrice(item.productId);
                item.productId.salePrice = salePrice; // Update salePrice for use in the template
                subtotal += salePrice * item.quantity;
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
            if (item.productId) {
                const salePrice = calculateSalePrice(item.productId);
                item.productId.salePrice = salePrice; // Update salePrice for use in the template
                subtotal += salePrice * item.quantity;
            }
        });
        
        const shippingCost = 45;
        const discountAmount = req.session.discountAmount || 0;
        const totalCost = subtotal + shippingCost - discountAmount;

        const paymentMethod = req.body.paymentMethod || 'Cash On Delivery';
       
        const finalTotal = totalCost; // Total cost includes discount applied
       
        

        // Generate a unique 6-7 digit orderID
        const orderID = Math.floor(100000 + Math.random() * 900000); // Random 6-digit number
        
        const newOrder = new Order({
            userId,
            orderID, // Save the generated orderID
            items: cart.items,
            address: address.address[0],
            subtotal,
            shippingCost,
            discountAmount,
            totalCost: finalTotal,
            paymentMethod,
            status: 'order placed'
        });

        const savedOrder = await newOrder.save();

        // Update product stock safely
        for (let item of cart.items) {
            await Product.updateOne(
                { _id: item.productId._id, stock: { $gte: item.quantity } },
                { $inc: { stock: -item.quantity } }
            );
        }

        // Clear the cart
        await Cart.deleteOne({ userId });

        // Store order details in the session
        req.session.orderDetails = {
            orderId: savedOrder.orderID, // Use orderID for display
            totalCost: finalTotal,
            orderItems: cart.items,
            shippingCost,
            subtotal,
            discountAmount,
            paymentMethod
        };

        // Clear discount session data
        delete req.session.discountAmount;

        // Redirect to the success page
        res.redirect('/orderSuccess');
    } catch (err) {
        console.error(err);
        res.redirect('/errorPage'); // Redirect to an error page
    }
};


const getOrderSuccessPage = (req, res) => {
    
    if (!req.session.orderDetails) {
        return res.redirect('/'); 
    }

    const { orderId, totalCost, orderItems, subtotal, shippingCost, discountAmount, paymentMethod } = req.session.orderDetails;
console.log(req.session.orderDetails)
    res.render('orderSuccess', {
        title: 'Order Success',
        orderId,
        totalCost,
        orderItems,
        subtotal,
        shippingCost,
        discountAmount, 
        paymentMethod 
    });
    req.session.discountAmount = null;
};



module.exports = {
    getCheckoutPage,
    placeOrder,
    getOrderSuccessPage
    
}