import express from 'express';
import {
  getProperties,
  getProperty,
  createProperty,
  updateProperty,
  deleteProperty,
  toggleSaveProperty,
  getMyProperties,
} from '../controllers/propertyController.js';
import { protect, authorize } from '../middleware/auth.js';
import { uploadPropertyImages } from '../middleware/uploadPropertyImages.js';  // 👈 add this

const router = express.Router();

router.get('/', getProperties);
router.get('/my/listings', protect, authorize('owner', 'broker'), getMyProperties);
router.get('/:id', getProperty);

// 👇 add upload middleware here
router.post('/', protect, authorize('owner', 'broker'), uploadPropertyImages, createProperty);
router.put('/:id', protect, authorize('owner', 'broker'), uploadPropertyImages, updateProperty);

router.delete('/:id', protect, authorize('owner', 'broker'), deleteProperty);
router.post('/:id/save', protect, toggleSaveProperty);

export default router;
