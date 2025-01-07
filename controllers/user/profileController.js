const User = require('../../models/userSchema');
const Product = require('../../models/productSchema');
const Address = require('../../models/addressSchema');
const Order = require('../../models/orderSchema');
const env = require('dotenv').config();
console.log(process.env.NODMAILER_EMAIL, process.env.NODMAILER_PASSWORD);

const session = require('express-session');
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');
const passport = require('passport');

function generateOtp() {
  const digits = '1234567890';
  let otp = '';
  for (let i = 0; i < 6; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  return otp;
}

const sendVerificationEmail = async (email, otp) => {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: process.env.NODEMAILER_EMAIL,
        pass: process.env.NODEMAILER_PASSWORD,
      },
    });

    const mailOptions = {
      from: process.env.NODMAILER_EMAIL,
      to: email,
      subject: 'Your OTP for password reset',
      text: `your OTP is ${otp}`,
      html: `<b><h4>Your OTP:${otp}</h4><br></b>`,
    };
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('error sending email ', error);
    return false;
  }
};

const securePassword = async (password) => {
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    return passwordHash;
  } catch (error) {}
};

const getForgotPassPage = async (req, res) => {
  try {
    res.render('forgot-password');
  } catch (error) {
    console.error('error in rendering page');
  }
};

const forgotEmailValid = async (req, res) => {
  try {
    const { email } = req.body;
    const findUser = await User.findOne({ email: email });
    if (findUser) {
      const otp = generateOtp();
      const emailSent = await sendVerificationEmail(email, otp);
      if (emailSent) {
        req.session.userOtp = otp;
        req.session.email = email;
        res.render('forgotPass-otp');
        console.log('OTP: ', otp);
      } else {
        res.json({
          success: false,
          message: 'Failed to send OTP.Please try again',
        });
      }
    } else {
      res.render('forgot-password', {
        message: 'User with this email not exist',
      });
    }
  } catch (error) {
    console.error('error');
  }
};

const verifyForgotPassOtp = async (req, res) => {
  try {
    const enteredOtp = req.body.otp;
    if (enteredOtp === req.session.userOtp) {
      res.json({ success: true, redirectUrl: '/reset-password' });
    } else {
      res.json({ success: false, message: 'OTP Not matching' });
    }
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: 'An error occured ,Please try again' });
  }
};

const getResetPassPage = async (req, res) => {
  try {
    res.render('reset-password');
  } catch (error) {}
};

const resendOtp = async (req, res) => {
  try {
    const otp = generateOtp();
    req.session.userOtp = otp;
    const email = req.session.email;
    console.log('Resending OTP to mail:', email);
    const emailSent = await sendVerificationEmail(email, otp);
    if (emailSent) {
      console.log('Resend otp:', otp);
      res.status(200).json({ success: true, message: 'Resend otp successful' });
    }
  } catch (error) {
    console.error('Error in resend otp', error);
    res.status(500).json({ success: false, message: 'internal server error' });
  }
};

const postNewPassword = async (req, res) => {
  const { newPass1, newPass2 } = req.body;
  const email = req.session.email;
  console.log(email);
  if (newPass1 === newPass2) {
    const passwordHash = await securePassword(newPass1);
    await User.updateOne(
      { email: email },
      { $set: { password: passwordHash } }
    );
    res.redirect('/login');
  } else {
    res.render('reset-password', { message: 'Passwords do not match' });
  }
};

