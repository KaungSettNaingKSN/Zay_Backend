import AddressModel from '../models/address.model.js'
import UserModel    from '../models/user.model.js'

// ─── Add Address ─────────────────────────────────────────────────────────────
export const addAddressController = async (req, res) => {
  try {
    const userId = req.userId
    const {
      address_line,
      address_name = 'Home',
      city, state, pincode, country, mobile,
      status = false,
    } = req.body

    if (!address_line || !city || !state || !pincode || !country || !mobile) {
      return res.status(400).json({ message: 'Please provide all required fields', error: true, success: false })
    }

    const digitsOnly = String(mobile).replace(/\D/g, '')
    if (digitsOnly.length < 7) {
      return res.status(400).json({ message: 'Please enter a valid mobile number', error: true, success: false })
    }

    if (status) {
      await AddressModel.updateMany({ userId }, { status: false })
    }

    const address = new AddressModel({ userId, address_line, address_name, city, state, pincode, country, mobile, status })
    const saved   = await address.save()

    await UserModel.updateOne({ _id: userId }, { $push: { address_details: saved._id } })

    return res.status(201).json({ message: 'Address added successfully', error: false, success: true, data: saved })
  } catch (error) {
    return res.status(500).json({ message: error.message || error, error: true, success: false })
  }
}

// ─── Edit Address ─────────────────────────────────────────────────────────────
export const editAddressController = async (req, res) => {
  try {
    const userId = req.userId
    const { _id, address_line, address_name, city, state, pincode, country, mobile, status } = req.body

    if (!_id) {
      return res.status(400).json({ message: 'Provide address id', error: true, success: false })
    }

    const address = await AddressModel.findOne({ _id, userId })
    if (!address) {
      return res.status(404).json({ message: 'Address not found', error: true, success: false })
    }

    // If setting as default, clear others first
    if (status) {
      await AddressModel.updateMany({ userId, _id: { $ne: _id } }, { status: false })
    }

    const updated = await AddressModel.findOneAndUpdate(
      { _id, userId },
      { address_line, address_name, city, state, pincode, country, mobile, status },
      { new: true }
    )

    return res.status(200).json({ message: 'Address updated successfully', error: false, success: true, data: updated })
  } catch (error) {
    return res.status(500).json({ message: error.message || error, error: true, success: false })
  }
}

// ─── Select / Set Default Address ────────────────────────────────────────────
export const selectAddressController = async (req, res) => {
  try {
    const id     = req.params.id
    const userId = req.userId

    const address = await AddressModel.findOne({ _id: id, userId })
    if (!address) {
      return res.status(404).json({ message: 'Address not found', error: true, success: false })
    }

    await AddressModel.updateMany({ userId }, { status: false })
    await AddressModel.updateOne({ _id: id }, { status: true })

    return res.status(200).json({ message: 'Default address updated', error: false, success: true })
  } catch (error) {
    return res.status(500).json({ message: error.message || error, error: true, success: false })
  }
}

// ─── Delete Address ───────────────────────────────────────────────────────────
export const deleteAddressController = async (req, res) => {
  try {
    const userId  = req.userId
    const { _id } = req.body

    if (!_id) {
      return res.status(400).json({ message: 'Provide address id', error: true, success: false })
    }

    const address = await AddressModel.findOne({ _id, userId })
    if (!address) {
      return res.status(404).json({ message: 'Address not found', error: true, success: false })
    }

    await AddressModel.deleteOne({ _id, userId })
    await UserModel.updateOne({ _id: userId }, { $pull: { address_details: address._id } })

    return res.status(200).json({ message: 'Address deleted', error: false, success: true })
  } catch (error) {
    return res.status(500).json({ message: error.message || error, error: true, success: false })
  }
}