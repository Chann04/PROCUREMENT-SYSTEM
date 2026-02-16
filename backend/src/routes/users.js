const express = require('express');
const bcrypt = require('bcryptjs');
const { authenticate, authorize } = require('../middleware/auth');
const router = express.Router();

// Get all users (Admin only)
router.get('/', authenticate, authorize('Admin'), async (req, res) => {
  try {
    const users = await req.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
});

// Get user by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Users can only view their own profile unless Admin
    if (req.user.role !== 'Admin' && req.user.id !== parseInt(id)) {
      return res.status(403).json({ error: 'Access denied.' });
    }
    
    const user = await req.prisma.user.findUnique({
      where: { id: parseInt(id) },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user.' });
  }
});

// Update user (Admin only for role changes, users can update own profile)
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, role } = req.body;
    
    // Check permissions
    if (req.user.role !== 'Admin' && req.user.id !== parseInt(id)) {
      return res.status(403).json({ error: 'Access denied.' });
    }
    
    // Only Admin can change roles
    if (role && req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Only admins can change user roles.' });
    }
    
    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (role) updateData.role = role;
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }
    
    const user = await req.prisma.user.update({
      where: { id: parseInt(id) },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        updatedAt: true
      }
    });
    
    res.json({ message: 'User updated successfully', user });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user.' });
  }
});

// Delete user (Admin only)
router.delete('/:id', authenticate, authorize('Admin'), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Prevent deleting self
    if (req.user.id === parseInt(id)) {
      return res.status(400).json({ error: 'Cannot delete your own account.' });
    }
    
    await req.prisma.user.delete({
      where: { id: parseInt(id) }
    });
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user.' });
  }
});

module.exports = router;
