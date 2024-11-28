const Order = require('../../models/orderSchema');
const User = require('../../models/userSchema'); 
const Product = require('../../models/productSchema');
const ExcelJS = require('exceljs');
const moment = require('moment');
const PDFDocument = require('pdfkit');



const getSalesReport = async (req, res) => {
    try {
        const { filterType: period, startDate, endDate, page = 1 } = req.query;

        const limit = 4; // Items per page
        const skip = (page - 1) * limit;

        const filter = { status: 'Delivered' }; // Only include delivered orders

        // Date filters
        if (period === 'daily') {
            const today = new Date();
            const startOfDay = new Date(today.setHours(0, 0, 0, 0));
            const endOfDay = new Date(today.setHours(23, 59, 59, 999));
            filter.createdAt = { $gte: startOfDay, $lte: endOfDay };
        } else if (period === 'weekly') {
            const startOfWeek = moment().startOf('week').toDate();
            const endOfWeek = moment().endOf('week').toDate();
            filter.createdAt = { $gte: startOfWeek, $lte: endOfWeek };
        } else if (period === 'monthly') {
            const startOfMonth = moment().startOf('month').toDate();
            const endOfMonth = moment().endOf('month').toDate();
            filter.createdAt = { $gte: startOfMonth, $lte: endOfMonth };
        } else if (period === 'yearly') {
            const startOfYear = new Date(new Date().getFullYear(), 0, 1);
            const endOfYear = new Date(new Date().getFullYear(), 11, 31);
            filter.createdAt = { $gte: startOfYear, $lte: endOfYear };
        } else if (startDate && endDate) {
            filter.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }

        // Fetch paginated orders
        let orders = await Order.find(filter)
            .populate({
                path: 'items.productId',
                model: 'Product',
                select: 'name price salePrice productOffer',
            })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        // Calculate overall metrics
        const allOrders = await Order.find(filter);
        const totalSalesCount = allOrders.length;

        const totalOrderAmount = allOrders.reduce((sum, order) => {
            const orderAmount = order.totalCost || order.items.reduce((itemSum, item) => {
                const salePrice = item.productId?.salePrice || item.productId?.price || 0;
                return itemSum + salePrice * item.quantity;
            }, 0);
            return sum + orderAmount;
        }, 0);

        const calculateDiscount = (orders) => {
            let totalDiscount = 0;

            orders.forEach((order) => {
                order.items.forEach((item) => {
                    if (item.productId) {
                        const originalPrice = item.productId.price || 0;
                        const salePrice = item.productId.salePrice || originalPrice;
                        const discount = (originalPrice - salePrice) * item.quantity;

                        totalDiscount += discount;

                        console.log("Discount Details:", {
                            productName: item.productId.name,
                            originalPrice,
                            salePrice,
                            discount,
                        });
                    }
                });
            });

            console.log("Total Discount:", totalDiscount);
            return totalDiscount;
        };

        const totalDiscount = calculateDiscount(orders);

        // Map formatted orders
        const formattedOrders = orders.map((order, index) => ({
            slNo: skip + index + 1,
            products: order.items.map(item => {
                const originalPrice = item.productId?.price || 0;
                const salePrice = item.productId?.salePrice || originalPrice;
                const discountAmount = originalPrice - salePrice;

                return {
                    name: item.productId?.name || 'Unknown Product',
                    price: originalPrice,
                    discountPrice: salePrice,
                    totalDiscount: discountAmount > 0 ? discountAmount : 0,
                };
            }),
            orderStatus: order.status,
            paymentMethod: order.paymentMethod,
            paymentStatus: 'Paid',
            createdAt: order.createdAt,
        }));

        // Pagination details
        const totalOrders = await Order.countDocuments(filter);
        const totalPages = Math.ceil(totalOrders / limit);

        // Render view
        res.render('salesReport', {
            orders: formattedOrders,
            currentPage: parseInt(page),
            totalPages,
            totalOrders,
            period,
            startDate,
            endDate,
            reportData: {
                totalSalesCount,
                totalOrderAmount,
                totalDiscount,
            },
        });
    } catch (error) {
        console.error("Error fetching sales report:", error.message);
        res.status(500).json({ success: false, message: "Error fetching sales report" });
    }
};



//Download pdf

