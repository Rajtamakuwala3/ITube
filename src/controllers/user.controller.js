import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apiResponse.js";
import jwt from "jsonwebtoken";

const generateAcessAndRefereshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    var accessToken = await user.generateAccessToken();
    var refreshToken = await user.generateRequestToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Somthing went wrong while generating referesh and access token"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  // get user detail from frontend
  // validation - not empty
  // check if user already exists - unique email, username
  // check for images, check for avatar
  // upload them to cludinary, avatar
  // create user object - create entry in db
  // remove password and referesh toke field from response
  //   check for user creation
  //   retunr response

  console.log("req.body object : ", req.body);

  const { fullname, username, email, password } = req.body;
  // console.log("Email : ", email);
  // console.log("password : ", password);
  if (
    [username, fullname, password, email].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  const existedUser = await User.findOne({
    $or: [{ email }, { username }],
  });

  //   console.log("ExistedUser", existedUser);

  if (existedUser) {
    throw new ApiError(409, "User with same eamil or username exists");
  }

  // console.log("req files", req.files);

  const avatarLocalPath = req.files?.avatar[0]?.path; // Access "avatar"
  // const coverImageLocalPath = req.files?.coverImage[0]?.path;

  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  // console.log("avatar file path", avatarLocalPath)
  // console.log("coverImage file path", coverImageLocalPath)

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  // console.log("Cloudinary upload", avatar);
  // console.log("Cloudinary upload", coverImage);

  if (!avatar) {
    throw new ApiError(400, "Avatar file is required!!!");
  }

  const user = await User.create({
    fullname,
    email,
    password,
    avatar: avatar.url,
    coverImage: coverImage.url || "",
    username: username.toLowerCase(),
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refereshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "Somthing went wrong while registering a user");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered Successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  // req body -> data
  //  username or email
  // find user
  // password check
  // referesh token and accesstoken generate
  // send cookie

  const { username, password, email } = req.body;
  console.log(email);
  // console.log(password);

  if (!username && !email) {
    throw new ApiError(400, "username or email is required");
  }

  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!user) {
    throw new ApiError(404, "User dose not exist");
  }

  // console.log(password);
  const isPasswordValid = await user.isCorrectPassword(password);
  console.log(isPasswordValid);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials");
  }

  const { accessToken, refreshToken } = await generateAcessAndRefereshToken(
    user._id
  );

  // console.log(typeof accessToken);
  // console.log(accessToken)

  // if (!accessToken || !refreshToken) {
  //   throw new ApiError(500, "Token generation failed");
  // }

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  // const accessTokenString = String(accessToken)

  // console.log(accessTokenString);
  // console.log(refreshToken);
  // console.log(typeof accessTokenString === "string")
  return res
    .status(200)
    .cookie("accessToken", String(accessToken), options)
    .cookie("refreshToken", String(refreshToken), options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged in successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: { refereshToken: undefined },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User Logged out"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookie.refereshToken || req.body.refereshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "unathorized request");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    if (incomingRefreshToken !== user.refereshToken) {
      throw new ApiError(401, "Refresh Token is expired or used");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, newRefereshToken } =
      await generateAcessAndRefereshToken(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refereshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refereshToken: newRefereshToken },
          "Access token refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

export { registerUser, loginUser, logoutUser, refreshAccessToken };
