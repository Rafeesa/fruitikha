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
const calculateSalePrice = (product) => {
  const categoryOffer = product.category?.categoryOffer || 0;
  const productOffer = product.productOffer || 0;

  const categoryDiscount = (product.price * categoryOffer) / 100;
  const productDiscount = (product.price * productOffer) / 100;

  const maxDiscount = Math.max(categoryDiscount, productDiscount);

  // Return the rounded sale price
  return Math.round(product.price - maxDiscount);
};

const payWithWallet = async (req, res) => {
  try {
    const userId = req.user._id;
    const cart = await Cart.findOne({ userId }).populate('items.productId');
    const user = await User.findById(userId);

    if (!cart || cart.items.length === 0) {
      return res.status(400).send('Your cart is empty');
    }

    const address = await Address.findOne({ userId });
    if (!address || address.address.length === 0) {
      return res.status(400).send('No address found');
    }

    let subtotal = 0;
    const orderItems = cart.items.map(item => {
      if (!item.productId) return null;
      
      const salePrice = calculateSalePrice(item.productId);
      subtotal += salePrice * item.quantity;
      
      return {
        productId: item.productId._id,
        quantity: item.quantity,
        price: item.productId.price,
        salePrice: salePrice,
        status: 'OrderPlaced'
      };
    }).filter(item => item !== null);

    const shippingCost = 45;
    const discountAmount = req.session.discountAmount || 0;
    const totalCost = subtotal + shippingCost - discountAmount;

    // Check wallet balance
    if (user.walletBalance < totalCost) {
      return res.status(400).send('Insufficient wallet balance');
    }

    const orderID = Math.floor(100000 + Math.random() * 900000);

    const newOrder = new Order({
      userId,
      orderID,
      items: orderItems,
      address: address.address[0],
      subtotal,
      shippingCost,
      discountAmount, 
      totalCost,
      paymentMethod: 'Wallet',
      paymentStatus: 'success'
    });

    const savedOrder = await newOrder.save();

    // Update product stock
    for (let item of orderItems) {
      await Product.updateOne(
        { _id: item.productId, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } }
      );
    }

    // Update wallet balance
    await User.findByIdAndUpdate(userId, {
      $inc: { walletBalance: -totalCost },
      $push: {
        walletTransactions: {
          amount: -totalCost,
          date: new Date(),
          description: `Order Payment #${orderID}`
        }
      }
    });

    await Cart.deleteOne({ userId });

    req.session.orderDetails = {
      orderId: savedOrder.orderID,
      totalCost,
      orderItems,
      shippingCost,
      subtotal,
      discountAmount,
      paymentMethod: 'Wallet'
    };

    delete req.session.discountAmount;
    res.redirect('/orderSuccess');
  } catch (err) {
    console.error(err);
    res.redirect('/errorPage');
  }
};

module.exports = {
  getWallet,
  payWithWallet,
};
