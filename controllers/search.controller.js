import ProductModel from '../models/product.model.js'
import SearchKeywordModel from '../models/searchKeywords.model.js'
import UserSearchHistoryModel from '../models/searchHistory.model.js'

const saveGlobalKeyword = (raw) => {
  const keyword = raw?.trim?.().toLowerCase()
  if (!keyword || keyword.length < 2) return
  SearchKeywordModel.findOneAndUpdate(
    { keyword },
    { $inc: { count: 1 } },
    { upsert: true, new: true }
  ).catch(() => {})
}

const saveUserHistory = async (userId, raw) => {
  if (!userId) return
  const keyword = raw?.trim?.().toLowerCase()
  if (!keyword || keyword.length < 2) return
  try {
    await UserSearchHistoryModel.findOneAndUpdate(
      { userId, keyword },
      { $set: { searchedAt: new Date() } },
      { upsert: true, new: true }
    )
    // Cap at 20 entries — drop oldest
    const count = await UserSearchHistoryModel.countDocuments({ userId })
    if (count > 20) {
      const oldest = await UserSearchHistoryModel
        .find({ userId }).sort({ searchedAt: 1 }).limit(count - 20).select('_id').lean()
      await UserSearchHistoryModel.deleteMany({ _id: { $in: oldest.map(d => d._id) } })
    }
  } catch { /* silent */ }
}

// ─── GET /api/user/search?q=shoes&minPrice=10&maxPrice=500&rating=4 ────────────
export async function searchUserProducts(req, res) {
  try {
    const q       = req.query.q?.trim() || ''
    const page    = Math.max(1,   parseInt(req.query.page)    || 1)
    const perPage = Math.min(100, parseInt(req.query.perPage) || 10)

    const userId = req.userId || null
    saveGlobalKeyword(q)
    if (userId) saveUserHistory(userId, q).catch(() => {})

    // ── FIX: read price + rating params ──────────────────────────────────────
    const minPrice = parseFloat(req.query.minPrice)
    const maxPrice = parseFloat(req.query.maxPrice)
    const rating   = parseFloat(req.query.rating)

    // ── Build filter ──────────────────────────────────────────────────────────
    // Start with text search conditions (if q provided)
    const filter = {}

    if (q) {
      filter.$or = [
        { name:        { $regex: q, $options: 'i' } },
        { brand:       { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { catName:     { $regex: q, $options: 'i' } },
        { subCatName:  { $regex: q, $options: 'i' } },
      ]
    }

    // FIX: layer price filter on top of text search
    if (!isNaN(minPrice) || !isNaN(maxPrice)) {
      filter.price = {}
      if (!isNaN(minPrice)) filter.price.$gte = minPrice
      if (!isNaN(maxPrice)) filter.price.$lte = maxPrice
    }

    // FIX: layer rating filter on top of text search
    if (!isNaN(rating) && rating > 0) {
      filter.rating = { $gte: rating }
    }

    const [totalPosts, product] = await Promise.all([
      ProductModel.countDocuments(filter),
      ProductModel.find(filter)
        .populate('category')
        .populate('productColor')
        .sort({ createdAt: -1 })
        .skip((page - 1) * perPage)
        .limit(perPage)
        .lean(),
    ])

    return res.status(200).json({
      message: 'Success', error: false, success: true,
        product,
        totalPages: Math.ceil(totalPosts / perPage) || 1,
        page,
        total: totalPosts,
    })
  } catch (error) {
    return res.status(500).json({ message: error.message || error, error: true, success: false })
  }
}

// ─── GET /api/product/suggestions?q=sho ───────────────────────────────────────
export async function getSearchSuggestions(req, res) {
  try {
    const q      = req.query.q?.trim() || ''
    const userId = req.userId

    if (!q || q.length < 2) {
      return res.status(200).json({ success: true, error: false, data: { suggestions: [] } })
    }

    const regex = { $regex: q, $options: 'i' }

    const [savedKeywords, userHistory, brands, catNames, subCatNames, productNames] = await Promise.all([
      SearchKeywordModel.find({ keyword: regex }).sort({ count: -1 }).limit(4).lean(),
      userId
        ? UserSearchHistoryModel.find({ userId, keyword: regex }).sort({ searchedAt: -1 }).limit(3).lean()
        : [],
      ProductModel.distinct('brand',      { brand:      regex }),
      ProductModel.distinct('catName',    { catName:    regex }),
      ProductModel.distinct('subCatName', { subCatName: regex }),
      ProductModel.find({ name: regex }).select('name').sort({ sale: -1 }).limit(4).lean(),
    ])

    const seen = new Set()
    const suggestions = []
    const push = (label, type, count = 0) => {
      const key = label?.toLowerCase?.()?.trim()
      if (!key || seen.has(key)) return
      seen.add(key)
      suggestions.push({ label: label.trim(), type, count })
    }

    // Order: user history first → global popular → categories → brands → subcats → products
    userHistory.forEach(h   => push(h.keyword, 'history',     0))
    savedKeywords.forEach(k => push(k.keyword, 'keyword',     k.count))
    catNames.forEach(c      => push(c,          'category',    0))
    brands.forEach(b        => push(b,          'brand',       0))
    subCatNames.forEach(s   => push(s,          'subcategory', 0))
    productNames.forEach(p  => push(p.name,     'product',     0))

    return res.status(200).json({
      success: true, error: false,
      data: { suggestions: suggestions.slice(0, 10) },
    })
  } catch (error) {
    return res.status(500).json({ message: error.message || error, error: true, success: false })
  }
}

// ─── GET /api/product/trending ────────────────────────────────────────────────
export async function getTrendingKeywords(req, res) {
  try {
    const keywords = await SearchKeywordModel.find().sort({ count: -1 }).limit(5).lean()
    return res.status(200).json({
      success: true, error: false,
      data: { keywords: keywords.map(k => ({ label: k.keyword, count: k.count })) },
    })
  } catch (error) {
    return res.status(500).json({ message: error.message || error, error: true, success: false })
  }
}

// ─── GET /api/user/search-history ─────────────────────────────────────────────
export async function getUserSearchHistory(req, res) {
  try {
    const userId = req.userId || null
    if (!userId) return res.status(401).json({ message: 'Unauthorized', error: true, success: false })

    const history = await UserSearchHistoryModel
      .find({ userId }).sort({ searchedAt: -1 }).limit(20).lean()

    return res.status(200).json({
      success: true, error: false,
      data: { history: history.map(h => ({ label: h.keyword, type: 'history', searchedAt: h.searchedAt })) },
    })
  } catch (error) {
    return res.status(500).json({ message: error.message || error, error: true, success: false })
  }
}

// ─── DELETE /api/user/search-history/:keyword ─────────────────────────────────
export async function deleteUserSearchHistoryItem(req, res) {
  try {
    const userId = req.userId 
    const keyword = req.params.keyword?.trim().toLowerCase()
    if (!userId) return res.status(401).json({ message: 'Unauthorized', error: true, success: false })

    await UserSearchHistoryModel.deleteOne({ userId, keyword })
    return res.status(200).json({ success: true, error: false, message: 'Removed' })
  } catch (error) {
    return res.status(500).json({ message: error.message || error, error: true, success: false })
  }
}

// ─── DELETE /api/user/search-history ──────────────────────────────────────────
export async function clearUserSearchHistory(req, res) {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ message: 'Unauthorized', error: true, success: false })

    await UserSearchHistoryModel.deleteMany({ userId })
    return res.status(200).json({ success: true, error: false, message: 'History cleared' })
  } catch (error) {
    return res.status(500).json({ message: error.message || error, error: true, success: false })
  }
}