const User = require("../../models/userSchema");
const Product = require('../../models/productSchema'); 
const Order=require("../../models/orderSchema")
const Address = require('../../models/addressSchema');
const getOrders = async (req, res) => { 
  try {
      let page = 1;
      if (req.query.page) {
          page = parseInt(req.query.page);
      }

      const limit = 4; // Number of orders per page
      const skip = (page - 1) * limit;

      const userId = req.user._id; // Ensure req.user is set by authentication middleware

      // Fetch user addresses
      const addresses = await Address.find({ userId }).lean();
      console.log('Fetched Addresses:', addresses); 
      let userAddresses = addresses.length > 0 ? addresses[0].address : []; 

      // Fetch orders with pagination
      const orders = await Order.find({ userId })
          .populate("items.productId", "name productImage price") 
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean();
      
      console.log('Fetched Orders:', orders);

      // Get total number of orders for pagination
      const totalOrders = await Order.find({ userId }).countDocuments();
      const totalPages = Math.ceil(totalOrders / limit);

      // Render the myOrder view with pagination data
      res.render("myOrder", {
          orders,
          addresses: userAddresses,
          user: req.user,
          currentPage: page,
          totalPages: totalPages,
          totalOrders: totalOrders
      });
  } catch (error) {
      console.error("Error fetching orders:", error);
      res.status(500).send("Server Error");
  }
};


// Controller method for handling return requests
const requestReturn = async (req, res) => {
  try {
      const orderId = req.params.id;
      
      const order = await Order.findById(orderId);
      
      // Check if the order is eligible for return
      if (order.status === 'Delivered') {
          order.status = 'Return Requested';
          await order.save();
         // res.send('Return request submitted successfully.');
      } else {
          res.status(400).send('Return is only available for delivered orders.');
      }
  } catch (error) {
      console.error(error);
      res.status(500).send('Error processing return request.');
  }
};


  module.exports={
    getOrders,
    requestReturn 
  }