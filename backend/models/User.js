const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  height: Number,
  weight: Number,
  gender: String
});

module.exports = mongoose.model("User", UserSchema);