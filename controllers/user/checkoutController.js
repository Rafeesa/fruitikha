const Address = require('../../models/addressSchema');
const Cart = require('../../models/cartSchema');
const Product = require('../../models/productSchema');
const User = require('../../models/userSchema');
const Order = require('../../models/orderSchema');

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

    const cart = await Cart.findOne({ userId: req.user.id }).populate(
      'items.productId'
    );
    if (!cart) {
      return res.status(404).send('Cart not found');
    }

    let subtotal = 0;

    cart.items.forEach((item) => {
      if (item.productId) {
        const salePrice = calculateSalePrice(item.productId);
        item.productId.salePrice = salePrice;
        subtotal += salePrice * item.quantity;
      }
    });

    const shippingCost = 45;

    const discountAmount = req.session.discountAmount || 0;

    const totalCost = subtotal + shippingCost - discountAmount;

    req.session.subtotal = subtotal;
    req.session.shippingCost = shippingCost;

    res.render('checkout', {
      user: req.user,
      addresses: userAddresses,
      cartItems: cart.items,
      subtotal: subtotal,
      shippingCost: shippingCost,
      discountAmount: discountAmount,
      totalCost: totalCost,
      finalTotal: totalCost,
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
    // Transform cart items to include individual item status and prices
    const orderItems = cart.items
      .map((item) => {
        if (!item.productId) return null;

        const salePrice = calculateSalePrice(item.productId);
        subtotal += salePrice * item.quantity;

        return {
          productId: item.productId._id,
          quantity: item.quantity,
          price: item.productId.price,
          salePrice: salePrice,
          status: 'OrderPlaced',
        };
      })
      .filter((item) => item !== null);

    const shippingCost = 45;
    const discountAmount = req.session.discountAmount || 0;
    const totalCost = subtotal + shippingCost - discountAmount;
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
      paymentMethod: req.body.paymentMethod || 'Cash On Delivery',
      status: 'OrderPlaced',
    });

    const savedOrder = await newOrder.save();

    // Update product stock
    for (let item of orderItems) {
      await Product.updateOne(
        { _id: item.productId, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } }
      );
    }

    await Cart.deleteOne({ userId });

    req.session.orderDetails = {
      orderId: savedOrder.orderID,
      totalCost,
      orderItems,
      shippingCost,
      subtotal,
      discountAmount,
      paymentMethod: newOrder.paymentMethod,
    };

    delete req.session.discountAmount;
    res.redirect('/orderSuccess');
  } catch (err) {
    console.error(err);
    res.redirect('/errorPage');
  }
};

const getOrderSuccessPage = async (req, res) => {
  try {
    if (!req.session.orderDetails) {
      return res.redirect('/');
    }

    const {
      orderId,
      totalCost,
      orderItems,
      subtotal,
      shippingCost,
      discountAmount,
      paymentMethod,
    } = req.session.orderDetails;

    // Populate product details
    const populatedOrderItems = await Promise.all(
      orderItems.map(async (item) => {
        const product = await Product.findById(item.productId);
        return {
          ...item,
          productId: product,
        };
      })
    );

    res.render('orderSuccess', {
      title: 'Order Success',
      orderId,
      totalCost,
      orderItems: populatedOrderItems,
      subtotal,
      shippingCost,
      discountAmount,
      paymentMethod,
    });

    req.session.discountAmount = null;
  } catch (error) {
    console.error(error);
    res.redirect('/errorPage');
  }
};

module.exports = {
  getCheckoutPage,
  placeOrder,
  getOrderSuccessPage,
};
