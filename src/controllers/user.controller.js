import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apiResponse.js";

const generateAcessAndRefereshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    var accessToken = user.generateAccessToken();
    var refreshToken = user.generateRequestToken();

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

  if (!username || !email) {
    throw new ApiError(400, "username or email is required");
  }

  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!user) {
    throw new ApiError(404, "User dose not exist");
  }

  const isPasswordValid = await user.isCorrectPassword(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials");
  }

  const { accessToken, refreshToken } = await generateAcessAndRefereshToken(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
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

export { registerUser, loginUser, logoutUser };
