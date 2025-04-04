import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { User } from "../models/user.models.js";

const generateAccessAndRefreshToken = async (user) => {
  try {
    // const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    if(!accessToken && !refreshToken){
      throw new ApiError(
        500,
        "Something went wrong while generating Access and Refresh Token !!"
      );
    }
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating Access and Refresh Token !!"
    );
  }
};
const registerUser = asyncHandler(async (req, res) => {
  const { username, fullName, email, password } = req.body;
  // console.log("REQUEST BODY:",req.body);
  // Check for empty fields
  if ([username, fullName, email, password].some((field) => !field?.trim())) {
    throw new ApiError(400, "All fields are required!");
  }

  // Check for existing user
  const existedUser = await User.findOne({ $or: [{ username }, { email }] });
  if (existedUser) {
    throw new ApiError(409, "Username or email already exists!");
  }

  // Handle avatar (required)
  // console.log("REQUEST FILES:",req.files);
  const avatarFiles = req.files?.avatar;
  if (!avatarFiles || avatarFiles.length === 0) {
    throw new ApiError(400, "Avatar file is required!");
  }
  const avatarLocalPath = avatarFiles[0].path;

  // Handle coverImg (optional)
  let coverImgLocalPath;
  if (req.files?.coverImg && req.files.coverImg.length > 0) {
    coverImgLocalPath = req.files.coverImg[0].path;
  }

  // Upload to Cloudinary
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  if (!avatar?.url) {
    throw new ApiError(500, "Failed to upload avatar!");
  }

  let coverImg;
  if (coverImgLocalPath) {
    coverImg = await uploadOnCloudinary(coverImgLocalPath);
    if (!coverImg?.url) {
      throw new ApiError(500, "Failed to upload cover image!");
    }
  }

  // Create user
  const user = await User.create({
    fullName,
    username: username.toLowerCase(),
    email,
    password,
    avatar: avatar.url,
    coverImg: coverImg?.url || "",
  });

  // Fetch user without sensitive data
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  if (!createdUser) {
    throw new ApiError(500, "Failed to register user!");
  }

  // Return response
  return res
    .status(201)
    .json(new ApiResponse(201, createdUser, "User registered successfully!"));
});

const loginUser = asyncHandler(async (req, res) => {
    // validator.isEmail(emailorUsername)
  // console.log(req.body);
  const { username, email, password } = req.body;
  if (!username && !email) {
    throw new ApiError(400, "username or email required !!");
  }
  if (!password) {
    throw new ApiError(400, "password is required !!");
  }
  const user = await User.findOne({
    $or: [{ username }, { email:email?.toLowerCase() }],
  });
  if (!user) {
    throw new ApiError(404, "Invalid Credentials !!");
  }
  
  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid Credentials !!");
  }
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user);
//   const loggedInUser=await User.findById(user._id).select("-password -refreshToken");

 // Create response payload from existing data
 
//  const userData = user.toObject();
//  delete userData.password;
//  delete userData.refreshToken;

  const loggedInUser = {
    _id: user._id,
    fullName: user.fullName,
    username: user.username,
    email: user.email,
    avatar: user.avatar,
    coverImg: user.coverImg,
    watchHistory: user.watchHistory,
  };

  const options = {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000
  };
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user:loggedInUser,
          accessToken:accessToken,
          refreshToken:refreshToken,
        },
        "User Logged In Successfully !"
      )
    );
});
const logoutUser=asyncHandler(async (req, res)=>{
  const user=req?.user;
  const updatedUser=await User.findByIdAndUpdate(
    user._id,
    {
      // $set:{refreshToken:undefined}
      $unset:{ refreshToken:1 }
    },{
      new:true,
    }
  ).select("-password -refreshToken");
  if (!updatedUser) {
    throw new ApiError(500, "Failed to logOut user");
}
  const options = {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
  };
  return res.status(200)
  .clearCookie("accessToken",options)
  .clearCookie("refreshToken",options)
  .json(new ApiResponse(200,{},"User Logged Out Successfully"))
});

export { registerUser, loginUser, logoutUser }
