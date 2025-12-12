import mongoose from 'mongoose';

const propertySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
    },
    dealType: {
      type: String,
      enum: ['sale', 'rent'],
      required: true,
    },
    propertyType: {
      type: String,
      enum: ['Apartment', 'Villa', 'Plot', 'Commercial'],
      required: true,
    },
    beds: {
      type: Number,
      required: true,
    },
    baths: {
      type: Number,
      required: true,
    },
    area: {
      type: Number,
      required: true,
    },
    city: {
      type: String,
      required: true,
    },
    locality: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    pincode: {
      type: String,
      required: true,
    },
    images: [
      {
        type: String,
      },
    ],
    amenities: [
      {
        type: String,
      },
    ],
    highlights: [
      {
        type: String,
      },
    ],
    furnishing: {
      type: String,
      enum: ['Unfurnished', 'Semi-Furnished', 'Fully-Furnished'],
      default: 'Unfurnished',
    },
    status: {
      type: String,
      enum: ['active', 'draft', 'sold'],
      default: 'active',
    },
    listedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    stats: {
      views: { type: Number, default: 0 },
      saves: { type: Number, default: 0 },
      inquiries: { type: Number, default: 0 },
    },
    location: {
      lat: Number,
      lng: Number,
    },
  },
  {
    timestamps: true,
  }
);

// Index for search
propertySchema.index({ city: 1, dealType: 1, propertyType: 1 });

const Property = mongoose.model('Property', propertySchema);

export default Property;