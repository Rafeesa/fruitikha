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

      const limit = 4; 
      const skip = (page - 1) * limit;

      const userId = req.user._id; 

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

      
      const totalOrders = await Order.find({ userId }).countDocuments();
      const totalPages = Math.ceil(totalOrders / limit);

    
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



const requestReturn = async (req, res) => {
    try {
      const orderId = req.params.id;
      
      const order = await Order.findById(orderId);
      
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
            .populate("items.productId") // Populate product details for items
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

        // Title
        doc.fontSize(20).text("INVOICE", { align: "center" });
        doc.moveDown(1.5);

        // Order and Invoice Details
        doc.fontSize(12)
            .text(`Order ID: ${order.orderID}`,50, 130, { align: "left" })
            .text(`Order Date: ${new Date(order.createdAt).toLocaleDateString()}`, { align: "left" })
            .moveUp()
            .text(`Invoice ID: INV-${order._id}`, 320,130, { align: "right" })
            .text(`Invoice Date: ${new Date().toLocaleDateString()}`,  { align: "right" });
        doc.moveDown();

        // Line separator
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown();
        doc.moveDown();
        doc.moveDown();
       
       // Seller Address (Left Side)
// Seller Address (Left Side)
doc.fontSize(10).font('Helvetica-Bold');
doc.text("Seller Address:", 50, 190); // X=50 for left alignment
doc.font('Helvetica');
doc.text("34/8, East Hukupara, Gifirtok, Sadan", 50, 210);
doc.text("support@fruitkha.com", 50, 220);
doc.text("+00 111 222 3333", 50, 230);

// Shipping Address (Right Side)
doc.font('Helvetica-Bold');
doc.text("Shipping Address:", 420, 190); // X=350 for right alignment
doc.font('Helvetica');
doc.text(`Name: ${order.address.name || 'N/A'}`, 420, 210); // Fallback to 'N/A' if undefined
doc.text(`House Name: ${order.address.houseName || 'N/A'}`, 420, 220);
doc.text(`City: ${order.address.city || 'N/A'}`, 420, 230);
doc.text(`State: ${order.address.state || 'N/A'}`, 420, 240);
doc.text(`Pincode: ${order.address.pincode || 'N/A'}`, 420, 250);

// Horizontal Separator
doc.moveTo(50, 260).lineTo(550, 260).stroke();



        // Product Table
        doc.moveDown();

        const columnWidths = [150, 70, 70, 70, 70, 70]; // Define consistent column widths
const startX = 50; // Starting X position for the table
const rowHeight = 20; // Fixed row height
let tableY = doc.y + 20; // Initial Y position for the table, with spacing after headers

// Table Headers
const tableHeaders = ["Product Name", "Quantity", "Price", "Discount", "Shipping", "Total"];

// Render Table Headers
doc.fontSize(10).font('Helvetica-Bold');
let currentX = startX;
tableHeaders.forEach((header, index) => {
    doc.text(header, currentX-40, tableY, {
        width: columnWidths[index],
        align: 'center', // Center-align headers
    });
    currentX += columnWidths[index];
});

// Draw Line Below Headers
doc.moveTo(startX, tableY + rowHeight - 5)
    .lineTo(startX + columnWidths.reduce((a, b) => a + b, 0), tableY + rowHeight - 5)
    .stroke();

// Move to the next row
tableY += rowHeight;

// Render Table Rows
order.items.forEach(item => {
    const row = [
        item.productId?.name || 'Unknown Product', 
        item.quantity || 0,                       
        `₹${(item.productId?.salePrice || 0).toFixed(2)}`, // Price
        `₹${((item.productId?.price || 0) - (item.productId?.salePrice || 0)).toFixed(2)}`, // Discount
        `₹${order.shippingCost.toFixed(2)}`,      // Shipping
        `₹${((item.productId?.salePrice || 0) * item.quantity + order.shippingCost).toFixed(2)}` // Total
    ];

    currentX = startX-40; // Reset X position for each row
    row.forEach((value, index) => {
        doc.fontSize(10).font('Helvetica'); // Set font for row data
        doc.text(value, currentX, tableY, {
            width: columnWidths[index],
            align: 'center', // Center-align cell data
        });
        currentX += columnWidths[index]; // Move to next column
    });

    tableY += rowHeight; // Move to the next row
});


        

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