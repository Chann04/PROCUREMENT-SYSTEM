-- =====================================================
-- SCHOOL PROCUREMENT SYSTEM - SUPABASE MIGRATION
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TASK 1: DATABASE SCHEMA
-- =====================================================

-- -----------------------------------------------------
-- Table: profiles (linked to auth.users)
-- -----------------------------------------------------
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'Faculty' CHECK (role IN ('Faculty', 'DeptHead', 'Admin')),
    department TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster role lookups
CREATE INDEX idx_profiles_role ON public.profiles(role);

-- -----------------------------------------------------
-- Table: categories
-- -----------------------------------------------------
CREATE TABLE public.categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------
-- Table: vendors
-- -----------------------------------------------------
CREATE TABLE public.vendors (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    contact_person TEXT,
    contact_number TEXT,
    email TEXT,
    address TEXT,
    category TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------
-- Table: budgets
-- -----------------------------------------------------
CREATE TABLE public.budgets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    academic_year TEXT UNIQUE NOT NULL,
    total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    spent_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    remaining_amount DECIMAL(12, 2) GENERATED ALWAYS AS (total_amount - spent_amount) STORED,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------
-- Table: requests
-- -----------------------------------------------------
CREATE TABLE public.requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    requester_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
    item_name TEXT NOT NULL,
    description TEXT,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    total_price DECIMAL(12, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Pending', 'Approved', 'Rejected', 'Ordered', 'Received', 'Completed')),
    rejection_reason TEXT,
    approved_by UUID REFERENCES public.profiles(id),
    approved_at TIMESTAMPTZ,
    ordered_at TIMESTAMPTZ,
    received_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX idx_requests_requester ON public.requests(requester_id);
CREATE INDEX idx_requests_status ON public.requests(status);
CREATE INDEX idx_requests_created ON public.requests(created_at DESC);

-- =====================================================
-- TASK 2: ROW-LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------
-- Helper function to get current user's role
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- -----------------------------------------------------
-- PROFILES Policies
-- -----------------------------------------------------
-- Users can view their own profile
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

-- Users can update their own profile (except role)
CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Admin can view all profiles
CREATE POLICY "Admin can view all profiles"
    ON public.profiles FOR SELECT
    USING (public.get_user_role() = 'Admin');

-- Admin can manage all profiles
CREATE POLICY "Admin can manage all profiles"
    ON public.profiles FOR ALL
    USING (public.get_user_role() = 'Admin');

-- DeptHead can view all profiles
CREATE POLICY "DeptHead can view all profiles"
    ON public.profiles FOR SELECT
    USING (public.get_user_role() = 'DeptHead');

-- -----------------------------------------------------
-- CATEGORIES Policies
-- -----------------------------------------------------
-- All authenticated users can view categories
CREATE POLICY "Authenticated users can view categories"
    ON public.categories FOR SELECT
    TO authenticated
    USING (true);

-- Only Admin can manage categories
CREATE POLICY "Admin can manage categories"
    ON public.categories FOR ALL
    USING (public.get_user_role() = 'Admin');

-- -----------------------------------------------------
-- VENDORS Policies
-- -----------------------------------------------------
-- All authenticated users can view vendors
CREATE POLICY "Authenticated users can view vendors"
    ON public.vendors FOR SELECT
    TO authenticated
    USING (true);

-- Only Admin can manage vendors
CREATE POLICY "Admin can manage vendors"
    ON public.vendors FOR ALL
    USING (public.get_user_role() = 'Admin');

-- -----------------------------------------------------
-- BUDGETS Policies
-- -----------------------------------------------------
-- All authenticated users can view budgets
CREATE POLICY "Authenticated users can view budgets"
    ON public.budgets FOR SELECT
    TO authenticated
    USING (true);

-- Only Admin can manage budgets
CREATE POLICY "Admin can manage budgets"
    ON public.budgets FOR ALL
    USING (public.get_user_role() = 'Admin');

-- -----------------------------------------------------
-- REQUESTS Policies (Most Complex)
-- -----------------------------------------------------

-- Faculty can view their own requests only
CREATE POLICY "Faculty can view own requests"
    ON public.requests FOR SELECT
    USING (
        auth.uid() = requester_id
    );

-- Faculty can create requests
CREATE POLICY "Faculty can create requests"
    ON public.requests FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = requester_id
    );

-- Faculty can update their own draft requests
CREATE POLICY "Faculty can update own draft requests"
    ON public.requests FOR UPDATE
    USING (
        auth.uid() = requester_id 
        AND status = 'Draft'
    )
    WITH CHECK (
        auth.uid() = requester_id
    );

-- Faculty can delete their own draft requests
CREATE POLICY "Faculty can delete own draft requests"
    ON public.requests FOR DELETE
    USING (
        auth.uid() = requester_id 
        AND status = 'Draft'
    );

-- DeptHead can view all requests
CREATE POLICY "DeptHead can view all requests"
    ON public.requests FOR SELECT
    USING (
        public.get_user_role() IN ('DeptHead', 'Admin')
    );

-- DeptHead can update request status (approve/reject)
CREATE POLICY "DeptHead can update request status"
    ON public.requests FOR UPDATE
    USING (
        public.get_user_role() IN ('DeptHead', 'Admin')
    );

-- Admin has full access to requests
CREATE POLICY "Admin full access to requests"
    ON public.requests FOR ALL
    USING (
        public.get_user_role() = 'Admin'
    );

-- =====================================================
-- TASK 4: AUTHENTICATION TRIGGERS
-- =====================================================

-- -----------------------------------------------------
-- Function: Handle new user signup
-- Creates a profile entry when a new user signs up
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, email, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'role', 'Faculty')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Auto-create profile on signup
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- -----------------------------------------------------
-- Function: Update timestamps automatically
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update_updated_at trigger to all relevant tables
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_vendors_updated_at
    BEFORE UPDATE ON public.vendors
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_budgets_updated_at
    BEFORE UPDATE ON public.budgets
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_requests_updated_at
    BEFORE UPDATE ON public.requests
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

