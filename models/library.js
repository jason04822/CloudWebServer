const mongoose = require("mongoose");

// Book Schema
const bookSchema = new mongoose.Schema({
  title: { type: String, required: true },
  author: { type: String, required: true },
  borrower: { type: String, default: null }, // Borrower's name
  status: { type: String, default: "available" }, // 'available' or 'borrowed'
});

// User Schema (for login)
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

// Export Models
module.exports = {
  Book: mongoose.model("Book", bookSchema),
  User: mongoose.model("User", userSchema),
};