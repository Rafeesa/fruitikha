/*const mongoose = require("mongoose");
const { Schema } = mongoose;

const orderSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  items: [
    {
      productId: {
        type: Schema.Types.ObjectId,
        ref: "Product",
        required: true
      },
      quantity: {
        type: Number,
        required: true,
        default: 1
      },
      price: {
        type: Number,
        required: true
      }
    }
  ],
  shippingAddress: {
    type: Schema.Types.ObjectId,
    ref: "Address",
    required: true
  },
  totalAmount: {
    type: Number,
    required: true
  },
  paymentMethod: {
    type: String,
    required: true,
    
    enum: ["Credit Card", "Debit Card", "PayPal", "Cash on Delivery"]
  },
  paymentStatus: {
    type: String,
    required: true,
    enum: ["Paid", "Pending", "Failed"],
    default: "Pending"
  },
  orderStatus: {
    type: String,
    required: true,
    enum: ["Processing", "Shipped", "Delivered", "Cancelled"],
    default: "Processing"
  },
  orderDate: {
    type: Date,
    default: Date.now
  },
  deliveryDate: {
    type: Date
  }
});

const Order = mongoose.model("Order", orderSchema);
module.exports = Order;
*/
const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    items: [{
        productId: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'Product', 
            required: true 
        },
        quantity: {
            type: Number,
            required: true
        }
    }],
    address: {
        type: Object,  // Store the address as an object
        required: true
    },
    
    subtotal: {
        type: Number,
        required: true
    },
    shippingCost: {
        type: Number,
        required: true
    },
    totalCost: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        default: 'OrderPlaced'  
    },
    paymentMethod :{
      type:String,
      default:'Cash On Delivery'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    orderID: { type: Number, required: true, unique: true },
});

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
