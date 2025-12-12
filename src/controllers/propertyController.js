import Property from '../models/Property.js';
import User from '../models/User.js';

// -------------------------
// GET ALL PROPERTIES
// -------------------------
export const getProperties = async (req, res) => {
  try {
    const { city, dealType, propertyType, minPrice, maxPrice, beds, listedBy, searchQuery } = req.query;

    let query = { status: 'active' };

    if (searchQuery) {
      query.$or = [
        { title: new RegExp(searchQuery, 'i') },
        { city: new RegExp(searchQuery, 'i') },
        { locality: new RegExp(searchQuery, 'i') },
      ];
    }

    if (city) query.city = new RegExp(city, 'i');
    if (dealType && dealType !== 'all') query.dealType = dealType;
    if (propertyType && propertyType !== 'all') query.propertyType = propertyType;

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    if (beds && beds !== 'all') {
      if (beds === '4+') query.beds = { $gte: 4 };
      else query.beds = Number(beds);
    }

    if (listedBy && listedBy !== 'all') {
      const users = await User.find({ role: listedBy });
      const userIds = users.map((u) => u._id);
      query.listedBy = { $in: userIds };
    }

    const properties = await Property.find(query)
      .populate('listedBy', 'name role verified phone avatar rating')
      .sort('-createdAt');

    res.json({
      success: true,
      count: properties.length,
      properties,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// -------------------------
// GET SINGLE PROPERTY
// -------------------------
export const getProperty = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id).populate(
      'listedBy',
      'name role verified phone avatar rating'
    );

    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    property.stats.views += 1;
    await property.save();

    res.json({ success: true, property });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// -------------------------
// CREATE PROPERTY
// -------------------------
export const createProperty = async (req, res) => {
  try {
    req.body.listedBy = req.user.id;

    // -------- Images --------
    let images = [];
    if (req.files && req.files.length > 0) {
      images = req.files.map((file) => `/uploads/properties/${file.filename}`);
    }

    if (images.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least 1 property image is required',
      });
    }

    // -------- Convert numbers --------
    req.body.price = Number(req.body.price);
    req.body.beds = Number(req.body.beds);
    req.body.baths = Number(req.body.baths);
    req.body.area = Number(req.body.area);

    // -------- Highlights --------
    let highlights = [];
    if (typeof req.body.highlights === 'string') {
      highlights = req.body.highlights.split('\n').map((h) => h.trim()).filter(Boolean);
    }

    // -------- Amenities --------
    let amenities = [];
    if (Array.isArray(req.body.amenities)) {
      amenities = req.body.amenities;
    } else if (typeof req.body.amenities === 'string') {
      amenities = [req.body.amenities];
    }

    const property = await Property.create({
      ...req.body,
      images,
      highlights,
      amenities,
    });

    await property.populate('listedBy', 'name role verified phone avatar rating');

    res.status(201).json({ success: true, property });
  } catch (error) {
    console.log('Create error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// -------------------------
// UPDATE PROPERTY
// -------------------------
export const updateProperty = async (req, res) => {
  try {
    let property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found',
      });
    }

    if (property.listedBy.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to update this property',
      });
    }

    // -------- Create update object --------
    const updateData = { ...req.body };

    // Convert numbers if provided
    if (req.body.price) updateData.price = Number(req.body.price);
    if (req.body.beds) updateData.beds = Number(req.body.beds);
    if (req.body.baths) updateData.baths = Number(req.body.baths);
    if (req.body.area) updateData.area = Number(req.body.area);

    // Highlights parsing
    if (typeof req.body.highlights === 'string') {
      updateData.highlights = req.body.highlights
        .split('\n')
        .map((h) => h.trim())
        .filter(Boolean);
    }

    // Amenities
    if (Array.isArray(req.body.amenities)) {
      updateData.amenities = req.body.amenities;
    } else if (typeof req.body.amenities === 'string') {
      updateData.amenities = [req.body.amenities];
    }

    // -------- Replace images only if new images uploaded --------
    if (req.files && req.files.length > 0) {
      updateData.images = req.files.map(
        (file) => `/uploads/properties/${file.filename}`
      );
    }

    property = await Property.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).populate('listedBy', 'name role verified phone avatar rating');

    res.json({ success: true, property });
  } catch (error) {
    console.log('Update error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// -------------------------
// DELETE PROPERTY
// -------------------------
export const deleteProperty = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    if (property.listedBy.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to delete this property',
      });
    }

    await property.deleteOne();

    res.json({ success: true, message: 'Property deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// -------------------------
// SAVE / UNSAVE
// -------------------------
export const toggleSaveProperty = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const propertyId = req.params.id;

    const index = user.savedProperties.indexOf(propertyId);

    if (index > -1) {
      user.savedProperties.splice(index, 1);
      await Property.findByIdAndUpdate(propertyId, { $inc: { 'stats.saves': -1 } });
    } else {
      user.savedProperties.push(propertyId);
      await Property.findByIdAndUpdate(propertyId, { $inc: { 'stats.saves': 1 } });
    }

    await user.save();

    res.json({
      success: true,
      savedProperties: user.savedProperties,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// -------------------------
// GET MY PROPERTIES
// -------------------------
export const getMyProperties = async (req, res) => {
  try {
    const properties = await Property.find({ listedBy: req.user.id }).sort('-createdAt');
    res.json({
      success: true,
      count: properties.length,
      properties,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
