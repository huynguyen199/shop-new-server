const { Order } = require("../model/order");
const express = require("express");
const { OrderItem } = require("../model/order-item");
const router = express.Router();

router.get(`/`, async (req, res) => {
  const orderList = await Order.find().populate("user", "name").sort({
    dateOrdered: -1,
  });

  if (!orderList) {
    res.status(500).json({
      success: false,
    });
  }
  res.send(orderList);
});

router.get(`/:id`, async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate("user", "name")
    .populate({
      path: "orderItems",
      populate: {
        path: "product",
        populate: "category",
      },
    });

  if (!order) {
    res.status(500).json({
      success: false,
    });
  }
  res.send(order);
});

router.post("/", async (req, res) => {
  const orderItemsIds = Promise.all(
    req.body.orderItems.map(async (orderItem) => {
      let newOrderItem = new OrderItem({
        quantity: orderItem.quantity,
        product: orderItem.product,
      });

      newOrderItem = await newOrderItem.save();

      return newOrderItem._id;
    })
  );
  const orderItemsIdsResolved = await orderItemsIds;

  const totalPrices = Promise.all(
    orderItemsIdsResolved.map(async (orderItemId) => {
      const orderItem = await OrderItem.findById(orderItemId).populate(
        "product"
      );
      console.log(
        "🚀 ~ file: order.js ~ line 60 ~ totalPrices ~ orderItem",
        orderItem
      );

      const totalPrice = orderItem.product.price * orderItem.quantity;
      return totalPrice;
    })
  );
  const totalPrice = (await totalPrices).reduce((a, b) => a + b, 0);

  console.log("total", totalPrice);

  let order = new Order({
    orderItems: orderItemsIdsResolved,
    shippingAddress1: req.body.shippingAddress1,
    shippingAddress2: req.body.shippingAddress2,
    city: req.body.city,
    zip: req.body.zip,
    country: req.body.country,
    phone: req.body.phone,
    status: req.body.status,
    totalPrice: req.body.totalPrice,
    user: req.body.user,
  });
  order = await order.save();

  if (!order) return res.status(400).send("the order cannot be created!");

  res.send(order);
});

router.get("/get/totalsales", async (req, res) => {
  const totalSales = await Order.aggregate([
    {
      $group: {
        _id: null,
        totalsales: {
          $sum: "$totalPrice",
        },
      },
    },
  ]);
  console.log(
    "🚀 ~ file: order.js ~ line 98 ~ router.get ~ totalSales",
    totalSales
  );

  if (!totalSales) {
    return res.status(400).send("The order sales cannot be generated");
  }

  res.send({
    totalsales: totalSales.pop().totalsales,
  });
});

router.put("/:id", async (req, res) => {
  const order = await Order.findByIdAndUpdate(
    req.params.id,
    {
      status: req.body.status,
    },
    {
      new: true,
    }
  );

  if (!order) return res.status(400).send("the order cannot be created!");

  res.send(order);
});

router.delete("/:id", (req, res) => {
  Order.findByIdAndRemove(req.params.id)
    .then((order) => {
      if (order) {
        return res.status(200).json({
          success: true,
          message: "the order is deleted!",
        });
      } else {
        return res.status(404).json({
          success: false,
          message: "order not found!",
        });
      }
    })
    .catch((err) => {
      return res.status(500).json({
        success: false,
        error: err,
      });
    });
});

router.get(`/get/count`, async (req, res) => {
  const orderCount = await Order.countDocuments((count) => count);

  if (!orderCount) {
    res.status(500).json({
      success: false,
    });
  }
  res.send({
    orderCount: orderCount,
  });
});

router.get(`/get/userorders/:userid`, async (req, res) => {
  const userOrderList = await Order.find({ user: req.params.userid })
    .populate({
      path: "orderItems",
      populate: {
        path: "product",
        populate: "category",
      },
    })
    .sort({ dateOrdered: -1 });
    
  if (!userOrderList) {
    res.status(500).json({ success: false });
  }
  res.send(userOrderList);
});

module.exports = router;
