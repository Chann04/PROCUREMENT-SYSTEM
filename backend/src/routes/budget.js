const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const router = express.Router();

// Get all budgets
router.get('/', authenticate, async (req, res) => {
  try {
    const budgets = await req.prisma.budget.findMany({
      orderBy: { academicYear: 'desc' }
    });
    res.json(budgets);
  } catch (error) {
    console.error('Error fetching budgets:', error);
    res.status(500).json({ error: 'Failed to fetch budgets.' });
  }
});

// Get current budget
router.get('/current', authenticate, async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    
    // Academic year typically starts in August/September
    // If we're before August, use previous year as start
    const startYear = currentMonth < 7 ? currentYear - 1 : currentYear;
    const academicYear = `${startYear}-${startYear + 1}`;
    
    let budget = await req.prisma.budget.findUnique({
      where: { academicYear }
    });
    
    // If no budget exists for current academic year, create default
    if (!budget) {
      budget = await req.prisma.budget.create({
        data: {
          academicYear,
          totalAmount: 100000, // Default budget
          spentAmount: 0,
          remainingAmount: 100000
        }
      });
    }
    
    res.json(budget);
  } catch (error) {
    console.error('Error fetching current budget:', error);
    res.status(500).json({ error: 'Failed to fetch current budget.' });
  }
});

// Get budget by academic year
router.get('/:academicYear', authenticate, async (req, res) => {
  try {
    const { academicYear } = req.params;
    const budget = await req.prisma.budget.findUnique({
      where: { academicYear }
    });
    
    if (!budget) {
      return res.status(404).json({ error: 'Budget not found for this academic year.' });
    }
    
    res.json(budget);
  } catch (error) {
    console.error('Error fetching budget:', error);
    res.status(500).json({ error: 'Failed to fetch budget.' });
  }
});

// Create or update budget (Admin only)
router.post('/', authenticate, authorize('Admin'), async (req, res) => {
  try {
    const { academicYear, totalAmount } = req.body;
    
    if (!academicYear || !totalAmount) {
      return res.status(400).json({ error: 'Academic year and total amount are required.' });
    }
    
    // Check if budget exists
    const existingBudget = await req.prisma.budget.findUnique({
      where: { academicYear }
    });
    
    if (existingBudget) {
      // Update existing budget
      const newRemaining = totalAmount - existingBudget.spentAmount;
      
      if (newRemaining < 0) {
        return res.status(400).json({ 
          error: 'New budget amount cannot be less than already spent amount.',
          spentAmount: existingBudget.spentAmount
        });
      }
      
      const budget = await req.prisma.budget.update({
        where: { academicYear },
        data: {
          totalAmount: parseFloat(totalAmount),
          remainingAmount: newRemaining
        }
      });
      
      res.json({ message: 'Budget updated successfully', budget });
    } else {
      // Create new budget
      const budget = await req.prisma.budget.create({
        data: {
          academicYear,
          totalAmount: parseFloat(totalAmount),
          spentAmount: 0,
          remainingAmount: parseFloat(totalAmount)
        }
      });
      
      res.status(201).json({ message: 'Budget created successfully', budget });
    }
  } catch (error) {
    console.error('Error creating/updating budget:', error);
    res.status(500).json({ error: 'Failed to create/update budget.' });
  }
});

// Update budget (Admin only)
router.put('/:academicYear', authenticate, authorize('Admin'), async (req, res) => {
  try {
    const { academicYear } = req.params;
    const { totalAmount } = req.body;
    
    const existingBudget = await req.prisma.budget.findUnique({
      where: { academicYear }
    });
    
    if (!existingBudget) {
      return res.status(404).json({ error: 'Budget not found.' });
    }
    
    const newRemaining = totalAmount - existingBudget.spentAmount;
    
    if (newRemaining < 0) {
      return res.status(400).json({ 
        error: 'New budget amount cannot be less than already spent amount.',
        spentAmount: existingBudget.spentAmount
      });
    }
    
    const budget = await req.prisma.budget.update({
      where: { academicYear },
      data: {
        totalAmount: parseFloat(totalAmount),
        remainingAmount: newRemaining
      }
    });
    
    res.json({ message: 'Budget updated successfully', budget });
  } catch (error) {
    console.error('Error updating budget:', error);
    res.status(500).json({ error: 'Failed to update budget.' });
  }
});

// Get budget report
router.get('/:academicYear/report', authenticate, authorize('DeptHead', 'Admin'), async (req, res) => {
  try {
    const { academicYear } = req.params;
    
    const budget = await req.prisma.budget.findUnique({
      where: { academicYear }
    });
    
    if (!budget) {
      return res.status(404).json({ error: 'Budget not found.' });
    }
    
    // Get spending by category
    const spendingByCategory = await req.prisma.request.groupBy({
      by: ['categoryId'],
      where: {
        status: { in: ['Ordered', 'Received', 'Completed'] },
        orderedAt: {
          gte: new Date(`${academicYear.split('-')[0]}-08-01`),
          lt: new Date(`${parseInt(academicYear.split('-')[1])}-08-01`)
        }
      },
      _sum: {
        totalPrice: true
      }
    });
    
    // Get category details
    const categories = await req.prisma.category.findMany();
    const categoryMap = {};
    categories.forEach(c => categoryMap[c.id] = c.name);
    
    const categorySpending = spendingByCategory.map(item => ({
      category: categoryMap[item.categoryId] || 'Unknown',
      amount: item._sum.totalPrice || 0
    }));
    
    // Get monthly spending
    const monthlySpending = await req.prisma.request.findMany({
      where: {
        status: { in: ['Ordered', 'Received', 'Completed'] },
        orderedAt: { not: null }
      },
      select: {
        totalPrice: true,
        orderedAt: true
      }
    });
    
    res.json({
      budget,
      categorySpending,
      utilizationPercentage: ((budget.spentAmount / budget.totalAmount) * 100).toFixed(2)
    });
  } catch (error) {
    console.error('Error generating budget report:', error);
    res.status(500).json({ error: 'Failed to generate budget report.' });
  }
});

module.exports = router;
