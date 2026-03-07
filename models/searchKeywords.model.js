import mongoose from 'mongoose'

const searchKeywordSchema = new mongoose.Schema(
  {
    keyword: {
      type:     String,
      required: true,
      trim:     true,
      lowercase: true,
    },
    count: {
      type:    Number,
      default: 1,
    },
  },
  { timestamps: true }
)

searchKeywordSchema.index({ keyword: 1 }, { unique: true })

searchKeywordSchema.index({ count: -1 })

const SearchKeywordModel = mongoose.model('SearchKeyword', searchKeywordSchema)

export default SearchKeywordModel