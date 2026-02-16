const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const router = express.Router();

// Valid status transitions
const statusTransitions = {
  'Draft': ['Pending'],
  'Pending': ['Approved', 'Rejected'],
  'Approved': ['Ordered'],
  'Rejected': [],
  'Ordered': ['Received'],
  'Received': ['Completed'],
  'Completed': []
};

// Get all requests (filtered by role)
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, categoryId } = req.query;
    const where = {};
    
    // Faculty can only see their own requests
    if (req.user.role === 'Faculty') {
      where.requesterId = req.user.id;
    }
    
    if (status) where.status = status;
    if (categoryId) where.categoryId = parseInt(categoryId);
    
    const requests = await req.prisma.request.findMany({
      where,
      include: {
        requester: {
          select: { id: true, name: true, email: true }
        },
        category: true,
        vendor: true
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json(requests);
  } catch (error) {
    console.error('Error fetching requests:', error);
    res.status(500).json({ error: 'Failed to fetch requests.' });
  }
});

// Get pending requests (DeptHead and Admin)
router.get('/pending', authenticate, authorize('DeptHead', 'Admin'), async (req, res) => {
  try {
    const requests = await req.prisma.request.findMany({
      where: { status: 'Pending' },
      include: {
        requester: {
          select: { id: true, name: true, email: true }
        },
        category: true,
        vendor: true
      },
      orderBy: { createdAt: 'asc' }
    });
    
    res.json(requests);
  } catch (error) {
    console.error('Error fetching pending requests:', error);
    res.status(500).json({ error: 'Failed to fetch pending requests.' });
  }
});

// Get request by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const request = await req.prisma.request.findUnique({
      where: { id: parseInt(id) },
      include: {
        requester: {
          select: { id: true, name: true, email: true }
        },
        category: true,
        vendor: true
      }
    });
    
    if (!request) {
      return res.status(404).json({ error: 'Request not found.' });
    }
    
    // Faculty can only view their own requests
    if (req.user.role === 'Faculty' && request.requesterId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }
    
    res.json(request);
  } catch (error) {
    console.error('Error fetching request:', error);
    res.status(500).json({ error: 'Failed to fetch request.' });
  }
});

// Create new request (Faculty, DeptHead)
router.post('/', authenticate, authorize('Faculty', 'DeptHead', 'Admin'), async (req, res) => {
  try {
    const { categoryId, vendorId, itemName, description, quantity, unitPrice, status } = req.body;
    
    // Validate required fields
    if (!categoryId || !itemName || !quantity || !unitPrice) {
      return res.status(400).json({ 
        error: 'Category, item name, quantity, and unit price are required.' 
      });
    }
    
    const totalPrice = quantity * unitPrice;
    
    // Check budget if submitting directly as Pending
    if (status === 'Pending') {
      const currentYear = new Date().getFullYear();
      const academicYear = `${currentYear}-${currentYear + 1}`;
      
      const budget = await req.prisma.budget.findUnique({
        where: { academicYear }
      });
      
      if (budget && totalPrice > budget.remainingAmount) {
        return res.status(400).json({ 
          error: 'Budget exceeded',
          message: `Request total (${totalPrice.toFixed(2)}) exceeds remaining budget (${budget.remainingAmount.toFixed(2)})`,
          budgetExceeded: true,
          totalPrice,
          remainingBudget: budget.remainingAmount
        });
      }
    }
    
    const request = await req.prisma.request.create({
      data: {
        requesterId: req.user.id,
        categoryId: parseInt(categoryId),
        vendorId: vendorId ? parseInt(vendorId) : null,
        itemName,
        description,
        quantity: parseInt(quantity),
        unitPrice: parseFloat(unitPrice),
        totalPrice,
        status: status || 'Draft'
      },
      include: {
        requester: {
          select: { id: true, name: true, email: true }
        },
        category: true,
        vendor: true
      }
    });
    
    res.status(201).json({ message: 'Request created successfully', request });
  } catch (error) {
    console.error('Error creating request:', error);
    res.status(500).json({ error: 'Failed to create request.' });
  }
});

