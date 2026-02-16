const express = require('express');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

// Get dashboard statistics
router.get('/stats', authenticate, async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    const startYear = currentMonth < 7 ? currentYear - 1 : currentYear;
    const academicYear = `${startYear}-${startYear + 1}`;
    
    // Get current budget
    let budget = await req.prisma.budget.findUnique({
      where: { academicYear }
    });
    
    if (!budget) {
      budget = { totalAmount: 0, spentAmount: 0, remainingAmount: 0 };
    }
    
    // Get counts based on user role
    const isAdmin = req.user.role === 'Admin';
    const isDeptHead = req.user.role === 'DeptHead';
    const whereClause = (isAdmin || isDeptHead) ? {} : { requesterId: req.user.id };
    
    // Pending approvals count
    const pendingApprovals = await req.prisma.request.count({
      where: { status: 'Pending' }
    });
    
    // Total requests by status
    const requestsByStatus = await req.prisma.request.groupBy({
      by: ['status'],
      where: whereClause,
      _count: true
    });
    
    // Monthly spending (current month)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    
    const monthlySpending = await req.prisma.request.aggregate({
      where: {
        status: { in: ['Ordered', 'Received', 'Completed'] },
        orderedAt: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      },
      _sum: {
        totalPrice: true
      }
    });
    
    // Recent requests
    const recentRequests = await req.prisma.request.findMany({
      where: whereClause,
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        requester: {
          select: { name: true }
        },
        category: {
          select: { name: true }
        }
      }
    });
    
    // Total requests count
    const totalRequests = await req.prisma.request.count({
      where: whereClause
    });
    
    // Approved this month
    const approvedThisMonth = await req.prisma.request.count({
      where: {
        status: 'Approved',
        approvedAt: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      }
    });
    
    res.json({
      budget: {
        total: budget.totalAmount,
        spent: budget.spentAmount,
        remaining: budget.remainingAmount,
        academicYear
      },
      pendingApprovals,
      totalRequests,
      monthlySpending: monthlySpending._sum.totalPrice || 0,
      approvedThisMonth,
      requestsByStatus: requestsByStatus.reduce((acc, item) => {
        acc[item.status] = item._count;
        return acc;
      }, {}),
      recentRequests
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics.' });
  }
});

// Get user's request history
router.get('/my-requests', authenticate, async (req, res) => {
  try {
    const requests = await req.prisma.request.findMany({
      where: { requesterId: req.user.id },
      include: {
        category: true,
        vendor: true
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json(requests);
  } catch (error) {
    console.error('Error fetching user requests:', error);
    res.status(500).json({ error: 'Failed to fetch your requests.' });
  }
});

module.exports = router;
