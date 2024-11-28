const User = require("../../models/userSchema");
const Product = require('../../models/productSchema'); 
const Order=require("../../models/orderSchema")
const Address = require('../../models/addressSchema');
const PDFDocument = require('pdfkit');
const path = require('path');

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
        res.json({ success: true, message: 'Return request submitted successfully.' });
      } else {
        res.status(400).json({ success: false, message: 'Return is only available for delivered orders.' });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Error processing return request.' });
    }
  };
  
  
  const getInvoicePdf = async (req, res) => {
    try {
      const order = await Order.findById(req.params.id)
        .populate("items.productId")  // Populate product details for items
        .exec();
  
      if (!order) {
        return res.status(404).send("Order not found");
      }
  
      const address = order.address;
  
      if (!address) {
        return res.status(404).send("No address found for this order");
      }
  
      // Create a new PDF document
      const doc = new PDFDocument();
  
      // Set the response headers for PDF download
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="invoice-${order.orderID}.pdf"`);
  
      // Pipe the PDF document to the response
      doc.pipe(res);
  
      // Generate PDF content
      doc.fontSize(20).text("INVOICE", { align: "left" });
      doc.moveDown();
  
      // Order and Invoice Details
      doc.fontSize(12)
        .text(`Order ID: ${order.orderID}`, { align: "left" })
        .text(`Order Date: ${new Date(order.createdAt).toLocaleDateString()}`, { align: "left" });
      /*doc.text(`Invoice ID: INV-${order._id}`, { align: "right" })
        .text(`Invoice Date: ${new Date().toLocaleDateString()}`, { align: "right" });*/
      doc.moveDown();
  
      // Line separator
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
  
      // Shipping Address
      doc.moveDown().fontSize(12).text("Shipping Address:", { underline: true });
      doc.text(`Name: ${address.name}`);
      doc.text(`House Name: ${address.houseName}`);
      doc.text(`City: ${address.city}`);
      doc.text(`State: ${address.state}`);
      doc.text(`Pincode: ${address.pincode}`);
  
      // Line separator
      doc.moveDown().moveTo(50, doc.y).lineTo(550, doc.y).stroke();
  
      // Product Table
      doc.moveDown();
      doc.text("Product Details:", { underline: true });
  
      const column1X = 50;  // Product Name
      const column2X = 200; // Quantity
      const column3X = 300; // Price
      const column4X = 400; // Discount
      const column5X = 500; // Shipping
      const column6X = 600; // Total
  
      // Table headers
      doc.text("Product Name", column1X, doc.y);
      doc.text("Quantity", column2X, doc.y);
      doc.text("Price", column3X, doc.y);
      doc.text("Discount", column4X, doc.y);
      doc.text("Shipping", column5X, doc.y);
      doc.text("Total", column6X, doc.y);
  
      // Line separator
      doc.lineWidth(0.5).moveTo(50, doc.y + 10).lineTo(650, doc.y + 10).stroke();
  
      let yPosition = doc.y + 20; // Start position for items
  
      // Loop through items and generate rows
      order.items.forEach(item => {
        const productName = item.productId ? item.productId.name : 'Unknown Product';
        console.log(productName)

        // Ensure all fields are valid numbers or set to 0
        const originalPrice = item.productId?.price || 0;
        const salePrice = item.productId?.salePrice || 0;
        const discountAmount = originalPrice - salePrice;
  const quantity=item.quantity;
        // Validate and ensure values are numbers (set to 0 if NaN)
        const price = isNaN(originalPrice) || originalPrice === null ? 0 : originalPrice;
        const discount = isNaN(discountAmount) || discountAmount === null ? 0 : discountAmount;
        const shippingCost = isNaN(order.shippingCost) || order.shippingCost === null ? 0 : order.shippingCost;
        const totalCost = isNaN(order.totalCost) || order.totalCost === null ? 0 : order.totalCost;
console.log("hai")
        // Debugging: Log values before passing them to pdfkit
        console.log("qty:",quantity,"Price:", price, "salePrice:", salePrice, "Discount:", discount, "Shipping:", shippingCost, "Total Cost:", totalCost);
  
        // Ensure values are valid for PDF (do not pass NaN)
        doc.text(`${item.productId.name}` || 'Unknown Product', column1X, yPosition);
        doc.text(`${item.quantity}` || 0, column2X, yPosition);
        doc.text(`₹${salePrice.toFixed(2)}`, column3X, yPosition);
        doc.text(`₹${discount.toFixed(2)}`, column4X, yPosition);
        doc.text(`₹${shippingCost.toFixed(2)}`, column5X, yPosition);
        doc.text(`₹${totalCost.toFixed(2)}`, column6X, yPosition);
  
        yPosition += 20;  // Move down for the next row
      });
  
      // Seller Address
      doc.moveDown().text("Seller Address:", { underline: true });
      doc.text(`34/8, East Hukupara, Gifirtok, Sadan.`);
      doc.text(`support@fruitkha.com`);
      doc.text(`+00 111 222 3333`);
  
      // Optional Logo (if you want to include the logo image)
      // const logoPath = path.join(__dirname, 'C:\\Users\\ASUS\\OneDrive\\Desktop\\fruitikha\\public\\assets\\img\\logo.png');
      // doc.image(logoPath, 450, yPosition, { width: 100 });
  
      // Finalize the PDF
      doc.end();
    } catch (err) {
      console.error(err);
      res.status(500).send("Error generating invoice");
    }
  };
  
  
  
  
  
  module.exports={
    getOrders,
    requestReturn,
    getInvoicePdf, 
  }