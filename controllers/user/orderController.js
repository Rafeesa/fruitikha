const User = require("../../models/userSchema");
const Product = require('../../models/productSchema'); 
const Order=require("../../models/orderSchema")
const Address = require('../../models/addressSchema');
const getOrders = async (req, res) => {
    try {
      const userId = req.user._id; // Assuming req.user is set by authentication middleware
      const addresses = await Address.find({ userId: req.user.id });
      console.log('Fetched Addresses:', addresses); 
      let userAddresses = [];
      if (addresses.length > 0) {
          userAddresses = addresses[0].address; 
          console.log('User Addresses:', userAddresses); 
      } else {
          console.log('No addresses found for this user.');
      }
      // Fetch orders with user, product, and address details populated
      const orders = await Order.find({ userId })
        .populate("items.productId", "name productImage price")
       // Fetching product details (name, image, price)
        .lean();
  
      // Render the orders page with fetched orders
      res.render("myOrder", { orders , addresses: userAddresses });
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.status(500).send("Server Error");
    }
  };


  module.exports={
    getOrders
  }