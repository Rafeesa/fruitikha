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
const updateItemStatus = async (req, res) => {
  try {
    const { status, itemId } = req.body;

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const item = order.items.find((item) => item._id.toString() === itemId);
    console.log(item);

    if (!item) {
      return res.status(404).json({ error: 'Item not found in order' });
    }

    item.status = status;

    if (status === 'Return') {
      const user = await User.findById(order.userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found for refund' });
      }

      // Calculate refund amount with proper number handling
      const itemPrice = parseFloat(item.salePrice) || 0;
      const itemQuantity = parseInt(item.quantity) || 0;
      const refundAmount = itemPrice * itemQuantity;

      // Ensure we have valid numbers
      if (isNaN(refundAmount)) {
        throw new Error('Invalid refund amount calculated');
      }

      // Update wallet balance with proper number handling
      const currentBalance = parseFloat(user.walletBalance) || 0;
      user.walletBalance = currentBalance + refundAmount;

      // Add transaction with validated amount
      user.walletTransactions.push({
        amount: refundAmount,
        date: new Date(),
        description: `Refund for item #${item.productId}`,
      });

      await user.save();

      // Restock the product
      const product = await Product.findById(item.productId);
      if (product) {
        product.stock = (parseInt(product.stock) || 0) + itemQuantity;
        await product.save();
      } else {
        console.error(`Product with ID ${item.productId} not found`);
      }
    }

    // Save updated order
    await order.save();

    req.flash('success_msg', `Item status updated to ${status}.`);
    return res.redirect('/admin/orders');
  } catch (err) {
    console.error('Error updating item status:', err);
    req.flash('error_msg', 'Error updating item status');
    return res.redirect('/admin/orders');
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
  updateItemStatus,
  deleteOrder,
};
