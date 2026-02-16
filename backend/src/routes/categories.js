const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const router = express.Router();

// Get all categories
router.get('/', authenticate, async (req, res) => {
  try {
    const categories = await req.prisma.category.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories.' });
  }
});

// Get category by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const category = await req.prisma.category.findUnique({
      where: { id: parseInt(id) },
      include: {
        requests: {
          select: { id: true, itemName: true, status: true }
        }
      }
    });
    
    if (!category) {
      return res.status(404).json({ error: 'Category not found.' });
    }
    
    res.json(category);
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({ error: 'Failed to fetch category.' });
  }
});

// Create category (Admin only)
router.post('/', authenticate, authorize('Admin'), async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Category name is required.' });
    }
    
    const category = await req.prisma.category.create({
      data: { name }
    });
    
    res.status(201).json({ message: 'Category created successfully', category });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Category with this name already exists.' });
    }
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Failed to create category.' });
  }
});

// Update category (Admin only)
router.put('/:id', authenticate, authorize('Admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    
    const category = await req.prisma.category.update({
      where: { id: parseInt(id) },
      data: { name }
    });
    
    res.json({ message: 'Category updated successfully', category });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Category with this name already exists.' });
    }
    console.error('Error updating category:', error);
    res.status(500).json({ error: 'Failed to update category.' });
  }
});

// Delete category (Admin only)
router.delete('/:id', authenticate, authorize('Admin'), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if category has associated requests
    const requestCount = await req.prisma.request.count({
      where: { categoryId: parseInt(id) }
    });
    
    if (requestCount > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete category with existing requests.' 
      });
    }
    
    await req.prisma.category.delete({
      where: { id: parseInt(id) }
    });
    
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Failed to delete category.' });
  }
});

module.exports = router;
