import { v2 as cloudinary } from 'cloudinary'
import fs from "fs"
import processdata from '../config';

const uploadClouinary = async (file : string)=>{

    cloudinary.config({ 
   cloud_name: processdata.cloudname, 
   api_key: processdata.cloudapikey, 
   api_secret: processdata.cloudapisecret
    });

    try {
     const result =   await cloudinary.uploader.upload(file)
     fs.unlinkSync(file)
     return result.secure_url
        
    } catch (error) {
         fs.unlinkSync(file)
         console.log(error);
    }
}

export default uploadClouinary