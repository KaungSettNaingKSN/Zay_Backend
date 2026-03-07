import UserModel from "../models/user.model.js";
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import OrderModel from "../models/order.model.js";
import sendEmailFun from "../config/sendEmail.js";
import generateAccessToken from "../utils/generateAccessToken.js"
import generateRefreshToken from "../utils/generateRefreshToken.js";
import { v2 as cloudinary } from 'cloudinary'
import fs, { access } from 'fs';

cloudinary.config({ 
  cloud_name: process.env.cloudinary_Config_Cloud_Name, 
  api_key: process.env.cloudinary_Config_api_key, 
  api_secret: process.env.cloudinary_Config_api_secret,
  secure: true
});

export async function registerUserController(req, res){
    try {
        let user;
        const {name, email, password} = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({
                message: "provide name, email, password",
                error: true,
                success: false
            })
        }
        user = await UserModel.findOne({email: email})
        if (user) {
            return res.status(400).json({
                message: "User already exist",
                error: true,
                success: false
            })
        }
        const slat = await bcryptjs.genSalt(10);
        const hashPassword = await bcryptjs.hash(password, slat);

        const verifyCode = Math.floor(100000 + Math.random() * 900000).toString();
        const payload = {
            name ,
            email,
            password: hashPassword
        }

        user = new UserModel({
            name: name,
            email: email,
            password: hashPassword,
            otp: verifyCode,
            otp_expiry: Date.now() + 600000,
        })

        await user.save();
        const verifyEmail = await sendEmailFun({
            to: email,
            subject: "Verify email from Zay",
            text: `Your OTP is ${verifyCode}`,
            html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px"><h2 style="color:#f51111;margin-bottom:8px">Verification Code</h2><p style="color:#555;margin-bottom:24px">Use the code below to verify your account. It expires in 10 minutes.</p><div style="background:#fff5f5;border:2px dashed #f51111;border-radius:12px;padding:24px;text-align:center"><span style="font-size:36px;font-weight:800;letter-spacing:10px;color:#f51111">${verifyCode}</span></div><p style="color:#999;font-size:12px;margin-top:20px">If you did not request this, ignore this email.</p></div>`
        })

        const token = jwt.sign(
            {email: user.email, id: user._id},
            process.env.JSON_WEB_TOKEN_SECRET_KEY
        )

        return res.status(200).json({
            success: true,
            error: false,
            message: "Register successful",
            token: token,
        })
    } catch (error) {
        return res.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}

// Add this to your user.controller.js

export async function resendOtpController(req, res) {
  try {
    const { email, actionType } = req.body
    // actionType: 'verify-email' | 'forgot-password'

    if (!email) {
      return res.status(400).json({ message: 'Email is required', error: true, success: false })
    }

    const user = await UserModel.findOne({ email })
    if (!user) {
      return res.status(400).json({ message: 'User not found', error: true, success: false })
    }

    // If verifying email, must not already be verified
    if (actionType === 'verify-email' && user.verify_email) {
      return res.status(400).json({ message: 'Email is already verified', error: true, success: false })
    }

    // Rate limit: block if last OTP was sent less than 60 seconds ago
    const cooldown = 60 * 1000 // 60 seconds
    if (user.otp_expiry && (user.otp_expiry - Date.now()) > (10 * 60 * 1000 - cooldown)) {
      const secondsLeft = Math.ceil(((user.otp_expiry - (10 * 60 * 1000 - cooldown)) - Date.now()) / 1000)
      return res.status(429).json({
        message: `Please wait ${secondsLeft}s before requesting a new code`,
        error: true, success: false,
      })
    }

    const newOtp = Math.floor(100000 + Math.random() * 900000).toString()

    await UserModel.findByIdAndUpdate(user._id, {
      otp:        newOtp,
      otp_expiry: Date.now() + 10 * 60 * 1000, // 10 min
    })

    await sendEmailFun({
      to:      email,
      subject: 'Your new verification code',
      text:    `Your OTP is ${newOtp}`,
      html:    `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
          <h2 style="color:#f51111;margin-bottom:8px">Verification Code</h2>
          <p style="color:#555;margin-bottom:24px">Use the code below to verify your account. It expires in 10 minutes.</p>
          <div style="background:#fff5f5;border:2px dashed #f51111;border-radius:12px;padding:24px;text-align:center">
            <span style="font-size:36px;font-weight:800;letter-spacing:10px;color:#f51111">${newOtp}</span>
          </div>
          <p style="color:#999;font-size:12px;margin-top:20px">If you did not request this, ignore this email.</p>
        </div>
      `,
    })

    return res.json({ message: 'New OTP sent to your email', error: false, success: true })

  } catch (error) {
    return res.status(500).json({ message: error.message || 'Server error', error: true, success: false })
  }
}

