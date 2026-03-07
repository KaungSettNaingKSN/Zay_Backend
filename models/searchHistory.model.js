import mongoose from 'mongoose'

const userSearchHistorySchema = new mongoose.Schema(
  {
    userId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },
    keyword: {
      type:      String,
      required:  true,
      trim:      true,
      lowercase: true,
    },
    searchedAt: {
      type:    Date,
      default: Date.now,
    },
  },
  { timestamps: false }
)

userSearchHistorySchema.index({ userId: 1, keyword: 1 }, { unique: true })

userSearchHistorySchema.index({ userId: 1, searchedAt: -1 })

const UserSearchHistoryModel = mongoose.model('UserSearchHistory', userSearchHistorySchema)

export default UserSearchHistoryModel