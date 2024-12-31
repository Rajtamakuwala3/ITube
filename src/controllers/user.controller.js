import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apiResponse.js";

const registerUser = asyncHandler(async (req, res) => {
  // get user detail from frontend
  // validation - not empty
  // check if user already exists - unique email, username
  // check for images, check for avtar
  // upload them to cludinary, avtar
  // create user object - create entry in db
  // remove password and referesh toke field from response
  // check for user creation
  // retunr response

  const { fullname, username, email, password } = req.body;
  console.log("Email : ", email);

  if (
    [username, fullname, password, email].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  const existedUser = User.findOne({
    $or: [{ email }, { username }],
  });

  //   console.log("ExistedUser", existedUser);

  if (existedUser) {
    throw new ApiError(409, "User with same eamil or username exists");
  }

  const avatarLocalPath = req.files?.avatar[0]?.path;
  const coverImageLoacalPath = req.files?.coverIamge[0]?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avtar file is required");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLoacalPath);

  if (!avatar) {
    throw new ApiError(400, "Avtar file is required");
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
  )

  if(!createdUser) {
    throw new ApiError(500, "Somthing went wrong while registering a user")
  }

  return new res.status(201).json(
    new ApiResponse(200, createdUser, "User registerd successfully"
    )
  )
});

export default registerUser;
