const Booking = require("../models/Booking");
const Restaurant = require("../models/Restaurant");
const User = require("../models/User");
const { sendMail } = require("./mails");

//@desc     Get all bookings
//@route    GET /api/v1/bookings
//@access   Private
exports.getBookings = async (req, res, next) => {
  let query;
  let restaurantId = req.query["restaurantId"];
  if (req.user.role !== "admin") {
    if (restaurantId) {
      query = Booking.find({
        user: req.user.id,
        restaurant: restaurantId,
      }).populate({
        path: "restaurant",
        select: "name address tel",
      });
    } else {
      query = Booking.find({
        user: req.user.id,
      }).populate({
        path: "restaurant",
        select: "name address tel",
      });
    }
  } else {
    if (restaurantId) {
      query = Booking.find({ restaurant: restaurantId })
        .populate({
          path: "restaurant",
          select: "name address tel",
        })
        .populate({
          path: "user",
          select: "name email tel",
        });
    } else {
      query = Booking.find()
        .populate({
          path: "restaurant",
          select: "name address tel",
        })
        .populate({
          path: "user",
          select: "name email tel",
        });
    }
  }
  try {
    const bookings = await query;
    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ success: false, message: "Cannot find Booking" });
  }
};

//@desc     Get single booking
//@route    GET /api/v1/bookings/:id
//@access   Private
exports.getBooking = async (req, res, next) => {
  let booking;
  try {
    booking = await Booking.findById(req.params.id)
      .populate({
        path: "restaurant",
        select: "name address tel",
      })
      .populate({
        path: "user",
        select: "name email tel",
      });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: `No booking with the id of ${req.params.id}`,
      });
    }

    if (booking.user.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(401).json({
        success: false,
        message: `User ${req.user.id} is not authorized to view this booking`,
      });
    }

    res.status(200).json({ success: true, data: booking });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ success: false, message: "Cannot find Booking" });
  }
};

//@desc     Add booking
//@route    POST /api/v1/restaurants/:restaurantId/bookings
//@access   Private
exports.addBooking = async (req, res, next) => {
  try {
    req.body.restaurant = req.params.restaurantId;
    const restaurant = await Restaurant.findById(req.params.restaurantId);
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: `No restaurant with the id of ${req.params.restaurantId}`,
      });
    }
    req.body.user = req.user.id;

    // only allow the registered user to book up to 3 tables
    const bookingDate = new Date(req.body.bookingDate);
    const existedBookings = await Booking.find({ user: req.user.id });

    if (existedBookings.length >= 3) {
      return res.status(400).json({
        success: false,
        message: `The user with ID ${req.user.id} has already made 3 bookings`,
      });
    } else {
      const booking = await Booking.create(req.body);
      res.status(200).json({
        success: true,
        data: booking,
      });

      User.findById(req.user.id, function (err, user) {
        if (err) {
          console.log(err);
        } else {
          sendMail(user, booking);
        }
      });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Cannot create Booking",
    });
  }
};

//@desc     Update booking
//@route    PUT /api/v1/bookings/:id
//@access   Private
exports.updateBooking = async (req, res, next) => {
  try {
    let booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: `No booking with the id of ${req.params.id}`,
      });
    }
    if (booking.user.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(401).json({
        success: false,
        message: `User ${req.user.id} is not authorized to update this booking`,
      });
    }

    booking = await Booking.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    res.status(200).json({
      success: true,
      data: booking,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Cannot update Booking",
    });
  }
};

//@desc     Delete booking
//@route    DELETE /api/v1/bookings/:id
//@access   Private
exports.deleteBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: `No booking with the id of ${req.params.id}`,
      });
    }
    if (booking.user.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(401).json({
        success: false,
        message: `User ${req.user.id} is not authorized to delete this booking`,
      });
    }
    await booking.remove();
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Cannot delete Booking",
    });
  }
};