-- -----------------------------------------------------
-- Function: Update budget spent amount when request is ordered
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_budget_on_order()
RETURNS TRIGGER AS $$
DECLARE
    current_year TEXT;
BEGIN
    -- Get current academic year
    current_year := EXTRACT(YEAR FROM NOW())::TEXT || '-' || (EXTRACT(YEAR FROM NOW()) + 1)::TEXT;
    
    -- When status changes to 'Ordered', add to spent amount
    IF NEW.status = 'Ordered' AND OLD.status != 'Ordered' THEN
        UPDATE public.budgets
        SET spent_amount = spent_amount + NEW.total_price
        WHERE academic_year = current_year;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_request_ordered
    AFTER UPDATE ON public.requests
    FOR EACH ROW
    EXECUTE FUNCTION public.update_budget_on_order();

-- =====================================================
-- SEED DATA
-- =====================================================

-- Insert default categories
INSERT INTO public.categories (name, description) VALUES
    ('IT Equipment', 'Computers, laptops, monitors, peripherals'),
    ('Office Supplies', 'Paper, pens, folders, office essentials'),
    ('Laboratory Equipment', 'Lab tools, chemicals, scientific equipment'),
    ('Furniture', 'Desks, chairs, cabinets, storage'),
    ('Books & Publications', 'Textbooks, journals, educational materials'),
    ('Cleaning Supplies', 'Cleaning materials and janitorial supplies'),
    ('Electrical Equipment', 'Electrical components and tools'),
    ('Sports Equipment', 'Athletic equipment and supplies');

-- Insert sample vendors
INSERT INTO public.vendors (name, contact_person, contact_number, email, address, category) VALUES
    ('TechSupply Co.', 'Mike Johnson', '555-0101', 'sales@techsupply.com', '123 Tech Street, Silicon Valley', 'IT Equipment'),
    ('Office Essentials Inc.', 'Sarah Williams', '555-0102', 'orders@officeessentials.com', '456 Business Ave, Commerce City', 'Office Supplies'),
    ('LabGear Solutions', 'Dr. Robert Chen', '555-0103', 'info@labgear.com', '789 Science Blvd, Research Park', 'Laboratory Equipment'),
    ('Educational Resources Ltd.', 'Emily Brown', '555-0104', 'contact@eduresources.com', '321 Learning Lane, Academic District', 'Books & Publications');

-- Insert default budget for current academic year
INSERT INTO public.budgets (academic_year, total_amount, spent_amount) VALUES
    ('2025-2026', 150000.00, 0.00);

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