export async function verifyEmailController(req, res) {
    try {
        const {email ,otp} = req.body;
        const user = await UserModel.findOne({email: email})
        if (!user) {
            return res.status(400).json({
                message: "Invalid Code",
                error: true,
                success: false
            })
        }

        const isCodeValid = user.otp === otp;
        const isNotExpired = user.otp_expiry > Date.now();
        if (isCodeValid && isNotExpired) {
            user.verify_email = true,
            user.otp = null,
            user.otp_expiry = null
            await user.save();
            return res.status(200).json({
                success: true,
                error: false,
                message: "Verify email done",
            })
        }else if(!isCodeValid){
            return res.status(400).json({
                message: "Invalid Code",
                error: true,
                success: false
            })
        }
        else{
            return res.status(400).json({
                message: "Expired Code",
                error: true,
                success: false
            })
        }
    } catch (error) {
        return res.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
} 

export async function loginUserController(req, res){
    try {
        const {email, password} = req.body;
        const user = await UserModel.findOne({email: email});
        if (!user) {
            return res.status(400).json({
                message: "User not found",
                error: true,
                success: false
            })
        }
        if (user.status !== 'Active') {
            return res.status(400).json({
                message: "Contact Our Team",
                error: true,
                success: false
            })
        }

        if (user.verify_email !== true) {
            return res.status(400).json({
                message: "Contact Our Team",
                error: true,
                success: false
            })
        }
        if (user.signInWithGoogle && !user.password) {
            return res.status(400).json({ message: "This account uses Google sign-in.", error: true, success: false });
        }
        const checkPassword = await bcryptjs.compare(password, user.password);

        if (!checkPassword) {
            return res.status(400).json({
                message: "Wrong Password",
                error: true,
                success: false
            })
        }
        
        const accessToken = await generateAccessToken(user._id)
        const refreshToken = await generateRefreshToken(user._id)

        const updateUser = await UserModel.findByIdAndUpdate(user?._id,{
            last_login_Date: new Date()
        })

        const cookieOption = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
        }

        res.cookie('accessToken', accessToken, cookieOption)
        res.cookie('refreshToken', refreshToken, cookieOption)

        return res.json({
            message: "Login Successful",
            error: false,
            success: true,
            data: {
                accessToken,
                refreshToken
            }
        })
    } catch (error) {
        return res.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}

export async function adminLoginController(req, res) {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required', error: true, success: false })
    }

    const user = await UserModel.findOne({ email })

    if (!user) {
      return res.status(400).json({ message: 'User not found', error: true, success: false })
    }

    // Must be Active
    if (user.status !== 'Active') {
      return res.status(403).json({ message: 'Account suspended', error: true, success: false })
    }

    // Must have verified email
    if (!user.verify_email) {
      return res.status(403).json({ message: 'Email not verified', error: true, success: false })
    }

    // Must be Admin — reject before even checking password
    if (user.role !== 'Admin') {
      return res.status(403).json({ message: 'Access denied — admins only', error: true, success: false })
    }

    // Google-only accounts have no password
    if (user.signInWithGoogle && !user.password) {
      return res.status(400).json({ message: 'This account uses Google sign-in', error: true, success: false })
    }

    const passwordMatch = await bcryptjs.compare(password, user.password)
    if (!passwordMatch) {
      return res.status(400).json({ message: 'Wrong password', error: true, success: false })
    }

    const accessToken  = await generateAccessToken(user._id)
    const refreshToken = await generateRefreshToken(user._id)

    await UserModel.findByIdAndUpdate(user._id, { last_login_Date: new Date() })

    const cookieOption = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
    }
    res.cookie('accessToken',  accessToken,  cookieOption)
    res.cookie('refreshToken', refreshToken, cookieOption)

    return res.json({
      message: 'Admin login successful',
      error: false,
      success: true,
      data: { accessToken, refreshToken },
    })

  } catch (error) {
    return res.status(500).json({ message: error.message || 'Server error', error: true, success: false })
  }
}

