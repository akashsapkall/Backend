// test-cloudinary.js
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name:"",
  api_key: "",
  api_secret:""
});

cloudinary.uploader.upload("1743524102086_defaultAvtar.png", (error, result) => {
  if (error) {
    console.error("Cloudinary test failed:", error);
  } else {
    console.log("Cloudinary test success:", result.url);
  }
});