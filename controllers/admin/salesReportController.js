const Order = require('../../models/orderSchema');
const User = require('../../models/userSchema');
const Product = require('../../models/productSchema');
const ExcelJS = require('exceljs');
const moment = require('moment');
const PDFDocument = require('pdfkit');

// Controller: getSalesReport
const getSalesReport = async (req, res) => {
  try {
    const { filterType: period, startDate, endDate, page = 1 } = req.query;
    const limit = 4;
    const skip = (page - 1) * limit;

    let matchFilter = {
      'items.status': 'Delivered',
    };

    if (period === 'daily') {
      const today = new Date();
      matchFilter.createdAt = {
        $gte: new Date(today.setHours(0, 0, 0, 0)),
        $lte: new Date(today.setHours(23, 59, 59, 999)),
      };
    } else if (period === 'weekly') {
      const today = new Date();
      const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      matchFilter.createdAt = {
        $gte: lastWeek,
        $lte: today,
      };
    } else if (period === 'monthly') {
      const today = new Date();
      const lastMonth = new Date(
        today.getFullYear(),
        today.getMonth() - 1,
        today.getDate()
      );
      matchFilter.createdAt = {
        $gte: lastMonth,
        $lte: today,
      };
    } else if (period === 'yearly') {
      const today = new Date();
      const lastYear = new Date(
        today.getFullYear() - 1,
        today.getMonth(),
        today.getDate()
      );
      matchFilter.createdAt = {
        $gte: lastYear,
        $lte: today,
      };
    } else if (period === 'custom' && startDate && endDate) {
      matchFilter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const orderPipeline = [
      {
        $match: matchFilter,
      },
      {
        $lookup: {
          from: 'products',
          localField: 'items.productId',
          foreignField: '_id',
          as: 'productsInfo',
        },
      },
      {
        $addFields: {
          items: {
            $filter: {
              input: '$items',
              as: 'item',
              cond: { $eq: ['$$item.status', 'Delivered'] },
            },
          },
        },
      },
      {
        $match: {
          'items.0': { $exists: true },
        },
      },
      {
        $project: {
          orderID: 1,
          createdAt: 1,
          status: 1,
          paymentMethod: 1,
          paymentStatus: 1,
          items: 1,
          productsInfo: 1,
          totalCost: 1,
          products: {
            $map: {
              input: '$items',
              as: 'item',
              in: {
                name: {
                  $let: {
                    vars: {
                      product: {
                        $arrayElemAt: [
                          {
                            $filter: {
                              input: '$productsInfo',
                              cond: { $eq: ['$$this._id', '$$item.productId'] },
                            },
                          },
                          0,
                        ],
                      },
                    },
                    in: '$$product.name',
                  },
                },
                quantity: '$$item.quantity',
                price: { $ifNull: ['$$item.price', 0] },
                salePrice: { $ifNull: ['$$item.salePrice', 0] },
                status: '$$item.status',
                totalDiscount: {
                  $multiply: [
                    {
                      $subtract: [
                        { $ifNull: ['$$item.price', 0] },
                        { $ifNull: ['$$item.salePrice', 0] },
                      ],
                    },
                    '$$item.quantity',
                  ],
                },
                itemTotal: {
                  $multiply: [
                    { $ifNull: ['$$item.salePrice', 0] },
                    '$$item.quantity',
                  ],
                },
              },
            },
          },
          total: {
            $reduce: {
              input: '$items',
              initialValue: 0,
              in: {
                $add: [
                  '$$value',
                  {
                    $multiply: [
                      { $ifNull: ['$$this.salePrice', 0] },
                      '$$this.quantity',
                    ],
                  },
                ],
              },
            },
          },
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $skip: skip,
      },
      {
        $limit: limit,
      },
    ];

    const summaryPipeline = [
      {
        $match: matchFilter,
      },
      {
        $unwind: '$items',
      },
      {
        $match: {
          'items.status': 'Delivered',
        },
      },
      {
        $group: {
          _id: null,
          totalSalesCount: { $addToSet: '$_id' },
          totalAmount: {
            $sum: {
              $multiply: [
                { $ifNull: ['$items.salePrice', 0] },
                '$items.quantity',
              ],
            },
          },
          totalDiscount: {
            $sum: {
              $multiply: [
                {
                  $subtract: [
                    { $ifNull: ['$items.price', 0] },
                    { $ifNull: ['$items.salePrice', 0] },
                  ],
                },
                '$items.quantity',
              ],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          totalSalesCount: { $size: '$totalSalesCount' },
          totalOrderAmount: { $round: ['$totalAmount', 2] },
          totalDiscount: { $round: ['$totalDiscount', 2] },
          avgOrderValue: {
            $round: [
              { $divide: ['$totalAmount', { $size: '$totalSalesCount' }] },
              2,
            ],
          },
        },
      },
    ];

    const [orders, [summary = {}]] = await Promise.all([
      Order.aggregate(orderPipeline),
      Order.aggregate(summaryPipeline),
    ]);

    const totalOrders = await Order.countDocuments(matchFilter);
    const totalPages = Math.ceil(totalOrders / limit);

    res.render('salesReport', {
      orders,
      currentPage: parseInt(page),
      totalPages,
      totalOrders,
      period: period || 'all',
      startDate,
      endDate,
      reportData: {
        totalSalesCount: summary?.totalSalesCount || 0,
        totalOrderAmount: summary?.totalOrderAmount || 0,
        totalDiscount: summary?.totalDiscount || 0,
        avgOrderValue: summary?.avgOrderValue || 0,
      },
    });
  } catch (error) {
    console.error('Error fetching sales report:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error fetching sales report',
    });
  }
};

//download pdf
const downloadSalesReportPDF = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let filter = {};

    // Only apply date filter if both dates are provided
    if (startDate && endDate) {
      filter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    // Fetch all orders if no date range specified
    const orders = await Order.find(filter)
      .populate({
        path: 'items.productId',
        model: 'Product',
        select: 'name price salePrice productOffer',
      })
      .sort({ createdAt: -1 });

    let totalSalesCount = 0;
    let totalOrderAmount = 0;
    let totalDiscount = 0;

    // Process orders and calculate correct values - only for delivered items
    const formattedOrders = orders
      .flatMap((order) => {
        // Filter for delivered items only
        const deliveredItems = order.items.filter(
          (item) => item.status === 'Delivered'
        );

        return deliveredItems.map((item) => {
          // Get prices from the order items, fallback to product prices if needed
          const originalPrice = item.price || item.productId?.price || 0;
          const salePrice =
            item.salePrice || item.productId?.salePrice || originalPrice;
          const quantity = item.quantity || 0;
          const discountAmount = Math.max(
            0,
            (originalPrice - salePrice) * quantity
          );
          const itemTotal = salePrice * quantity;

          // Update totals
          totalSalesCount++;
          totalOrderAmount += itemTotal;
          totalDiscount += discountAmount;

          return {
            orderID: order.orderID || 'N/A',
            name: item.productId?.name || 'Unknown Product',
            quantity: quantity,
            price: originalPrice,
            discountPrice: salePrice,
            totalDiscount: discountAmount,
            itemTotal: itemTotal,
            orderStatus: item.status || 'Unknown',
            paymentMethod: order.paymentMethod || 'N/A',
            createdAt: order.createdAt,
            slNo: totalSalesCount,
          };
        });
      })
      .filter(Boolean);

    const doc = new PDFDocument({
      margin: 50,
      size: 'A4',
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=sales_report.pdf'
    );
    doc.pipe(res);

    // Header
    doc
      .fontSize(20)
      .font('Helvetica-Bold')
      .text('Sales Report', { align: 'center' });
    if (startDate && endDate) {
      doc
        .fontSize(12)
        .font('Helvetica')
        .text(
          `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`,
          { align: 'center' }
        );
    }
    doc.moveDown(1.5);

    const tableHeaders = [
      'Sl No',
      'Order ID',
      'Product',
      'Date',
      'Status',
      'Price',
      'Qty',
      'Discount',
      'Total',
      'Payment',
    ];

    const columnWidths = [40, 70, 120, 70, 70, 60, 40, 60, 60, 90];
    const startX = 50;
    let currentY = doc.y;

    // Header with background
    doc.fontSize(10).font('Helvetica-Bold');
    doc
      .fillColor('#f0f0f0')
      .rect(
        startX,
        currentY,
        columnWidths.reduce((a, b) => a + b, 0),
        20
      )
      .fill();

    doc.fillColor('#000000');
    tableHeaders.forEach((header, i) => {
      doc.text(
        header,
        startX + columnWidths.slice(0, i).reduce((a, b) => a + b, 0),
        currentY + 5,
        {
          width: columnWidths[i],
          align: 'center',
        }
      );
    });

    currentY += 20;

    // Draw rows
    doc.font('Helvetica').fontSize(9);

    formattedOrders.forEach((order, rowIndex) => {
      if (currentY > doc.page.height - 150) {
        doc.addPage();
        currentY = 50;
      }

      const row = [
        order.slNo,
        order.orderID,
        order.name,
        new Date(order.createdAt).toLocaleDateString(),
        order.orderStatus,
        `₹${order.price.toFixed(2)}`,
        order.quantity,
        `₹${order.totalDiscount.toFixed(2)}`,
        `₹${order.itemTotal.toFixed(2)}`,
        order.paymentMethod,
      ];

      // Alternate row colors
      if (rowIndex % 2 === 1) {
        doc
          .fillColor('#f9f9f9')
          .rect(
            startX,
            currentY,
            columnWidths.reduce((a, b) => a + b, 0),
            20
          )
          .fill();
      }

      doc.fillColor('#000000');
      row.forEach((text, i) => {
        doc.text(
          String(text),
          startX + columnWidths.slice(0, i).reduce((a, b) => a + b, 0),
          currentY + 5,
          {
            width: columnWidths[i],
            align: 'center',
          }
        );
      });

      currentY += 20;
    });

    // Summary section
    doc.moveDown(2);
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('Summary', { continued: false });
    doc.moveDown(1);

    const summaryBox = {
      x: startX,
      y: doc.y,
      width: 250,
      padding: 10,
    };

    doc.font('Helvetica').fontSize(10);

    [
      [`Total Sales Count:`, totalSalesCount],
      [`Total Order Amount:`, `₹${totalOrderAmount.toFixed(2)}`],
      [`Total Discount:`, `₹${totalDiscount.toFixed(2)}`],
    ].forEach(([label, value]) => {
      doc
        .text(label, summaryBox.x, doc.y, { continued: true })
        .font('Helvetica-Bold')
        .text(`  ${value}`, { continued: false })
        .font('Helvetica');
    });

    doc.end();
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating PDF',
      error: error.message,
    });
  }
};
const downloadSalesReportExcel = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let filter = {};

    if (startDate && endDate) {
      filter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const orders = await Order.find(filter)
      .populate({
        path: 'items.productId',
        model: 'Product',
        select: 'name',
      })
      .sort({ createdAt: -1 });

    let totalSalesCount = 0;
    let totalOrderAmount = 0;
    let totalDiscount = 0;

    // Process orders and calculate values - only for delivered items
    const formattedOrders = orders
      .flatMap((order) => {
        // Filter for delivered items only
        const deliveredItems = order.items.filter(
          (item) => item.status === 'Delivered'
        );

        return deliveredItems.map((item) => {
          const originalPrice = item.price || 0;
          const salePrice = item.salePrice || originalPrice;
          const quantity = item.quantity || 0;
          const discountAmount = Math.max(
            0,
            (originalPrice - salePrice) * quantity
          );
          const itemTotal = salePrice * quantity;

          // Update totals
          totalSalesCount++;
          totalOrderAmount += itemTotal;
          totalDiscount += discountAmount;

          return {
            slNo: totalSalesCount,
            orderID: order.orderID || 'N/A',
            name: item.productId?.name || 'Unknown Product',
            price: originalPrice,
            discountPrice: salePrice,
            quantity: quantity,
            totalDiscount: discountAmount,
            itemTotal: itemTotal,
            orderStatus: item.status,
            paymentMethod: order.paymentMethod,
            paymentStatus: order.paymentStatus,
            createdAt: order.createdAt,
          };
        });
      })
      .filter(Boolean);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sales Report');

    // Updated columns to match new data structure
    worksheet.columns = [
      { header: 'Sl.No', key: 'slNo', width: 5 },
      { header: 'Order ID', key: 'orderID', width: 10 },
      { header: 'Product Name', key: 'name', width: 20 },
      { header: 'Price', key: 'price', width: 10 },
      { header: 'Discount Price', key: 'discountPrice', width: 15 },
      { header: 'Quantity', key: 'quantity', width: 10 },
      { header: 'Total Discount', key: 'totalDiscount', width: 15 },
      { header: 'Item Total', key: 'itemTotal', width: 15 },
      { header: 'Order Status', key: 'orderStatus', width: 15 },
      { header: 'Payment Method', key: 'paymentMethod', width: 15 },
      { header: 'Payment Status', key: 'paymentStatus', width: 15 },
      { header: 'Date', key: 'createdAt', width: 15 },
    ];

    // Add formatted rows
    formattedOrders.forEach((item) => {
      worksheet.addRow({
        slNo: item.slNo,
        orderID: item.orderID,
        name: item.name,
        price: `₹${item.price.toFixed(2)}`,
        discountPrice: `₹${item.discountPrice.toFixed(2)}`,
        quantity: item.quantity,
        totalDiscount: `₹${item.totalDiscount.toFixed(2)}`,
        itemTotal: `₹${item.itemTotal.toFixed(2)}`,
        orderStatus: item.orderStatus,
        paymentMethod: item.paymentMethod,
        paymentStatus: item.paymentStatus,
        createdAt: new Date(item.createdAt).toLocaleDateString(),
      });
    });

    // Add a blank row before summary
    worksheet.addRow({});

    // Summary section
    worksheet.addRow({
      name: 'Summary',
    }).font = { bold: true };

    worksheet.addRow({
      name: 'Total Sales Count',
      price: totalSalesCount,
    }).font = { bold: true };

    worksheet.addRow({
      name: 'Total Order Amount',
      price: `₹${totalOrderAmount.toFixed(2)}`,
    }).font = { bold: true };

    worksheet.addRow({
      name: 'Total Discount',
      totalDiscount: `₹${totalDiscount.toFixed(2)}`,
    }).font = { bold: true };

    // Set headers and send response
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=sales_report.xlsx'
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error generating Excel:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating Excel',
      error: error.message,
    });
  }
};
module.exports = {
  getSalesReport,
  downloadSalesReportPDF,
  downloadSalesReportExcel,
};
