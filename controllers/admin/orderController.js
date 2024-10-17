const Order = require('../../models/orderSchema');
const User = require('../../models/userSchema'); 
const Product = require('../../models/productSchema');


const getAllOrders = async (req, res) => {
    try {
        let search = "";
        if (req.query.search) {
            search = req.query.search;
        }
        
        let page = 1;
        if (req.query.page) {
            page = parseInt(req.query.page);
        }

        const limit = 4; 
        const skip = (page - 1) * limit;

       
        let searchCondition = {};
        if (search) {
            searchCondition = {
                $or: [
                    { orderStatus: { $regex: ".*" + search + ".*", $options: 'i' } },
                    { paymentStatus: { $regex: ".*" + search + ".*", $options: 'i' } }
                ]
            };
        }


        const orders = await Order.find(searchCondition)
            .populate('userId', 'name')
            .populate('items.productId', 'name') 
            .sort({ createdAt: -1 }) 
            .skip(skip)
            .limit(limit)
            .exec();

        // Get total number of orders for pagination
        const totalOrders = await Order.find(searchCondition).countDocuments();
        const totalPages = Math.ceil(totalOrders / limit);

        // Render orders view with data
        res.render('orders', {
            orders: orders,
            currentPage: page,
            totalPages: totalPages,
            totalOrders: totalOrders,
        });
    } catch (err) {
        console.error(err);
        res.redirect('/admin');
    }
};



// Update order status
const updateOrderStatus = async (req, res) => {
    try {
        const { status } = req.body; 
        console.log("HELLO")
        console.log(req.body)
        console.log("hai")
        console.log(status)

        const order = await Order.findById(req.params.id);
        
        if (order) {
            order.status = status; 
        
            await order.save(); 
            res.redirect('/admin/orders');
        } else {
            res.status(404).json({ error: "Order not found" });
        }
    } catch (err) {
        console.error(err);
        res.redirect('/admin/orders');
    }
};



// Delete an order
const deleteOrder = async (req, res) => {
    try {
        await Order.findByIdAndDelete(req.params.id);
        res.redirect('/admin/orders');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

module.exports = {
    getAllOrders,
    updateOrderStatus,
    deleteOrder
};
