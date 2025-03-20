import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

// Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET, 
});

// console.log("Cloudinary Configuration:", {
//     cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//     api_key: process.env.CLOUDINARY_API_KEY,
//     api_secret: process.env.CLOUDINARY_API_SECRET,
//   });

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if(!localFilePath) {
            // console.log("in uploadOnCloudinary",localFilePath)
            return null;
        }
        // upload file on cloudinary

        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type : "auto"
        });
        // file has been successfully uploaded

        // console.log("File is uploaded in cloudinary", response)

        fs.unlinkSync(localFilePath)
        return response
    } catch(error) {
        // console.error("Cloudinary Upload Error:", error.message, error);
        fs.unlinkSync(localFilePath) // remove the locally temporary file as the operation got failed
        return null
    }
}

export { uploadOnCloudinary }