// Update request (only Draft status can be fully edited)
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { categoryId, vendorId, itemName, description, quantity, unitPrice } = req.body;
    
    const existingRequest = await req.prisma.request.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!existingRequest) {
      return res.status(404).json({ error: 'Request not found.' });
    }
    
    // Only requester can edit their own draft
    if (existingRequest.requesterId !== req.user.id && req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Access denied.' });
    }
    
    if (existingRequest.status !== 'Draft') {
      return res.status(400).json({ error: 'Only draft requests can be edited.' });
    }
    
    const totalPrice = (quantity || existingRequest.quantity) * (unitPrice || existingRequest.unitPrice);
    
    const request = await req.prisma.request.update({
      where: { id: parseInt(id) },
      data: {
        categoryId: categoryId ? parseInt(categoryId) : undefined,
        vendorId: vendorId ? parseInt(vendorId) : undefined,
        itemName,
        description,
        quantity: quantity ? parseInt(quantity) : undefined,
        unitPrice: unitPrice ? parseFloat(unitPrice) : undefined,
        totalPrice
      },
      include: {
        requester: {
          select: { id: true, name: true, email: true }
        },
        category: true,
        vendor: true
      }
    });
    
    res.json({ message: 'Request updated successfully', request });
  } catch (error) {
    console.error('Error updating request:', error);
    res.status(500).json({ error: 'Failed to update request.' });
  }
});

// Submit request (Draft -> Pending)
router.post('/:id/submit', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    const existingRequest = await req.prisma.request.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!existingRequest) {
      return res.status(404).json({ error: 'Request not found.' });
    }
    
    if (existingRequest.requesterId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }
    
    if (existingRequest.status !== 'Draft') {
      return res.status(400).json({ error: 'Only draft requests can be submitted.' });
    }
    
    // Check budget before submitting
    const currentYear = new Date().getFullYear();
    const academicYear = `${currentYear}-${currentYear + 1}`;
    
    const budget = await req.prisma.budget.findUnique({
      where: { academicYear }
    });
    
    if (budget && existingRequest.totalPrice > budget.remainingAmount) {
      return res.status(400).json({ 
        error: 'Budget exceeded',
        message: `Request total (${existingRequest.totalPrice.toFixed(2)}) exceeds remaining budget (${budget.remainingAmount.toFixed(2)})`,
        budgetExceeded: true,
        totalPrice: existingRequest.totalPrice,
        remainingBudget: budget.remainingAmount
      });
    }
    
    const request = await req.prisma.request.update({
      where: { id: parseInt(id) },
      data: { status: 'Pending' },
      include: {
        requester: {
          select: { id: true, name: true, email: true }
        },
        category: true,
        vendor: true
      }
    });
    
    res.json({ message: 'Request submitted for approval', request });
  } catch (error) {
    console.error('Error submitting request:', error);
    res.status(500).json({ error: 'Failed to submit request.' });
  }
});

// Approve request (DeptHead, Admin)
router.post('/:id/approve', authenticate, authorize('DeptHead', 'Admin'), async (req, res) => {
  try {
    const { id } = req.params;
    
    const existingRequest = await req.prisma.request.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!existingRequest) {
      return res.status(404).json({ error: 'Request not found.' });
    }
    
    if (existingRequest.status !== 'Pending') {
      return res.status(400).json({ error: 'Only pending requests can be approved.' });
    }
    
    // Check budget before approving
    const currentYear = new Date().getFullYear();
    const academicYear = `${currentYear}-${currentYear + 1}`;
    
    const budget = await req.prisma.budget.findUnique({
      where: { academicYear }
    });
    
    if (budget && existingRequest.totalPrice > budget.remainingAmount) {
      return res.status(400).json({ 
        error: 'Budget exceeded',
        message: `Request total (${existingRequest.totalPrice.toFixed(2)}) exceeds remaining budget (${budget.remainingAmount.toFixed(2)})`,
        budgetExceeded: true,
        totalPrice: existingRequest.totalPrice,
        remainingBudget: budget.remainingAmount
      });
    }
    
    const request = await req.prisma.request.update({
      where: { id: parseInt(id) },
      data: { 
        status: 'Approved',
        approvedBy: req.user.id,
        approvedAt: new Date()
      },
      include: {
        requester: {
          select: { id: true, name: true, email: true }
        },
        category: true,
        vendor: true
      }
    });
    
    res.json({ message: 'Request approved', request });
  } catch (error) {
    console.error('Error approving request:', error);
    res.status(500).json({ error: 'Failed to approve request.' });
  }
});

