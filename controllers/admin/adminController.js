const User=require("../../models/userSchema")
const mongoose=require("mongoose")
const bcrypt=require("bcrypt")
const moment = require('moment');
const Order = require('../../models/orderSchema');
const Product=require("../../models/productSchema")
const Category=require("../../models/categorySchema")







const loadLogin=(req,res)=>{
    if(req.session.admin)
    {
        return  res.redirect("/admin/dashboard")
    }
    res.render("admin-login",{message:null})
}


const login=async(req,res)=>{
    try {
        
        const {email,password}=req.body
        const admin=await User.findOne({email,isAdmin:true})
        if(admin){
           const passwordMatch=bcrypt.compare(password,admin.password) 
           if(passwordMatch){
            req.session.admin=true
            return res.redirect("/admin")
           }
           else
           {
            return res.redirect("/login")
           }
        }
        else{
            return res.redirect("/login")
        }

    } catch (error) {
        console.log("login error",error)
        
    }
}


const loadDashboard=async(req,res)=>
    {
        if(req.session.admin)
        {
            try {
                const users = await User.find({});
                const orders = await Order.find({})
                  .sort({ createdAt: -1 })
                  .populate("userId");
                const products = await Product.find({});
            
                // Top 10 Selling Products
                const topSellingProducts = await Order.aggregate([
                  { $unwind: "$items" },
                  {
                    $group: {
                      _id: "$items.productId",
                      totalQuantitySold: { $sum: "$items.quantity" }
                    }
                  },
                  { $sort: { totalQuantitySold: -1 } },
                  { $limit: 10 },
                  {
                    $lookup: {
                      from: "products",
                      localField: "_id",
                      foreignField: "_id",
                      as: "productDetails"
                    }
                  },
                  { $unwind: "$productDetails" }
                ]);
            
                // Top 10 Categories by Sales
                const topCategories = await Order.aggregate([
                  { $unwind: "$items" },
                  {
                    $lookup: {
                      from: "products",
                      localField: "items.productId",
                      foreignField: "_id",
                      as: "productDetails"
                    }
                  },
                  { $unwind: "$productDetails" },
                  {
                    $group: {
                      _id: "$productDetails.category",
                      totalQuantitySold: { $sum: "$items.quantity" }
                    }
                  },
                  { $sort: { totalQuantitySold: -1 } },
                  { $limit: 10 },
                  {
                    $lookup: {
                      from: "categories",
                      localField: "_id",
                      foreignField: "_id",
                      as: "categoryDetails"
                    }
                  },
                  { $unwind: "$categoryDetails" },
                  {
                    $project: {
                      _id: "$categoryDetails.name",
                      totalQuantitySold: 1
                    }
                  }
                ]);
                console.log("Users:", users);
                console.log("Orders:", orders);
                console.log("Products:", products);
                console.log("Top Selling Products:", topSellingProducts);
                console.log("Top Categories:", topCategories);
                
                res.render("dashboard", {
                  users,
                  orders,
                  products,
                  topSellingProducts,
                  topCategories
                });
              } catch (error) {
                console.error(error);
               
              }
            };
    }

    const getChartData = async (req, res) => {
        try {
          const { filter } = req.query;
      
          // Define date ranges based on filters
          let startDate, endDate;
          const now = new Date();
          switch (filter) {
            case "daily":
              startDate = new Date(now.setHours(0, 0, 0, 0));
              endDate = new Date(now.setHours(23, 59, 59, 999));
              break;
            case "weekly":
              startDate = new Date(now.setDate(now.getDate() - 7));
              endDate = new Date();
              break;
            case "monthly":
              startDate = new Date(now.getFullYear(), now.getMonth(), 1);
              endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
              break;
            case "yearly":
              startDate = new Date(now.getFullYear(), 0, 1);
              endDate = new Date(now.getFullYear(), 11, 31);
              break;
            default:
              return res.status(400).json({ error: "Invalid filter type" });
          }
      
          // Query data based on filters
          const userCount = await User.countDocuments({
            createdAt: { $gte: startDate, $lte: endDate }
          });
          console.log('Start Date:', startDate);
console.log('End Date:', endDate);
console.log('User Count:', userCount);

          const orderCount = await Order.countDocuments({
            createdAt: { $gte: startDate, $lte: endDate }
          });
          const productCount = await Product.countDocuments({
            createdAt: { $gte: startDate, $lte: endDate }
          });
      
          // Aggregate revenue and number of orders by category
          const categoryRevenue = await Order.aggregate([
            { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
            { $unwind: "$items" },
            {
              $lookup: {
                from: "products",
                localField: "items.productId",
                foreignField: "_id",
                as: "productDetails"
              }
            },
            { $unwind: "$productDetails" },
            {
              $group: {
                _id: "$productDetails.category",
                totalRevenue: {
                  $sum: { $multiply: ["$items.quantity", "$productDetails.salePrice"] }
                },
                totalOrders: { $sum: 1 }
              }
            },
            {
              $lookup: {
                from: "categories",
                localField: "_id",
                foreignField: "_id",
                as: "categoryDetails"
              }
            },
            { $unwind: "$categoryDetails" },
            {
              $project: {
                _id: "$categoryDetails.name",
                totalRevenue: 1,
                totalOrders: 1
              }
            }
          ]);
      
          // Respond with the data for charts
          res.json({
            barChartData: [userCount, orderCount, productCount],
            doughnutChartData: categoryRevenue
          });
        } catch (error) {
          console.error(error);
          res.status(500).json({ error: "Failed to fetch chart data" });
        }
      };


const logout=async(req,res)=>{
    try {
        req.session.destroy(err =>{
            if(err){
                console.log("Error destroying session",err)
            }
            res.redirect("/admin/login")
        })
    } catch (error) {
      console.log("unexpexcted error during logout",error)  
    }
}
module.exports={
    loadLogin,
    login,
    loadDashboard,
    logout,
    getChartData
}