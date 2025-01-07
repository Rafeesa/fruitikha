const User = require('../../models/userSchema');
const Product = require('../../models/productSchema');
const Order = require('../../models/orderSchema');
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

    const addresses = await Address.find({ userId }).lean();

    let userAddresses = addresses.length > 0 ? addresses[0].address : [];

    const orders = await Order.find({ userId })
      .populate('items.productId', 'name productImage price')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalOrders = await Order.find({ userId }).countDocuments();
    const totalPages = Math.ceil(totalOrders / limit);

    res.render('myOrder', {
      orders,
      addresses: userAddresses,
      user: req.user,
      currentPage: page,
      totalPages: totalPages,
      totalOrders: totalOrders,
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).send('Server Error');
  }
};
const getOrderDetails = async (req, res) => {
  try {
    let page = parseInt(req.query.page) || 1;
    const userId = req.user._id;
    const limit = 4;
    const skip = (page - 1) * limit;

    const orderId = req.params.orderId;
    const order = await Order.findById(orderId)
      .populate('userId')
      .populate('items.productId')
      .lean();

    if (!order) {
      return res.redirect('/myOrder');
    }

    const addresses = await Address.find({ userId }).lean();

    let userAddresses = addresses.length > 0 ? addresses[0].address : [];

    const totalItems = order.items.length;
    const totalPages = Math.ceil(totalItems / limit);

    order.items = order.items.slice(skip, skip + limit);

    res.render('orderDetails', {
      order,
      user: order.userId,
      addresses: userAddresses,
      title: `Order #${order.orderID}`,
      currentPage: page,
      totalPages: totalPages,
    });
  } catch (error) {
    console.error(error);
    res.redirect('/myOrder');
  }
};
const handleReturnRequest = async (req, res) => {
  try {
    const { itemId, status } = req.body;

    if (!itemId || !status) {
      return res
        .status(400)
        .json({ success: false, message: 'Item ID and status are required.' });
    }

    const order = await Order.findOne({ orderID: req.params.id });

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: 'Order not found.' });
    }

    const item = order.items.find((item) => item._id.toString() === itemId);

    item.status = status;

    await order.save();

    if (!item) {
      return res
        .status(404)
        .json({ success: false, message: 'Item not found in order.' });
    }

    // More processing...
    res.json({ success: true, message: 'Return processed successfully.' });
  } catch (error) {
    console.error('Server Error:', error);
    res.status(500).json({ success: false, message: 'Server error occurred.' });
  }
};

const getInvoicePdf = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('items.productId')
      .exec();

    if (!order) {
      return res.status(404).send('Order not found');
    }

    const address = order.address;
    if (!address) {
      return res.status(404).send('No address found for this order');
    }

    // Create a new PDF document
    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="invoice-${order.orderID}.pdf"`
    );
    doc.pipe(res);

    // Title
    doc.fontSize(20).text('INVOICE', { align: 'center' });
    doc.moveDown(1.5);

    // Order and Invoice Details
    doc
      .fontSize(12)
      .text(`Order ID: ${order.orderID}`, 50, 130, { align: 'left' })
      .text(`Order Date: ${new Date(order.createdAt).toLocaleDateString()}`, {
        align: 'left',
      })
      .moveUp()
      .text(`Invoice ID: INV-${order._id}`, 320, 130, { align: 'right' })
      .text(`Invoice Date: ${new Date().toLocaleDateString()}`, {
        align: 'right',
      });
    doc.moveDown();

    // Line separator
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(3);

    // Addresses
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Seller Address:', 50, 190);
    doc.font('Helvetica');
    doc.text('34/8, East Hukupara, Gifirtok, Sadan', 50, 210);
    doc.text('support@fruitkha.com', 50, 220);
    doc.text('+00 111 222 3333', 50, 230);

    doc.font('Helvetica-Bold');
    doc.text('Shipping Address:', 420, 190);
    doc.font('Helvetica');
    doc.text(`Name: ${order.address.name || 'N/A'}`, 420, 210);
    doc.text(`House Name: ${order.address.houseName || 'N/A'}`, 420, 220);
    doc.text(`City: ${order.address.city || 'N/A'}`, 420, 230);
    doc.text(`State: ${order.address.state || 'N/A'}`, 420, 240);
    doc.text(`Pincode: ${order.address.pincode || 'N/A'}`, 420, 250);

    // Horizontal Separator
    doc.moveTo(50, 260).lineTo(550, 260).stroke();
    doc.moveDown();

    const columnWidths = [150, 70, 70, 70, 70];
    const startX = 50;
    const rowHeight = 20;
    let tableY = doc.y + 20;

    const tableHeaders = [
      'Product Name',
      'Quantity',
      'Price',
      'Discount',
      'Subtotal',
    ];

    // Render Table Headers
    doc.fontSize(10).font('Helvetica-Bold');
    let currentX = startX;
    tableHeaders.forEach((header, index) => {
      doc.text(header, currentX - 40, tableY, {
        width: columnWidths[index],
        align: 'center',
      });
      currentX += columnWidths[index];
    });

    // Draw Line Below Headers
    doc
      .moveTo(startX, tableY + rowHeight - 5)
      .lineTo(
        startX + columnWidths.reduce((a, b) => a + b, 0),
        tableY + rowHeight - 5
      )
      .stroke();

    tableY += rowHeight;

    let subtotal = 0;

    // Render Table Rows
    order.items.forEach((item) => {
      if (item.status === 'return' || item.status === 'Return Requested') {
        return;
      }

      const itemSubtotal = (item.productId?.salePrice || 0) * item.quantity;
      subtotal += itemSubtotal;

      const row = [
        item.productId?.name || 'Unknown Product',
        item.quantity || 0,
        `₹${item.productId?.salePrice || 0}`,
        `₹${(item.productId?.price || 0) - (item.productId?.salePrice || 0)}`,
        `₹${itemSubtotal.toFixed(2)}`,
      ];

      currentX = startX - 40;
      row.forEach((value, index) => {
        doc.fontSize(10).font('Helvetica');
        doc.text(value, currentX, tableY, {
          width: columnWidths[index],
          align: 'center',
        });
        currentX += columnWidths[index];
      });

      tableY += rowHeight;
    });

    // Draw line before totals
    tableY += 10;
    doc.moveTo(50, tableY).lineTo(550, tableY).stroke();
    tableY += 20;

    // Display totals
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Subtotal:', 350, tableY);
    doc.text(`₹${subtotal.toFixed(2)}`, 450, tableY);

    tableY += 20;
    doc.text('Shipping:', 350, tableY);
    doc.text(`₹${order.shippingCost.toFixed(2)}`, 450, tableY);

    tableY += 20;
    const total = subtotal + order.shippingCost;
    doc.fontSize(12).font('Helvetica-Bold');
    doc.text('Total:', 350, tableY);
    doc.text(`₹${total.toFixed(2)}`, 450, tableY);

    // Finalize the PDF
    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).send('Error generating invoice');
  }
};
module.exports = {
  getOrders,
  handleReturnRequest,
  getInvoicePdf,
  getOrderDetails,
};
