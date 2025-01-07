const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  items: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
      },
      quantity: {
        type: Number,
        required: true,
      },
      price: {
        type: Number,
        required: true,
      },
      salePrice: {
        type: Number,
        required: true,
      },
      status: {
        type: String,
        default: 'OrderPlaced',
      },
    },
  ],
  address: {
    type: Object, // Store the address as an object
    required: true,
  },

  subtotal: {
    type: Number,
    required: true,
  },
  shippingCost: {
    type: Number,
    required: true,
  },
  totalCost: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    default: 'OrderPlaced',
  },
  paymentMethod: {
    type: String,
    default: 'Cash On Delivery',
  },
  paymentStatus: {
    type: String,

    default: 'success', // Default value
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  orderID: { type: Number, required: true, unique: true },
});

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