const downloadSalesReportPDF = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const filter = { status: 'Delivered' };

        if (startDate && endDate) {
            filter.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate),
            };
        }

        const orders = await Order.find(filter).populate({
            path: 'items.productId',
            model: 'Product',
            select: 'name price salePrice productOffer',
        });

        const formattedOrders = orders.map((order, index) => ({
            slNo: index + 1,
            products: order.items.map(item => {
                const originalPrice = item.productId?.price || 0;
                const salePrice = item.productId?.salePrice || 0;
                const discountAmount = originalPrice - salePrice;

                return {
                    name: item.productId?.name || 'Unknown Product',
                    price: originalPrice.toFixed(2),
                    discountPrice: salePrice.toFixed(2),
                    totalDiscount: discountAmount > 0 ? discountAmount.toFixed(2) : '0.00',
                };
            }),
            orderStatus: order.status,
            paymentMethod: order.paymentMethod,
            paymentStatus: 'Paid',
            createdAt: order.createdAt,
        }));

        const doc = new PDFDocument({ margin: 5 });
res.setHeader('Content-Type', 'application/pdf');
res.setHeader('Content-Disposition', 'attachment; filename=sales_report.pdf');
doc.pipe(res);

// Title
doc.fontSize(18).text('Sales Report', { align: 'center' }).moveDown(1.5);

// Table Headers (displayed once)
const tableHeaders = [
    'Order No', 'Product Name','Date', 'Order Status',
    'Price', 'Discount Price', 'Total Discount' ,'Payment Method'
];
const columnWidths = [50,80,70, 70, 60, 60, 60, 90];
const startX = 30;
let tableY = doc.y;

// Render the Table Headers
doc.fontSize(10).font('Helvetica-Bold');
tableHeaders.forEach((header, index) => {
    doc.text(header, startX + columnWidths.slice(0, index).reduce((a, b) => a + b, 0), tableY, {
        width: columnWidths[index],
        align: 'center',
    });
});

// Add the line below the headers
doc.moveTo(startX, tableY + 20)
    .lineTo(startX + columnWidths.reduce((a, b) => a + b, 0), tableY + 20)
    .stroke();

// Adjust the Y position after headers
doc.y = tableY + 25;

// Function to render a single row
const renderRow = (row, startX, columnWidths, doc) => {
    let rowY = doc.y; // Save current Y position for consistent alignment

    row.forEach((value, index) => {
        doc.text(value, startX + columnWidths.slice(0, index).reduce((a, b) => a + b, 0), rowY, {
            width: columnWidths[index],
            align: 'center',
        });
    });

    // Draw a line below the row
    doc.moveTo(startX, rowY + 15)
       .lineTo(startX + columnWidths.reduce((a, b) => a + b, 0), rowY + 15)
       .stroke();

    // Update Y position for the next row
    doc.y = rowY + 20;
};

formattedOrders.forEach(order => {
    order.products.forEach(product => {
        const row = [
            order.slNo,
            product.name,
            new Date(order.createdAt).toLocaleDateString(),
            order.orderStatus,
          
           
            product.price,
            product.discountPrice,
            product.totalDiscount,
            order.paymentMethod,
        ];

        // Render the row
        renderRow(row, startX, columnWidths, doc);
    });
});

doc.end();

        
        
    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).json({ success: false, message: 'Error generating PDF' });
    }
};

