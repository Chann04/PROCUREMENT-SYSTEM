const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const router = express.Router();

// Get all vendors
router.get('/', authenticate, async (req, res) => {
  try {
    const vendors = await req.prisma.vendor.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(vendors);
  } catch (error) {
    console.error('Error fetching vendors:', error);
    res.status(500).json({ error: 'Failed to fetch vendors.' });
  }
});

// Get vendor by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const vendor = await req.prisma.vendor.findUnique({
      where: { id: parseInt(id) },
      include: {
        requests: {
          select: { id: true, itemName: true, status: true, totalPrice: true }
        }
      }
    });
    
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found.' });
    }
    
    res.json(vendor);
  } catch (error) {
    console.error('Error fetching vendor:', error);
    res.status(500).json({ error: 'Failed to fetch vendor.' });
  }
});

// Create vendor (Admin only)
router.post('/', authenticate, authorize('Admin'), async (req, res) => {
  try {
    const { name, contactPerson, contactNumber, email, address } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Vendor name is required.' });
    }
    
    const vendor = await req.prisma.vendor.create({
      data: {
        name,
        contactPerson,
        contactNumber,
        email,
        address
      }
    });
    
    res.status(201).json({ message: 'Vendor created successfully', vendor });
  } catch (error) {
    console.error('Error creating vendor:', error);
    res.status(500).json({ error: 'Failed to create vendor.' });
  }
});

// Update vendor (Admin only)
router.put('/:id', authenticate, authorize('Admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, contactPerson, contactNumber, email, address } = req.body;
    
    const vendor = await req.prisma.vendor.update({
      where: { id: parseInt(id) },
      data: {
        name,
        contactPerson,
        contactNumber,
        email,
        address
      }
    });
    
    res.json({ message: 'Vendor updated successfully', vendor });
  } catch (error) {
    console.error('Error updating vendor:', error);
    res.status(500).json({ error: 'Failed to update vendor.' });
  }
});

// Delete vendor (Admin only)
router.delete('/:id', authenticate, authorize('Admin'), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if vendor has associated requests
    const requestCount = await req.prisma.request.count({
      where: { vendorId: parseInt(id) }
    });
    
    if (requestCount > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete vendor with existing requests.' 
      });
    }
    
    await req.prisma.vendor.delete({
      where: { id: parseInt(id) }
    });
    
    res.json({ message: 'Vendor deleted successfully' });
  } catch (error) {
    console.error('Error deleting vendor:', error);
    res.status(500).json({ error: 'Failed to delete vendor.' });
  }
});

module.exports = router;
