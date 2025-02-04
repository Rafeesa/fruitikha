const mongoose = require('mongoose');
const { Schema } = mongoose;

const userSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  phone: {
    type: String,
    required: false,
    //unique: true,
    sparse: true,
    default: null,
  },
  googleId: {
    type: String,
    //unique: true,
  },

  password: {
    type: String,
    required: false,
  },
  isBlocked: {
    type: Boolean,
    default: false,
  },
  isAdmin: {
    type: Boolean,
    default: false,
  },
  walletBalance: {
    type: Number,
    default: 0,
  },
  redeemList: {
    type: [mongoose.Schema.Types.ObjectId], // Array of coupon IDs
    ref: 'Coupon', // Reference to the Coupon model
  },
  walletTransactions: [
    {
      amount: Number,
      date: Date,
      description: String,
    },
  ],
  wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  referralCode: { type: String, unique: true },

  referrals: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model('User', userSchema);
module.exports = User;
