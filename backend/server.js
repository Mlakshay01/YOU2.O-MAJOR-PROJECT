const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

mongoose
  .connect("mongodb+srv://aashi:12345@cluster0.rel1lys.mongodb.net/")
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log(err));

app.listen(5000, () => {
  console.log("Server running on port 5000");
});

// signup api
const User = require("./models/User");
const bcrypt = require("bcryptjs");

app.post("/Signup", async (req, res) => {
  try {
    const { name, email, password,phone,age, height, weight, gender } = req.body;

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      phone,
      age,
      height,
      weight,
      gender,
    });

    await newUser.save();

    res.json({ message: "User registered successfully" });

    //   } catch(error){
    //     res.status(500).json({error:error.message});
    //   }
  } catch (error) {
    console.log(error);
    alert(JSON.stringify(error.response?.data));
  }
});

//login api
// app.post("/Login", async (req, res) => {
//   const { email, password } = req.body;

//   const user = await User.findOne({ email });



//   if (!user) {
//     return res.status(400).json({ message: "User not found" });
//   }

//   const isMatch = await bcrypt.compare(password, user.password);

//   if (!isMatch) {
//     return res.status(400).json({ message: "Invalid password" });
//   }

//   res.json({
//     message: "Login successful",
//     user: user,
//   });
// });


// LOGIN API
app.post("/Login", async (req, res) => {
  try {

    const { email, password } = req.body;

    const user = await User.findOne({ email });

    // USER NOT REGISTERED
    if (!user) {
      return res.status(404).json({
        message: "User not registered. Please sign up first."
      });
    }

    
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        message: "Incorrect password"
      });
    }

    res.status(200).json({
      message: "Login successful",
      user: user
    });

  } catch (error) {

    res.status(500).json({
      message: "Server error"
    });

  }
});