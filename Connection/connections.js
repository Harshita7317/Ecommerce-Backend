const mongoose = require("mongoose");
const connectDatabase = () => {
  try {
    mongoose
      .connect(
        "mongodb+srv://FullstackEcommerce:FullstackEcommerce@cluster0.yssj3kq.mongodb.net/e-commerce"
      )
      .then(() => {
        console.log("database connected");
      });
  } catch (error) {
    console.log(error);
  }
};
module.exports = { connectDatabase };
