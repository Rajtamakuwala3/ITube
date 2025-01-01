import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apiResponse.js";

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

export default registerUser;