const getProfile = async (req, res) => {
  try {
    const userId = req.session.passport?.user;
    if (!userId) {
      return res.redirect('/login');
    }

    const user = await User.findById(userId).exec();

    if (!user) {
      return res.status(404).send('User not found');
    }

    const userAddress = await Address.findOne({ userId: userId }).exec();
    const orders = await Order.find({ userId: userId }).exec();

    const addresses = userAddress ? userAddress.address : [];

    res.render('profile', {
      user: {
        name: user.name,
        email: user.email,
        phone: user.phone,
        referralCode: user.referralCode,
        addresses: addresses,
      },
      orders: orders,
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).send('Internal Server Error');
  }
};

const getAddNewAddress = async (req, res) => {
  res.render('addNewAddress');
};

const addNewAddress = async (req, res) => {
  try {
    const { address = {} } = req.body;

    // console.log('Incoming data:', req.body);

    const requiredFields = [
      'name',
      'email',
      'phone',
      'country',
      'pincode',
      'state',
      'landMark',
      'city',
      'houseName',
    ];
    for (let field of requiredFields) {
      if (!address[field] || address[field].trim() === '') {
        return res.status(400).send(`Field ${field} is required!`);
      }
    }

    const newAddress = { ...address };

    let userAddress = await Address.findOne({ userId: req.user._id });

    if (userAddress) {
      userAddress.address.push(newAddress);
      await userAddress.save();
    } else {
      const addressDoc = new Address({
        userId: req.user._id,
        address: [newAddress],
      });
      await addressDoc.save();
    }

    res.redirect('/profile');
  } catch (error) {
    console.error('Error adding address:', error);
    res.status(500).send('Server Error');
  }
};
const getEditAddressForm = async (req, res) => {
  try {
    const address = await Address.findOne({ userId: req.user.id });

    if (!address) {
      return res.status(404).send('Address not found');
    }

    res.render('editAddressForm', {
      address: address.address[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error fetching address');
  }
};

const editAddress = async (req, res) => {
  try {
    const { address = {} } = req.body;
    const addressId = req.params.id;
    const userId = req.user._id;

    console.log('Address ID to update:', addressId);
    console.log('Address to update:', address);

    const updatedAddress = await Address.findOneAndUpdate(
      {
        userId: userId,
        'address._id': addressId,
      },
      {
        $set: { 'address.$': address },
      },
      { new: true }
    );

    if (!updatedAddress) {
      return res.status(404).send('Address not found');
    }

    res.redirect('/profile');
  } catch (error) {
    console.error('Error updating address:', error);
    res.status(500).send('Server error');
  }
};

const deleteAddress = async (req, res) => {
  try {
    const addressId = req.params.id;
    const userId = req.user._id;

    const result = await Address.updateOne(
      { userId: userId },
      { $pull: { address: { _id: addressId } } }
    );

    if (result.modifiedCount === 0) {
      return res.json({
        success: false,
        message: 'Address not found or already deleted.',
      });
    }
    res.redirct('/profile');
  } catch (err) {
    res.redirect('/profile');
  }
};
const cancelOrder = async (req, res) => {
  try {
    const orderId = req.body.orderId;
    const itemId = req.body.itemId;
    const userId = req.session.passport?.user;

    const order = await Order.findOne({
      _id: orderId,
      userId: userId,
    });

    if (!order) {
      req.flash('error_msg', 'Order not found');
      return res.redirect('/profile');
    }

    const itemToCancel = order.items.find(
      (item) => item._id.toString() === itemId
    );

    if (!itemToCancel) {
      req.flash('error_msg', 'Item not found');
      return res.redirect('/profile');
    }

    itemToCancel.status = 'Cancelled';

    const refundAmount = itemToCancel.quantity * itemToCancel.salePrice;

    const product = await Product.findById(itemToCancel.productId);
    if (product) {
      product.stock += itemToCancel.quantity;
      await product.save();
    }

    const user = await User.findById(userId);
    if (user) {
      user.walletBalance += refundAmount;

      user.walletTransactions.push({
        amount: refundAmount,
        date: new Date(),
        description: `Refund for canceled item in order #${order.orderID}`,
      });

      await user.save();
    }

    await order.save();

    req.flash(
      'success_msg',
      `Item cancelled. ₹${refundAmount} added to your wallet.`
    );
    return res.redirect('/profile');
  } catch (error) {
    console.error('Error:', error);
    req.flash('error_msg', 'Something went wrong');
    return res.redirect('/profile');
  }
};
const changePassword = async (req, res) => {
  try {
    const userId = req.session.passport?.user;
    const { currentPass, newPass1, newPass2 } = req.body;

    if (!userId) {
      return res.redirect('/login');
    }

    // Fetch user details from the database
    const user = await User.findById(userId);
    if (!user) {
      return res.status(400).render('profile', {
        user: req.user,
        orders: await Order.find({ userId }).exec(),
        message: 'User not found.',
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      currentPass,
      user.password
    );
    if (!isCurrentPasswordValid) {
      return res.render('profile', {
        user: req.user,
        orders: await Order.find({ userId }).exec(),
        message: 'Current password is incorrect.',
      });
    }

    // Check if new passwords match
    if (newPass1 !== newPass2) {
      return res.render('profile', {
        user: req.user,
        orders: await Order.find({ userId }).exec(),
        message: 'Passwords do not match.',
      });
    }

    const hashedPassword = await bcrypt.hash(newPass1, 10);

    // Update password in the database
    await User.updateOne({ _id: userId }, { password: hashedPassword });

    // Set success message and redirect
    req.session.message = 'Password changed successfully!';
    res.redirect('/profile');
  } catch (error) {
    console.error('Error changing password:', error);

    // Handle server error
    res.status(500).render('profile', {
      user: req.user,
      orders: await Order.find({ userId }).exec(),
      message: 'Internal Server Error. Please try again later.',
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    const userId = req.session.passport?.user;

    if (!userId) {
      return res.status(401).send('User not authenticated.');
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: { name, email, phone } },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).send('User not found.');
    }

    req.session.user = {
      ...req.session.user,
      name: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone,
    };

    res.redirect('/profile');
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).send('An error occurred. Please try again.');
  }
};

module.exports = {
  getProfile,
  getAddNewAddress,
  getForgotPassPage,
  forgotEmailValid,
  verifyForgotPassOtp,
  getResetPassPage,
  resendOtp,
  postNewPassword,
  addNewAddress,
  editAddress,
  deleteAddress,
  getEditAddressForm,
  cancelOrder,
  changePassword,
  updateProfile,
};
