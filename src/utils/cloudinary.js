import {v2 as cloudinary} from "cloudinary"
import fs from "fs"
import dotenv from 'dotenv'
dotenv.config();

cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET 
});
console.log("ak")

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null
        //upload the file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })
        const duration = response.duration;
        // file has been uploaded successfull
        console.log("file is uploaded on cloudinary ", response.url);
        console.log('Video duration:', duration)
        fs.unlinkSync(localFilePath)
        return response;

    } catch (error) {
        fs.unlinkSync(localFilePath) // remove the locally saved temporary file as the upload operation got failed
        console.log(error)
        return null;
    }
}

export {uploadOnCloudinary}



const deleteOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null
        //upload the file on cloudinary
        const response = await cloudinary.uploader.destroy(localFilePath, {
            resource_type: "auto"
        })
        //console.log("file is deleted on cloudinary ", response.url);
        return response;

    } catch (error) {
        fs.unlinkSync(localFilePath) // remove the locally saved temporary file as the upload operation got failed
        return null;
    }
}



export {deleteOnCloudinary}