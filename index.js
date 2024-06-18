const express = require("express");
const app = express();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const cors = require("cors");

app.use(express.json());

// app.use(cors()); //using this our react project will connect on the 4000 port
require("dotenv").config();
// CORS configuration
const allowedOrigins = [
  "http://localhost:3000",
  "https://the-shopaholic.onrender.com",
];
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
        const msg =
          "The CORS policy for this site does not allow access from the specified Origin.";
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
  })
);

//Database connection with mongodb
mongoose.connect(process.env.MONGODB_URL);

//Image storage engine
const storage = multer.diskStorage({
  destination: "./upload/images",
  filename: (req, file, cb) => {
    return cb(
      null,
      `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`
    );
  },
});

const upload = multer({ storage: storage });

//creating upload endpoint for uploading images in the upload images folder
app.use("/images", express.static("upload/images"));

app.post("/upload", upload.single("product"), (req, res) => {
  res.json({
    success: 1,
    image_url: `http://localhost:${port}/images/${req.file.filename}`,
  });
});

//schema for creating products and adding it in the database
const Product = mongoose.model("Product", {
  // id: {
  //   type: Number,
  //   // type: mongoose.Schema.Types.ObjectId,
  //   required: true,
  //   // default: () => new mongoose.Types.ObjectId(),
  // },
  name: {
    type: String,
    required: true,
  },
  image: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
  },
  new_price: {
    type: Number,
    required: true,
  },
  old_price: {
    type: Number,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now(),
  },
  available: {
    type: Boolean,
    default: true,
  },
});

//API for adding a new product in our database

app.post("/addproduct", async (req, res) => {
  try {
    const product = new Product({
      name: req.body.name,
      image: req.body.image,
      category: req.body.category,
      new_price: req.body.new_price,
      old_price: req.body.old_price,
    });
    await product.save();
    console.log("Data is saved");
    res.json({
      success: true,
      product: product,
    });
  } catch (error) {
    console.error("Error saving product:", error);
    res.status(500).json({
      success: false,
      error: "An error occurred while saving the product.",
    });
  }
});

//Product is our schema here
//Creating api to delete products
app.post("/removeproduct", async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.body.id);
    console.log("Product is removed");
    res.json({
      success: true,
    });
  } catch (error) {
    console.error("Error removing product:", error);
    res.status(500).json({
      success: false,
      error: "An error occurred while removing the product.",
    });
  }
});

//Creating API for getting all products
app.get("/allproducts", async (req, res) => {
  let products = await Product.find({});
  console.log("All products fetched");
  res.send(products);
});

//Schmea creating for User model
const Users = mongoose.model("Users", {
  name: {
    type: String,
  },
  email: {
    type: String,
    unique: true,
  },
  password: {
    type: String,
  },
  cartData: {
    type: Object,
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

//Creating endpoint for registering the user
app.post("/signup", async (req, res) => {
  let check = await Users.findOne({ email: req.body.email });
  if (check) {
    return res.status(400).json({
      success: false,
      errors: "Existing user found with same email ",
    });
  }
  // let cart = {};
  // for (let i = 0; i < 300; i++) {
  //   cart[i] = 0;
  //}
  const user = new Users({
    name: req.body.username,
    email: req.body.email,
    password: req.body.password,
    //cartData: cart,
  });

  await user.save();
  const data = {
    user: {
      id: user._id,
    },
  };
  const token = jwt.sign(data, "secret_ecom");
  res.json({ success: true, token });
});

//creating api for user login
app.post("/login", async (req, res) => {
  let user = await Users.findOne({ email: req.body.email });
  if (user) {
    const passCompare = req.body.password === user.password;
    if (passCompare) {
      const data = {
        user: {
          id: user._id,
        },
      };
      const token = jwt.sign(data, "secret_ecom");
      res.json({ success: true, token });
    } else {
      res.json({
        success: false,
        errors: "wrong Password",
      });
    }
  } else {
    res.json({
      success: false,
      errors: "Wrong email id",
    });
  }
});

//creating endpoint for new collection data
app.get("/newcollection", async (req, res) => {
  let products = await Product.find({});
  let newcollection = products.slice(1).slice(-8);
  console.log("New collecction fetched");
  res.send(newcollection);
});
//creating endpoint for popular in women section
app.get("/popularinwomen", async (req, res) => {
  let products = await Product.find({
    category: "women",
  });
  let popular_in_women = products.slice(0, 4);
  console.log("Popular in women fetched");
  res.send(popular_in_women);
});

//creating middleware to fetch user
const fetchUser = async (req, res, next) => {
  const token = req.header("auth-token");
  if (!token) {
    res.status(401).send({ errors: "Please authenticate using valid token" });
  } else {
    try {
      const data = jwt.verify(token, "secret_ecom");
      req.user = data.user;
      next();
    } catch (error) {
      res.status(401).send({ eorrors: "Please autheticate" });
    }
  }
};

//creating end point for adding products in cartdata
//creating end point for adding products in cartdata
app.post("/addtocart", fetchUser, async (req, res) => {
  console.log("Added", req.body.itemId);
  let userData = await Users.findOne({ _id: req.user.id });
  if (!userData) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  if (!userData.cartData) {
    userData.cartData = {};
  }

  if (!userData.cartData[req.body.itemId]) {
    userData.cartData[req.body.itemId] = 0;
  }
  userData.cartData[req.body.itemId] += 1;
  await Users.findOneAndUpdate(
    {
      _id: req.user.id,
    },
    {
      cartData: userData.cartData,
    }
  );
  res.json({ success: true, message: "Added" });
});

// Endpoint to remove item from cart
app.post("/removefromcart", fetchUser, async (req, res) => {
  console.log("Removed", req.body.itemId);
  let userData = await Users.findOne({ _id: req.user.id });
  console.log(userData);
  if (userData.cartData[req.body.itemId] > 0)
    userData.cartData[req.body.itemId] -= 1;
  await Users.findOneAndUpdate(
    {
      _id: req.user.id,
    },
    {
      cartData: userData.cartData,
    }
  );
  res.json({ success: true, message: "Removd" });
});

// Using GET method for fetching cart data
app.post("/getcart", fetchUser, async (req, res) => {
  try {
    console.log("Get Cart");
    let userData = await Users.findOne({ _id: req.user.id });
    res.json(userData.cartData);
  } catch (error) {
    console.error("Error fetching cart data:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch cart data. Please try again later.",
    });
  }
});

const port = process.env.PORT || 5000;
app.use(express.static("client/build"));
app.get("*", (req, res) => {
  res.sendFile(
    path.resolve(__dirname + "/client/build/index.html"),
    function (err) {
      if (err) {
        console.log(err);
      }
    }
  );
});

app.listen(port, (error) => {
  if (!error) {
    console.log("Server is running on Port " + port);
  } else {
    console.log("Error" + error);
  }
});
