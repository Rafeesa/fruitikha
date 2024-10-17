const Address = require('../../models/addressSchema');
const Cart = require('../../models/cartSchema');
const Product = require('../../models/productSchema');
const User = require("../../models/userSchema");
const Order=require("../../models/orderSchema")





const getCheckoutPage = async (req, res) => {
    try {
    
        const addresses = await Address.find({ userId: req.user.id });
        console.log('Fetched Addresses:', addresses); 
        let userAddresses = [];
        if (addresses.length > 0) {
            userAddresses = addresses[0].address; 
            console.log('User Addresses:', userAddresses); 
        } else {
            console.log('No addresses found for this user.');
        }

        
        const cart = await Cart.findOne({ userId: req.user.id }).populate('items.productId');

        if (!cart) {
            return res.status(404).send('Cart not found');
        }
        let subtotal = 0;
        cart.items.forEach(item => {
            if (item.productId) {
                subtotal += item.productId.price * item.quantity;
            }
        });

        const shippingCost = 45;
        res.render('checkout', {
            addresses: userAddresses,  
            cartItems: cart.items, 
            subtotal: subtotal,     
            shippingCost: shippingCost,
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};



       

/*const placeOrder = async (req, res) => {
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
            subtotal += item.productId.price * item.quantity;
        });

        const shippingCost = 45;
        const totalCost = subtotal + shippingCost;

        const newOrder = new Order({
            userId: userId,
            items: cart.items,
            address: address.address[0],
            subtotal: subtotal,
            shippingCost: shippingCost,
            totalCost: totalCost
            
        });

        const saveOrder = await newOrder.save();

        await Cart.deleteOne({ userId });

        res.render('orderSuccess', {
            title: 'Order Success', 
            orderId: saveOrder._id, 
            totalCost: totalCost 
        });

    } catch (err) {
        console.error(err);
        res.status(500).send('Error placing order');
    }
};*/
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
            subtotal += item.productId.price * item.quantity;
        });

        const shippingCost = 45;
        const totalCost = subtotal + shippingCost;

        const newOrder = new Order({
            userId: userId,
            items: cart.items,
            address: address.address[0],
            subtotal: subtotal,
            shippingCost: shippingCost,
            totalCost: totalCost
        });

        const saveOrder = await newOrder.save();

        await Cart.deleteOne({ userId });

        // Pass the order details to the view
        res.render('orderSuccess', {
            title: 'Order Success',
            orderId: saveOrder._id,
            totalCost: totalCost,
            orderItems: cart.items, // Pass the order items
            subtotal: subtotal,      // Pass the subtotal
            shippingCost: shippingCost // Pass the shipping cost
        });
        

    } catch (err) {
        console.error(err);
        res.status(500).send('Error placing order');
    }
};



module.exports = {
    getCheckoutPage,
    placeOrder
}