export async function googleAuthController(req, res) {
  try {
    const { name, email, image } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required", error: true, success: false });
    }

    let user = await UserModel.findOne({ email });

    if (!user) {
      user = new UserModel({
        name,
        email,
        avatar: image || "",
        verify_email: true,
        signInWithGoogle: true,
        status: "Active",
      });
      await user.save();
    } else {
      if (!user.avatar && image) user.avatar = image;
      user.signInWithGoogle = true;
      await user.save();
    }

    if (user.status !== "Active") {
      return res.status(400).json({ message: "Account suspended. Contact support.", error: true, success: false });
    }

    const accessToken  = await generateAccessToken(user._id);
    const refreshToken = await generateRefreshToken(user._id);

    await UserModel.findByIdAndUpdate(user._id, { last_login_Date: new Date() });

    const cookieOption = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
    }
    res.cookie("accessToken",  accessToken,  cookieOption);
    res.cookie("refreshToken", refreshToken, cookieOption);

    return res.json({
      message: "Google sign-in successful",
      error:   false,
      success: true,
      data:    {
        accessToken,
        refreshToken,
        user: {
          _id:    user._id,
          name:   user.name,
          email:  user.email,
          avatar: user.avatar,
          role:   user.role,
        },
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || error, error: true, success: false });
  }
}

export async function logoutUserController(req, res){
    try {
        const userId = req.userId;

        const cookieOption = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
        }

        res.clearCookie('accessToken', cookieOption)
        res.clearCookie('refreshToken', cookieOption)

        const removeRefreshToken = await UserModel.findByIdAndUpdate(userId, {
            refresh_token: ""
        })

        return res.json({
            message: "Logout Successful",
            error: false,
            success: true,
        })
    } catch (error) {
        return res.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}

export async function refreshTokenController(req, res) {
    try{
        const refresh_token = req.cookies.refreshToken || req?.headers?.authorization?.split(" ")[1]
        if (!refresh_token) {
            return res.status(400).json({
                message: "Invalid token",
                error: true,
                success: false
            })
        }
        const verify_token = await jwt.verify(refresh_token, process.env.SECRET_KEY_REFRESH_TOKEN)
        if (!verify_token) {
            return res.status(400).json({
                message: "Token is expired",
                error: true,
                success: false
            })
        }

        const userId = verify_token?.id;
        const newAccessToken = await generateAccessToken(userId);

        const cookieOption = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
        }

        res.cookie('accessToken', newAccessToken, cookieOption)

        return res.json({
            message: "New access token generated",
            error: false,
            success: true,
            data: {
                accessToken: newAccessToken
            }
        })
    } catch (error) {
        return res.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}

