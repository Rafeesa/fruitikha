const User = require("../../models/userSchema");
const Product = require('../../models/productSchema'); 
const Order=require("../../models/orderSchema")
const Address = require('../../models/addressSchema');
const getOrders = async (req, res) => {
  try {
    const userId = req.user._id; // Ensure req.user is set by authentication middleware
    const addresses = await Address.find({ userId }).lean();
    
    // Log the fetched addresses for debugging
    console.log('Fetched Addresses:', addresses); 
    let userAddresses = addresses.length > 0 ? addresses[0].address : []; 

    // Fetch the logged-in user's details
    const user = await User.findById(userId).lean();

    // Fetch orders for the current user
    const orders = await Order.find({ userId })
      .populate("items.productId", "name productImage price") // Populating product details
      .lean();

    // Log fetched orders for debugging
    console.log('Fetched Orders:', orders);

    // Render orders view with fetched orders, addresses, and user details
    res.render("myOrder", { orders, addresses: userAddresses, user });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).send("Server Error");
  }
};



  module.exports={
    getOrders
  }