const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create users
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@school.edu' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@school.edu',
      password: hashedPassword,
      role: 'Admin'
    }
  });

  const deptHead = await prisma.user.upsert({
    where: { email: 'depthead@school.edu' },
    update: {},
    create: {
      name: 'Department Head',
      email: 'depthead@school.edu',
      password: hashedPassword,
      role: 'DeptHead'
    }
  });

  const faculty1 = await prisma.user.upsert({
    where: { email: 'faculty1@school.edu' },
    update: {},
    create: {
      name: 'John Smith',
      email: 'faculty1@school.edu',
      password: hashedPassword,
      role: 'Faculty'
    }
  });

  const faculty2 = await prisma.user.upsert({
    where: { email: 'faculty2@school.edu' },
    update: {},
    create: {
      name: 'Jane Doe',
      email: 'faculty2@school.edu',
      password: hashedPassword,
      role: 'Faculty'
    }
  });

  console.log('Created users:', { admin: admin.email, deptHead: deptHead.email, faculty1: faculty1.email, faculty2: faculty2.email });

  // Create categories
  const categories = [
    'IT Equipment',
    'Office Supplies',
    'Laboratory Equipment',
    'Furniture',
    'Books & Publications',
    'Cleaning Supplies',
    'Electrical Equipment',
    'Sports Equipment'
  ];

  for (const name of categories) {
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name }
    });
  }

  console.log('Created categories:', categories);

  // Create vendors
  const vendors = [
    {
      name: 'TechSupply Co.',
      contactPerson: 'Mike Johnson',
      contactNumber: '555-0101',
      email: 'sales@techsupply.com',
      address: '123 Tech Street, Silicon Valley'
    },
    {
      name: 'Office Essentials Inc.',
      contactPerson: 'Sarah Williams',
      contactNumber: '555-0102',
      email: 'orders@officeessentials.com',
      address: '456 Business Ave, Commerce City'
    },
    {
      name: 'LabGear Solutions',
      contactPerson: 'Dr. Robert Chen',
      contactNumber: '555-0103',
      email: 'info@labgear.com',
      address: '789 Science Blvd, Research Park'
    },
    {
      name: 'Educational Resources Ltd.',
      contactPerson: 'Emily Brown',
      contactNumber: '555-0104',
      email: 'contact@eduresources.com',
      address: '321 Learning Lane, Academic District'
    }
  ];

  for (const vendor of vendors) {
    await prisma.vendor.upsert({
      where: { id: vendors.indexOf(vendor) + 1 },
      update: vendor,
      create: vendor
    });
  }

  console.log('Created vendors');

  // Create budget for current academic year
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const startYear = currentMonth < 7 ? currentYear - 1 : currentYear;
  const academicYear = `${startYear}-${startYear + 1}`;

  await prisma.budget.upsert({
    where: { academicYear },
    update: {},
    create: {
      academicYear,
      totalAmount: 150000,
      spentAmount: 0,
      remainingAmount: 150000
    }
  });

  console.log('Created budget for academic year:', academicYear);

  // Create sample requests
  const itCategory = await prisma.category.findUnique({ where: { name: 'IT Equipment' } });
  const officeCategory = await prisma.category.findUnique({ where: { name: 'Office Supplies' } });
  const techVendor = await prisma.vendor.findFirst({ where: { name: 'TechSupply Co.' } });
  const officeVendor = await prisma.vendor.findFirst({ where: { name: 'Office Essentials Inc.' } });

  // Sample requests with different statuses
  const sampleRequests = [
    {
      requesterId: faculty1.id,
      categoryId: itCategory.id,
      vendorId: techVendor.id,
      itemName: 'Laptop Computer',
      description: 'Dell XPS 15 for research purposes',
      quantity: 2,
      unitPrice: 1500,
      totalPrice: 3000,
      status: 'Pending'
    },
    {
      requesterId: faculty1.id,
      categoryId: officeCategory.id,
      vendorId: officeVendor.id,
      itemName: 'Printer Paper',
      description: 'A4 Paper, 500 sheets per ream',
      quantity: 50,
      unitPrice: 8,
      totalPrice: 400,
      status: 'Approved',
      approvedBy: deptHead.id,
      approvedAt: new Date()
    },
    {
      requesterId: faculty2.id,
      categoryId: itCategory.id,
      vendorId: techVendor.id,
      itemName: 'Projector',
      description: 'Epson PowerLite for classroom presentations',
      quantity: 1,
      unitPrice: 800,
      totalPrice: 800,
      status: 'Draft'
    },
    {
      requesterId: faculty2.id,
      categoryId: officeCategory.id,
      vendorId: officeVendor.id,
      itemName: 'Whiteboard Markers',
      description: 'Assorted colors, pack of 12',
      quantity: 20,
      unitPrice: 15,
      totalPrice: 300,
      status: 'Pending'
    }
  ];

  for (const request of sampleRequests) {
    await prisma.request.create({
      data: request
    });
  }

  console.log('Created sample requests');
  console.log('Database seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
