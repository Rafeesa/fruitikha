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
let discountAmount=0;

if(subtotal>150&&subtotal<500)
{
    discountAmount=50
}
else if(subtotal>500)
{
    discountAmount=100
}
        const shippingCost = 45;
        const totalCost = subtotal + shippingCost;
        res.render('checkout', {
            user: req.user,
        
            addresses: userAddresses,  
            cartItems: cart.items, 
            subtotal: subtotal,     
            shippingCost: shippingCost,
            totalCost:totalCost,
            discountAmount:discountAmount
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
            subtotal += item.productId.price * item.quantity;
        });
        
        const shippingCost = 45;
        const totalCost = subtotal + shippingCost;

        const paymentMethod = req.body.paymentMethod || 'Cash On Delivery';

        const newOrder = new Order({
            userId: userId,
            items: cart.items,
            address: address.address[0],
            subtotal: subtotal,
            shippingCost: shippingCost,
            totalCost: totalCost,
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
            totalCost,
            orderItems: cart.items,
            shippingCost,
            subtotal,
            paymentMethod: savedOrder.paymentMethod // Add paymentMethod here
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
  
    const { orderId, totalCost, orderItems, subtotal, shippingCost, paymentMethod } = req.session.orderDetails;
  
    res.render('orderSuccess', {
      title: 'Order Success',
      orderId,
      totalCost,
      orderItems,
      subtotal,
      shippingCost,
      paymentMethod // Include payment method for display
    });
  };
  


module.exports = {
    getCheckoutPage,
    placeOrder,
    getOrderSuccessPage
    
}