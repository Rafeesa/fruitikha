const User = require('../../models/userSchema');
const Order = require('../../models/orderSchema');
const Product = require('../../models/productSchema');
const Address = require('../../models/addressSchema');
const Cart = require('../../models/cartSchema');

const getWallet = async (req, res) => {
  const userId = req.session.passport?.user;

  if (!userId) {
    return res.redirect('/login');
  }

  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const skip = (page - 1) * limit;

    const user = await User.findById(userId).lean();
    if (!user) {
      return res.redirect('/login');
    }

    const walletTransactions = user.walletTransactions || [];
    const paginatedTransactions = walletTransactions.slice(skip, skip + limit);
    const totalPages = Math.ceil(walletTransactions.length / limit);

    res.render('wallet', {
      user: { ...user, walletTransactions: paginatedTransactions },
      currentPage: page,
      totalPages,
    });
  } catch (error) {
    console.error('Error fetching wallet:', error);
    res.status(500).send('Internal Server Error');
  }
};

const payWithWallet = async (req, res) => {
  const { addressId, amount } = req.body;
  const userId = req.user._id;

  // Validate inputs
  if (!userId) {
    return res.json({ success: false, message: 'User not authenticated' });
  }

  if (!amount || amount <= 0) {
    return res.json({ success: false, message: 'Invalid payment amount' });
  }

  try {
    // Use findOneAndUpdate with atomic operation for better concurrency handling
    const user = await User.findOneAndUpdate(
      {
        _id: userId,
        walletBalance: { $gte: amount },
      },
      {
        $inc: { walletBalance: -amount },
        $push: {
          walletTransactions: {
            amount: -amount,
            date: new Date(),
            description: 'Order Payment',
          },
        },
      },
      {
        new: true, // Return the updated document
        runValidators: true,
      }
    );

    if (!user) {
      // This means either user not found or insufficient balance
      return res.json({
        success: false,
        message: 'Insufficient wallet balance',
      });
    }

    res.json({ success: true, message: 'Payment successful' });
  } catch (error) {
    console.error('Error processing wallet payment:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

module.exports = {
  getWallet,
  payWithWallet,
};
