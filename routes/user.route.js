import {Router} from 'express';
import { adminLoginController, deleteMultipleUsersAdminController, deleteUserAdminController, forgotPasswordController, getAllUsersAdminController, getDashboardAnalyticsController, getUserDetailController, googleAuthController, loginUserController, logoutUserController, refreshTokenController, registerUserController, removeImageFromCloudinary, resendOtpController, resetPasswordController, updateUserDetails, updateUserRoleController, userAvatarController, verifyEmailController, verifyForgotPasswordOTP } from '../controllers/user.controller.js';
import auth from '../middleware/auth.js';
import upload from '../middleware/multer.js';
import adminAuth from '../middleware/adminAuth.js';
import { clearUserSearchHistory, deleteUserSearchHistoryItem, getUserSearchHistory, searchUserProducts } from '../controllers/search.controller.js';
import optionalAuth from '../middleware/Optionalauth.js';

const userRouter = Router();
userRouter.post ('/register', registerUserController);
userRouter.post ('/google-auth', googleAuthController);
userRouter.post ('/verifyEmail', verifyEmailController);
userRouter.post ('/login', loginUserController);
userRouter.post ('/refresh-token', refreshTokenController);
userRouter.post('/admin-login', adminLoginController)
userRouter.post('/resend-otp', resendOtpController)
userRouter.put('/forgot-password', forgotPasswordController)
userRouter.put('/admin/:id/role', auth, adminAuth, updateUserRoleController)
userRouter.put('/verify-forgot-password-otp', verifyForgotPasswordOTP)
userRouter.put('/reset-password', resetPasswordController)
userRouter.get('/analytics', auth, adminAuth, getDashboardAnalyticsController)
userRouter.get('/admin/all',auth, adminAuth, getAllUsersAdminController)
userRouter.delete('/admin/:id',auth, adminAuth, deleteUserAdminController)
userRouter.delete('/admin/deleteMultiple', adminAuth, deleteMultipleUsersAdminController)
userRouter.get ('/logout',auth, logoutUserController);
userRouter.get ('/get-user',auth, getUserDetailController);
userRouter.get('/search', optionalAuth, searchUserProducts)
userRouter.get('/search-history', auth, getUserSearchHistory) 
userRouter.delete('/search-history/:keyword', auth, deleteUserSearchHistoryItem) 
userRouter.delete('/search-history', auth, clearUserSearchHistory)  
userRouter.put('/user-avatar', auth, upload.array('avatar'), userAvatarController)
userRouter.delete('/delete-image', auth, removeImageFromCloudinary)
userRouter.put('/:id', auth, updateUserDetails)


export default userRouter