var ImageArr=[];
export async function userAvatarController(req, res) {
    try {
        ImageArr = [];
        const userId = req.userId;
        const image = req.files;
        const user = await UserModel.findOne({_id: userId});
        if (!user) {
            return res.status(500).json({
                message: "User not found",
                error: true,
                success: false
            })
        }
        const imageUrl = user.avatar;
        const urlArr = imageUrl.split('/');
        const avatar_image = urlArr[urlArr.length -1]
        const imageName = avatar_image.split(".")[0]
        if (imageName) {
            const result = await cloudinary.uploader.destroy(
                imageName,
                (error, result)=>{

                }
            );
        }
        
        const options = {
            use_filename: true,
            unique_filename: true,
            overwrite: false
        }
        for (let i = 0; i < image?.length; i++) {
            const img = await cloudinary.uploader.
            upload(
                image[i].path,
                options,
                function(error, result){
                    ImageArr.push(result.secure_url);
                    fs.unlinkSync(`uploads/${req.files[i].filename}`);
                    console.log(req.files[i].filename);
                }
            )
        }

        user.avatar =  ImageArr[0];
        await user.save();
        return res.status(200).json({
            _id: userId,
            avatar: ImageArr[0]
        })
    } catch (error) {
        return res.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}

export async function updateUserRoleController(req, res) {
  try {
    const { id }  = req.params
    const { role } = req.body

    if (!['Admin', 'User'].includes(role)) {
      return res.status(400).json({
        message: 'Invalid role. Must be "Admin" or "User"',
        error: true, success: false,
      })
    }

    if (id === req.userId) {
      return res.status(400).json({
        message: 'You cannot change your own role',
        error: true, success: false,
      })
    }

    const updated = await UserModel.findByIdAndUpdate(
      id,
      { role },
      { new: true, select: '-password -refresh_token -otp -otp_expiry' }
    )

    if (!updated) {
      return res.status(404).json({ message: 'User not found', error: true, success: false })
    }

    return res.json({
      message: `Role updated to ${role}`,
      error: false, success: true,
      data: updated,
    })
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Server error', error: true, success: false })
  }
}

export async function removeImageFromCloudinary(req, res) {
    const imgUrl = req.query.img;
    const urlArr = imgUrl.split('/');
    const image = urlArr[urlArr.length -1]
    const imageName = image.split(".")[0]
    if (imageName) {
        const result = await cloudinary.uploader.destroy(
            imageName,
            (error, result)=>{

            }
        );
        if (result) {
            res.status(200).send(result)
        }
    }
}

export async function updateUserDetails(req, res) {
    try {
        const userId = req.userId;
        const {name, email, mobile, password} = req.body;
        const userExist = await UserModel.findById(userId);
        if (!userExist) {
            res.status(400).send('User not found')
        }

        let verifyCode ="";
        if (email !== userExist.email) {
            verifyCode = Math.floor(100000 + Math.random() * 900000).toString();
        }
        let hashPassword = ""
        if (password) {
            const salt = await bcryptjs.genSalt(10);
            hashPassword = await bcryptjs.hash(password, salt)
        }else{
            hashPassword = userExist.password
        }

        const updateUser = await UserModel.findByIdAndUpdate(
            userId,
            {
                name: name,
                mobile: mobile,
                email: email,
                verify_email: true,
                password: hashPassword,
                otp: verifyCode !== "" ? verifyCode : null,
                otp_expiry: verifyCode !== "" ? Date.now() + 600000 : ''
            },
            {
                new: true
            }
        )

        if (email !== userExist.email) {
            await sendEmailFun({
                to: email,
                subject: "Verify email from Zay",
                text: `Your OTP is ${verifyCode}`,
               html: `
                        <div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:30px;background:#f9fafb;border-radius:10px">

                        <h2 style="color:#f51111;text-align:center;margin-bottom:10px">
                            Zay Email Verification
                        </h2>

                        <p style="color:#555;text-align:center;font-size:14px;margin-bottom:25px">
                            Please use the verification code below to confirm your email address.
                            This code will expire in <b>10 minutes</b>.
                        </p>

                        <div style="background:#fff;border:2px dashed #f51111;border-radius:12px;padding:25px;text-align:center;margin-bottom:20px">
                            <span style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#f51111">
                            ${verifyCode}
                            </span>
                        </div>

                        <p style="color:#666;font-size:13px;text-align:center;margin-bottom:5px">
                            If you did not request this verification, please ignore this email.
                        </p>

                        <p style="color:#999;font-size:12px;text-align:center;margin-top:20px">
                            © ${new Date().getFullYear()} Zay. All rights reserved.
                        </p>

                        </div>
                        `
            })
        }

        return res.json({
            message: "User Successful",
            error: false,
            success: true,
            data: updateUser
        })
    } catch (error) {
        return res.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}

export async function forgotPasswordController(req, res) {
    try {
        const {email} = req.body;
        const user = await UserModel.findOne({email: email});
        if (!user) {
            return res.status(400).json({
                message: 'Invalid email',
                error: true,
                success: false
            })
        }
        let verifyCode = Math.floor(100000 + Math.random() * 900000).toString();
        const updateUser = await UserModel.findByIdAndUpdate(
            user?._id,
            {
                otp: verifyCode,
                otp_expiry: Date.now() + 600000,
            },
            {
                new: true
            }
        )
        await sendEmailFun({
            to: email,
            subject: "Verify email from Zay",
            text: `Your OTP is ${verifyCode}`,
            html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px"><h2 style="color:#f51111;margin-bottom:8px">Verification Code</h2><p style="color:#555;margin-bottom:24px">Use the code below to verify your account. It expires in 10 minutes.</p><div style="background:#fff5f5;border:2px dashed #f51111;border-radius:12px;padding:24px;text-align:center"><span style="font-size:36px;font-weight:800;letter-spacing:10px;color:#f51111">${verifyCode}</span></div><p style="color:#999;font-size:12px;margin-top:20px">If you did not request this, ignore this email.</p></div>`
        })
        return res.json({
            message: "Check your email",
            error: false,
            success: true,
            data: updateUser
        })
    } catch (error) {
        return res.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}

export async function verifyForgotPasswordOTP(req, res) {
    try {
        const {email, otp} = req.body;
        const user = await UserModel.findOne({email: email});
        if (!user) {
            return res.status(400).json({
                message: 'Invalid email',
                error: true,
                success: false
            })
        }
        if(user.otp !== otp){
            return res.status(400).json({
                message: 'Invalid OTP',
                error: true,
                success: false
            })
        }
        if (!email || !otp) {
            return res.status(400).json({
                message: 'Required email or otp',
                error: true,
                success: false
            })
        }

        const currentTime = new Date().toISOString()

        if (user.otp_expiry != null && user.otp < currentTime) {
            return res.status(400).json({
                message: 'OTP is expired',
                error: true,
                success: false
            })
        }

        user.otp = '';
        user.otp_expiry = '';
        user.save();
        return res.json({
            message: "OTP verified",
            error: false,
            success: true,
        })
    } catch (error) {
        return res.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}

export async function resetPasswordController(req, res) {
    try{
        const {email, oldPassword, newPassword, confirmPassword} = req.body;
        if (!email || !newPassword || !confirmPassword) {
            return res.status(500).json({
                message: "provide all field",
                error: true,
                success: false
            })
        }
        const user = await UserModel.findOne({email: email});
        if (!user) {
            return res.status(400).json({
                message: 'Invalid email',
                error: true,
                success: false
            })
        }
        if (newPassword != confirmPassword) {
            return res.status(400).json({
                message: 'password must be same',
                error: true,
                success: false
            })
        }
        if (oldPassword) {
            const checkPassword = await bcryptjs.compare(
                oldPassword,
                user.password
            );

            if (!checkPassword) {
                return res.status(400).json({
                    message: "Wrong Old Password",
                    error: true,
                    success: false
                });
            }
        }
        const slat = await bcryptjs.genSalt(10);
        const hashPassword = await bcryptjs.hash(newPassword, slat);

        const update = await UserModel.findOneAndUpdate(
            user._id,
            {
                password: hashPassword
            }
        )
        return res.json({
            message: "updated password",
            error: false,
            success: true,
        })
    } catch (error) {
        return res.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}

export async function getUserDetailController(req, res){
    try {
        const userId = req.userId;
        console.log(userId);
        const user = await UserModel.findById(userId).populate('address_details').select('-password -refresh_token')

        return res.json({
            message: "User Details",
            error: false,
            success: true,
            data: user
        })
    } catch (error) {
        return res.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}

export async function getAllUsersAdminController(req, res) {
    try {
        const {
            page       = 1,
            limit      = 10,
            search     = '',
        } = req.query

        const filter = {}

        // Search by name or email
        if (search && search.trim()) {
            const regex  = { $regex: search.trim(), $options: 'i' }
            filter.$or   = [{ name: regex }, { email: regex }]
        }

        const pageNum  = Math.max(1, Number(page))
        const limitNum = Math.min(100, Math.max(1, Number(limit)))

        const [total, users] = await Promise.all([
            UserModel.countDocuments(filter),
            UserModel.find(filter)
                .select('-password -refresh_token -otp -otp_expiry')
                .sort({ createdAt: -1 })
                .skip((pageNum - 1) * limitNum)
                .limit(limitNum)
                .lean(),
        ])

        return res.status(200).json({
            message: "Users fetched", error: false, success: true,
            data: {
                users,
                total,
                page:       pageNum,
                totalPages: Math.ceil(total / limitNum),
            }
        })
    } catch (error) {
        return res.status(500).json({ message: error.message || error, error: true, success: false })
    }
}

export async function deleteUserAdminController(req, res) {
    try {
        const { id } = req.params
        const deleted = await UserModel.findByIdAndDelete(id)
        if (!deleted) {
            return res.status(404).json({ message: "User not found", error: true, success: false })
        }
        return res.json({ message: "User deleted", error: false, success: true })
    } catch (error) {
        return res.status(500).json({ message: error.message || error, error: true, success: false })
    }
}

export async function deleteMultipleUsersAdminController(req, res) {
    try {
        const { ids } = req.body
        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ message: "Provide an array of user IDs", error: true, success: false })
        }
        const result = await UserModel.deleteMany({ _id: { $in: ids } })
        return res.json({
            message: `${result.deletedCount} user(s) deleted`,
            error: false, success: true,
            data: { deletedCount: result.deletedCount }
        })
    } catch (error) {
        return res.status(500).json({ message: error.message || error, error: true, success: false })
    }
}

export const getDashboardAnalyticsController = async (req, res) => {
  try {
    const year      = Number(req.query.year) || new Date().getFullYear()
    const yearStart = new Date(`${year}-01-01T00:00:00.000Z`)
    const yearEnd   = new Date(`${year + 1}-01-01T00:00:00.000Z`)

    // ── Monthly sales (sum of total_amount per month) ──────────────────────
    const salesAgg = await OrderModel.aggregate([
      {
        $match: {
          createdAt: { $gte: yearStart, $lt: yearEnd },
          payment_status: { $nin: ['cancelled', 'refunded'] },
        }
      },
      {
        $group: {
          _id:        { $month: '$createdAt' },
          totalSales: { $sum: '$total_amount' },
          totalOrders:{ $sum: 1 },
        }
      },
      { $sort: { _id: 1 } }
    ])

    // ── Monthly new users ──────────────────────────────────────────────────
    const usersAgg = await UserModel.aggregate([
      { $match: { createdAt: { $gte: yearStart, $lt: yearEnd } } },
      {
        $group: {
          _id:        { $month: '$createdAt' },
          totalUsers: { $sum: 1 },
        }
      },
      { $sort: { _id: 1 } }
    ])

    // ── Summary totals ─────────────────────────────────────────────────────
    const [
      totalOrders,
      totalUsers,
      totalRevenue,
      pendingOrders,
    ] = await Promise.all([
      OrderModel.countDocuments(),
      UserModel.countDocuments(),
      OrderModel.aggregate([
        { $match: { payment_status: { $nin: ['cancelled', 'refunded'] } } },
        { $group: { _id: null, total: { $sum: '$total_amount' } } }
      ]),
      OrderModel.countDocuments({ payment_status: 'pending' }),
    ])

    // ── Build 12-month chart array ─────────────────────────────────────────
    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

    const salesMap = {}
    salesAgg.forEach(s => { salesMap[s._id] = s.totalSales })

    const usersMap = {}
    usersAgg.forEach(u => { usersMap[u._id] = u.totalUsers })

    const chartData = MONTHS.map((name, i) => ({
      name,
      TotalSales: Math.round((salesMap[i + 1] || 0) * 100) / 100,
      TotalUsers: usersMap[i + 1] || 0,
    }))

    return res.status(200).json({
      message: 'Analytics fetched',
      error:   false,
      success: true,
      data: {
        chartData,
        summary: {
          totalOrders,
          totalUsers,
          totalRevenue: totalRevenue[0]?.total ?? 0,
          pendingOrders,
        }
      }
    })
  } catch (error) {
    return res.status(500).json({ message: error.message || error, error: true, success: false })
  }
}