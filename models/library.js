const mongoose = require("mongoose");

const bookSchema = new mongoose.Schema({
  title: { type: String, required: true },
  author: { type: String, required: true },
  borrower: { type: String, default: null }, 
  status: { type: String, default: "available" }, 
});

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

module.exports = {
  Book: mongoose.model("Book", bookSchema),
  User: mongoose.model("User", userSchema),
};