/*
const downloadSalesReportExcel = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const filter = { status: 'Delivered' };

        if (startDate && endDate) {
            filter.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        const orders = await Order.find(filter)
            .populate({
                path: 'items.productId',
                model: 'Product',
                select: 'name price salePrice productOffer'
            });

            const formattedOrders = orders.map((order, index) => ({
                slNo: index + 1,
                products: order.items.map(item => {
                    // Ensure item.productId exists and has price and salePrice defined
                    const originalPrice = item.productId && item.productId.price ? item.productId.price : 0;
                    const salePrice = item.productId && item.productId.salePrice ? item.productId.salePrice : 0;
                    const discountAmount = originalPrice - salePrice;
    
                    return {
                        name: item.productId ? item.productId.name : 'Unknown Product',
                        price: originalPrice,
                        discountPrice: salePrice,
                        totalDiscount: discountAmount > 0 ? discountAmount : 0 // Show discount as amount
                    };
                }),
            orderStatus: order.status,
            paymentMethod: order.paymentMethod,
            paymentStatus: 'Paid',
            createdAt: order.createdAt
        }));

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Sales Report');

        worksheet.columns = [
            { header: 'S.No', key: 'slNo', width: 5 },
            { header: 'Product Name', key: 'productName', width: 20 },
            { header: 'Price', key: 'price', width: 10 },
            { header: 'Discount Price', key: 'discountPrice', width: 15 },
            { header: 'Total Discount', key: 'totalDiscount', width: 15 },
            { header: 'Order Status', key: 'orderStatus', width: 15 },
            { header: 'Payment Method', key: 'paymentMethod', width: 20 },
            { header: 'Payment Status', key: 'paymentStatus', width: 15 },
            { header: 'Date', key: 'createdAt', width: 15 },
           
           
        ];

        formattedOrders.forEach(order => {
            order.products.forEach(product => {
                worksheet.addRow({
                    slNo: order.slNo,
                    productName: product.name, 
                    price: product.price,
                    discountPrice: product.discountPrice,
                    totalDiscount: product.totalDiscount,
                    createdAt: new Date(order.createdAt).toLocaleDateString(),
                    orderStatus: order.orderStatus,
                    paymentMethod: order.paymentMethod,
                    paymentStatus: order.paymentStatus,
                  
                   
                   
                });
            });
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=sales_report.xlsx');

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error("Error generating Excel:", error);
        res.status(500).json({ success: false, message: "Error generating Excel" });
    }
};

*/
const downloadSalesReportExcel = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const filter = { status: 'Delivered' };

        if (startDate && endDate) {
            filter.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        const orders = await Order.find(filter)
            .populate({
                path: 'items.productId',
                model: 'Product',
                select: 'name price salePrice productOffer'
            });

        // Total Sales Count
        const totalSalesCount = orders.length;

        // Total Order Amount & Total Discount Calculation
        let totalOrderAmount = 0;
        let totalDiscount = 0;

        orders.forEach(order => {
            order.items.forEach(item => {
                const originalPrice = item.productId?.price || 0;
                const salePrice = item.productId?.salePrice || originalPrice;
                const quantity = item.quantity || 1;

                totalOrderAmount += salePrice * quantity;
                totalDiscount += (originalPrice - salePrice) * quantity;
            });
        });

        // Formatting orders for Excel
        const formattedOrders = orders.map((order, index) => ({
            slNo: index + 1,
            products: order.items.map(item => {
                const originalPrice = item.productId?.price || 0;
                const salePrice = item.productId?.salePrice || originalPrice;
                const quantity = item.quantity || 1;
                const discountAmount = (originalPrice - salePrice) * quantity;

                return {
                    name: item.productId?.name || 'Unknown Product',
                    price: originalPrice,
                    discountPrice: salePrice,
                    quantity,
                    totalDiscount: discountAmount > 0 ? discountAmount : 0,
                };
            }),
            orderStatus: order.status,
            paymentMethod: order.paymentMethod,
            paymentStatus: 'Paid',
            createdAt: order.createdAt,
        }));

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Sales Report');

        worksheet.columns = [
            { header: 'S.No', key: 'slNo', width: 5 },
            { header: 'Product Name', key: 'productName', width: 20 },
            { header: 'Price', key: 'price', width: 10 },
            { header: 'Discount Price', key: 'discountPrice', width: 15 },
            { header: 'Quantity', key: 'quantity', width: 10 },
            { header: 'Total Discount', key: 'totalDiscount', width: 15 },
            { header: 'Order Status', key: 'orderStatus', width: 15 },
            { header: 'Payment Method', key: 'paymentMethod', width: 20 },
            { header: 'Payment Status', key: 'paymentStatus', width: 15 },
            { header: 'Date', key: 'createdAt', width: 15 },
        ];

        formattedOrders.forEach(order => {
            order.products.forEach(product => {
                worksheet.addRow({
                    slNo: order.slNo,
                    productName: product.name,
                    price: product.price,
                    discountPrice: product.discountPrice,
                    quantity: product.quantity,
                    totalDiscount: product.totalDiscount,
                    createdAt: new Date(order.createdAt).toLocaleDateString(),
                    orderStatus: order.orderStatus,
                    paymentMethod: order.paymentMethod,
                    paymentStatus: order.paymentStatus
                });
            });
        });

        // Add a blank row before the summary
        worksheet.addRow({});

        // Summary section
        worksheet.addRow({ productName: 'Summary', price: '', discountPrice: '', totalDiscount: '' }).font = { bold: true };
        worksheet.addRow({
            productName: 'Total Sales Count',
            price: totalSalesCount,
            discountPrice: '',
            totalDiscount: ''
        }).font = { bold: true };

        worksheet.addRow({
            productName: 'Total Order Amount',
            price: `₹${totalOrderAmount.toFixed(2)}`,
            discountPrice: '',
            totalDiscount: ''
        }).font = { bold: true };

        worksheet.addRow({
            productName: 'Total Discount',
            price: '',
            discountPrice: '',
            totalDiscount: `₹${totalDiscount.toFixed(2)}`
        }).font = { bold: true };

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=sales_report.xlsx');

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error("Error generating Excel:", error);
        res.status(500).json({ success: false, message: "Error generating Excel" });
    }
};

module.exports={
    getSalesReport,
    downloadSalesReportPDF,
   downloadSalesReportExcel,

}