import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import Stripe from "stripe";
import dotenv from "dotenv";

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Placing user order and redirecting to Stripe Checkout
const placeOrder = async (req, res) => {
  const frontend_url = "http://localhost:5173"; // Change to deployed frontend URL in production

  try {
    // Save order details in the database
    const newOrder = new orderModel({
      userId: req.body.userId,
      items: req.body.items,
      amount: req.body.amount, 
      address: req.body.address,
    });

    await newOrder.save();
    await userModel.findByIdAndUpdate(req.body.userId, { cartData: {} });

    // Stripe line items (ensure correct structure)
    const line_items = req.body.items.map((item) => ({
      price_data: {
        currency: "usd",
        product_data: {
          name: item.name,
        },
        unit_amount: Math.round(item.price * 100), // Convert price to cents
      },
      quantity: item.quantity,
    }));

    // Add delivery charges
    line_items.push({
      price_data: {
        currency: "usd",
        product_data: {
          name: "Delivery Charges",
        },
        unit_amount: 200, // $2.00 in cents
      },
      quantity: 1,
    });

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"], // Ensure only card payments are allowed
      line_items: line_items,
      mode: "payment",
      success_url: `${frontend_url}/verify?success=true&orderId=${newOrder._id}`,
      cancel_url: `${frontend_url}/verify?success=false&orderId=${newOrder._id}`
    });

    console.log("Stripe Session URL:", session.url); // Debugging
    res.json({ success: true, session_url: session.url });
  } catch (err) {
    console.error("Error in placeOrder:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

const verifyOrder = async (req, res) => {
  const { orderId, success } = req.body;
  try{
    if(success=="true"){
    await orderModel.findByIdAndUpdate(orderId,{payment:true});
    res.json({success:true,message:"Paid"});
    }
    else{
      await orderModel.findByIdAndDelete(orderId);
      res.json({success:false,message:"Not Paid"});
    }
    
  }
  catch(err){
      console.log(err);
      res.json({success:false,message:"Error"});
  }
}

//user orders for frontend
const userOrders=async(req,res)=>{
try{
const orders=await orderModel.find({userId:req.body.userId});
res.json({success:true,orders});
}
catch(err){
console.log(err);
res.json({success:false,message:"Error"});
}
}

//Listing orders for admin panel
const listOrders=async(req,res)=>{
  try{
  const orders=await orderModel.find({});
  res.json({success:true,data:orders});
  }
  catch(err){
  console.log(err);
  res.json({success:false,message:"Error"});
  }
}


//api for updating order status
const updateStatus=async(req,res)=>{
try{
await orderModel.findByIdAndUpdate
(req.body.orderId,{status:req.body.status});
res.json({success:true,message:"Status Updated"});
}
catch(err){
console.log(err);
res.json({success:false,message:"Error"});
}
}

export { placeOrder, verifyOrder,userOrders,listOrders,updateStatus };
