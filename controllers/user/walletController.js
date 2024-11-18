

const User = require("../../models/userSchema");
const Order=require("../../models/orderSchema")
const Product = require("../../models/productSchema");
const Address= require("../../models/addressSchema")
const Cart=require("../../models/cartSchema")



const getWallet = async (req, res) => {
    const userId = req.session.passport?.user;

    if (!userId) {
        return res.redirect('/login');
    }

    try {
        // Pagination setup
        let page = parseInt(req.query.page) || 1;
        const limit = 5;
        const skip = (page - 1) * limit;

        // Fetch user wallet balance
        const user = await User.findById(userId).select('walletBalance').lean();

        // Fetch paginated wallet transactions
        const transactions = await User.findById(userId)
            .select('walletTransactions')
            .slice('walletTransactions', [skip, limit])
            .lean();

        const totalTransactions = await User.findById(userId).select('walletTransactions').lean();
        const totalPages = Math.ceil(totalTransactions.walletTransactions.length / limit);

        // Safeguard to set an empty array if walletTransactions is undefined
        const walletTransactions = transactions.walletTransactions || [];

        // Render wallet view with pagination data
        res.render('wallet', {
            user: { ...user, walletTransactions },
            currentPage: page,
            totalPages,
            limit
        });
    } catch (error) {
        console.error('Error fetching wallet:', error);
        res.status(500).send('Internal Server Error');
    }
};


const payWithWallet = async (req, res) => {
    const { addressId, amount } = req.body;
    const userId = req.user._id;
    if (!userId) {
        return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    try {
        const user = await User.findById(userId);
        const cart = await Cart.findOne({ userId }).populate('items.productId');

        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ success: false, message: 'Your cart is empty' });
        }

    
        const address = await Address.findOne({ userId:userId, _id: addressId });
        if (!address) {
            console.log("Address not found or missing for Address ID:", addressId);
            return res.status(400).json({ success: false, message: 'Invalid or missing address' });
        }

       
        let subtotal = 0;
        cart.items.forEach(item => {
            subtotal += item.productId.salePrice * item.quantity;
        });

        const shippingCost = 45;
        const discountAmount = req.session.discountAmount || 0;
        const finalTotal = subtotal + shippingCost - discountAmount;

        if (user.walletBalance < finalTotal) {
            return res.status(400).json({ success: false, message: 'Insufficient wallet balance' });
        }

      
        user.walletBalance -= finalTotal;
        user.walletTransactions.push({
            amount: -finalTotal,
            date: new Date(),
            description: 'Order payment',
        });
        await user.save();

        // Create the order with the required fields
        const order = new Order({
            user: userId,
            items: cart.items,
            address: address,
            subtotal: subtotal,
            shippingCost: shippingCost,
            discountAmount: discountAmount,
            totalCost: finalTotal,
            paymentMethod: 'wallet',
            status: 'Paid',
        });

        const savedOrder = await order.save();

        // Update product stock for each item in the cart
        for (let item of cart.items) {
            const product = await Product.findById(item.productId._id);
            if (product) {
                product.stock -= item.quantity;
                product.stock = Math.max(0, product.stock);
                await product.save();
            }
        }

        // Clear the cart after order is placed
        await Cart.deleteOne({ userId });

        // Save order details in the session for the success page
        req.session.orderDetails = {
            orderId: savedOrder._id,
            totalCost: finalTotal,
            orderItems: cart.items,
            shippingCost,
            subtotal,
            discountAmount,
            paymentMethod: savedOrder.paymentMethod,
        };

        // Redirect to the order success page
        res.json({ success: true });
    } catch (error) {
        console.error('Error processing wallet payment:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};





module.exports={
    getWallet,
    payWithWallet

}