// Reject request (DeptHead, Admin)
router.post('/:id/reject', authenticate, authorize('DeptHead', 'Admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    const existingRequest = await req.prisma.request.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!existingRequest) {
      return res.status(404).json({ error: 'Request not found.' });
    }
    
    if (existingRequest.status !== 'Pending') {
      return res.status(400).json({ error: 'Only pending requests can be rejected.' });
    }
    
    const request = await req.prisma.request.update({
      where: { id: parseInt(id) },
      data: { 
        status: 'Rejected',
        rejectionReason: reason || 'No reason provided',
        approvedBy: req.user.id,
        approvedAt: new Date()
      },
      include: {
        requester: {
          select: { id: true, name: true, email: true }
        },
        category: true,
        vendor: true
      }
    });
    
    res.json({ message: 'Request rejected', request });
  } catch (error) {
    console.error('Error rejecting request:', error);
    res.status(500).json({ error: 'Failed to reject request.' });
  }
});

// Mark as ordered (DeptHead, Admin)
router.post('/:id/order', authenticate, authorize('DeptHead', 'Admin'), async (req, res) => {
  try {
    const { id } = req.params;
    
    const existingRequest = await req.prisma.request.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!existingRequest) {
      return res.status(404).json({ error: 'Request not found.' });
    }
    
    if (existingRequest.status !== 'Approved') {
      return res.status(400).json({ error: 'Only approved requests can be marked as ordered.' });
    }
    
    // Update budget when ordered
    const currentYear = new Date().getFullYear();
    const academicYear = `${currentYear}-${currentYear + 1}`;
    
    const budget = await req.prisma.budget.findUnique({
      where: { academicYear }
    });
    
    if (budget) {
      await req.prisma.budget.update({
        where: { academicYear },
        data: {
          spentAmount: budget.spentAmount + existingRequest.totalPrice,
          remainingAmount: budget.remainingAmount - existingRequest.totalPrice
        }
      });
    }
    
    const request = await req.prisma.request.update({
      where: { id: parseInt(id) },
      data: { 
        status: 'Ordered',
        orderedAt: new Date()
      },
      include: {
        requester: {
          select: { id: true, name: true, email: true }
        },
        category: true,
        vendor: true
      }
    });
    
    res.json({ message: 'Request marked as ordered', request });
  } catch (error) {
    console.error('Error marking request as ordered:', error);
    res.status(500).json({ error: 'Failed to update request status.' });
  }
});

// Mark as received
router.post('/:id/receive', authenticate, authorize('DeptHead', 'Admin'), async (req, res) => {
  try {
    const { id } = req.params;
    
    const existingRequest = await req.prisma.request.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!existingRequest) {
      return res.status(404).json({ error: 'Request not found.' });
    }
    
    if (existingRequest.status !== 'Ordered') {
      return res.status(400).json({ error: 'Only ordered requests can be marked as received.' });
    }
    
    const request = await req.prisma.request.update({
      where: { id: parseInt(id) },
      data: { 
        status: 'Received',
        receivedAt: new Date()
      },
      include: {
        requester: {
          select: { id: true, name: true, email: true }
        },
        category: true,
        vendor: true
      }
    });
    
    res.json({ message: 'Request marked as received', request });
  } catch (error) {
    console.error('Error marking request as received:', error);
    res.status(500).json({ error: 'Failed to update request status.' });
  }
});

// Mark as completed
router.post('/:id/complete', authenticate, authorize('DeptHead', 'Admin'), async (req, res) => {
  try {
    const { id } = req.params;
    
    const existingRequest = await req.prisma.request.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!existingRequest) {
      return res.status(404).json({ error: 'Request not found.' });
    }
    
    if (existingRequest.status !== 'Received') {
      return res.status(400).json({ error: 'Only received requests can be marked as completed.' });
    }
    
    const request = await req.prisma.request.update({
      where: { id: parseInt(id) },
      data: { 
        status: 'Completed',
        completedAt: new Date()
      },
      include: {
        requester: {
          select: { id: true, name: true, email: true }
        },
        category: true,
        vendor: true
      }
    });
    
    res.json({ message: 'Request completed', request });
  } catch (error) {
    console.error('Error completing request:', error);
    res.status(500).json({ error: 'Failed to complete request.' });
  }
});

// Delete request (only Draft)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    const existingRequest = await req.prisma.request.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!existingRequest) {
      return res.status(404).json({ error: 'Request not found.' });
    }
    
    if (existingRequest.requesterId !== req.user.id && req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Access denied.' });
    }
    
    if (existingRequest.status !== 'Draft' && req.user.role !== 'Admin') {
      return res.status(400).json({ error: 'Only draft requests can be deleted.' });
    }
    
    await req.prisma.request.delete({
      where: { id: parseInt(id) }
    });
    
    res.json({ message: 'Request deleted successfully' });
  } catch (error) {
    console.error('Error deleting request:', error);
    res.status(500).json({ error: 'Failed to delete request.' });
  }
});

module.exports = router;
