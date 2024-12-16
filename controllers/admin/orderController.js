const Order = require('../../models/orderSchema');
const User = require('../../models/userSchema');
const Product = require('../../models/productSchema');

const getAllOrders = async (req, res) => {
  try {
    let search = '';
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
          { orderStatus: { $regex: '.*' + search + '.*', $options: 'i' } },
          { paymentStatus: { $regex: '.*' + search + '.*', $options: 'i' } },
        ],
      };
    }

    const orders = await Order.find(searchCondition)
      .populate('userId', 'name')
      .populate('items.productId', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    const totalOrders = await Order.find(searchCondition).countDocuments();
    const totalPages = Math.ceil(totalOrders / limit);
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

const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    console.log('HELLO');
    console.log(req.body);
    console.log('Status being updated to: ', status);

    const order = await Order.findById(req.params.id);
    if (order) {
      if (status === 'Return') {
        if (order.status === 'Return Requested') {
          const user = await User.findById(order.userId);
          if (user) {
            const refundAmount = order.totalCost;
            user.walletBalance += refundAmount;
            user.walletTransactions.push({
              amount: refundAmount,
              date: new Date(),
              description: `Refund for returned order #${orderID}`,
            });

            await user.save();
          } else {
            return res.status(404).json({ error: 'User not found for refund' });
          }

          for (const item of order.items) {
            const product = await Product.findById(item.productId);
            if (product) {
              product.stock += item.quantity;
              await product.save();
            } else {
              console.error(`Product with ID ${item.productId} not found`);
            }
          }
        } else {
          return res
            .status(400)
            .json({
              error:
                "Return can only be processed for orders with 'Return Requested' status.",
            });
        }
      }

      order.status = status;
      await order.save();
      req.flash(
        'success_msg',
        `Order #${order._id} status updated to ${status}.`
      );
      res.redirect('/admin/orders');
    } else {
      res.status(404).json({ error: 'Order not found' });
    }
  } catch (err) {
    console.error('Error updating order status:', err);
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
  deleteOrder,
};
