-- =====================================================
-- COMMENTS & DELEGATION MIGRATION
-- =====================================================

-- -----------------------------------------------------
-- Table: request_comments (Questions & Comments thread)
-- -----------------------------------------------------
CREATE TABLE public.request_comments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    request_id UUID REFERENCES public.requests(id) ON DELETE CASCADE NOT NULL,
    author_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX idx_request_comments_request ON public.request_comments(request_id);
CREATE INDEX idx_request_comments_created ON public.request_comments(created_at);

-- Enable RLS
ALTER TABLE public.request_comments ENABLE ROW LEVEL SECURITY;

-- Policies for comments
-- Anyone involved in the request can view comments
CREATE POLICY "Users can view comments on accessible requests"
    ON public.request_comments FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.requests r 
            WHERE r.id = request_id 
            AND (
                r.requester_id = auth.uid() 
                OR public.get_user_role() IN ('DeptHead', 'Admin')
            )
        )
    );

-- Authenticated users can add comments to requests they can access
CREATE POLICY "Users can add comments to accessible requests"
    ON public.request_comments FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = author_id
        AND EXISTS (
            SELECT 1 FROM public.requests r 
            WHERE r.id = request_id 
            AND (
                r.requester_id = auth.uid() 
                OR public.get_user_role() IN ('DeptHead', 'Admin')
            )
        )
    );

-- -----------------------------------------------------
-- Add delegation fields to requests
-- -----------------------------------------------------
ALTER TABLE public.requests 
ADD COLUMN delegated_to UUID REFERENCES public.profiles(id),
ADD COLUMN delegated_by UUID REFERENCES public.profiles(id),
ADD COLUMN delegated_at TIMESTAMPTZ;

-- -----------------------------------------------------
-- Table: request_activity (Audit Trail)
-- -----------------------------------------------------
CREATE TABLE public.request_activity (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    request_id UUID REFERENCES public.requests(id) ON DELETE CASCADE NOT NULL,
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX idx_request_activity_request ON public.request_activity(request_id);
CREATE INDEX idx_request_activity_created ON public.request_activity(created_at DESC);

-- Enable RLS
ALTER TABLE public.request_activity ENABLE ROW LEVEL SECURITY;

-- Anyone who can view the request can view its activity
CREATE POLICY "Users can view activity on accessible requests"
    ON public.request_activity FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.requests r 
            WHERE r.id = request_id 
            AND (
                r.requester_id = auth.uid() 
                OR public.get_user_role() IN ('DeptHead', 'Admin')
            )
        )
    );

-- System can insert activity (via triggers or service role)
CREATE POLICY "System can insert activity"
    ON public.request_activity FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- -----------------------------------------------------
-- Function: Log request activity
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_request_activity()
RETURNS TRIGGER AS $$
BEGIN
    -- Log status changes
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO public.request_activity (request_id, actor_id, action, details)
        VALUES (
            NEW.id,
            auth.uid(),
            'status_changed',
            jsonb_build_object(
                'from', OLD.status,
                'to', NEW.status,
                'rejection_reason', CASE WHEN NEW.status = 'Rejected' THEN NEW.rejection_reason ELSE NULL END
            )
        );
    END IF;
    
    -- Log delegation
    IF OLD.delegated_to IS DISTINCT FROM NEW.delegated_to AND NEW.delegated_to IS NOT NULL THEN
        INSERT INTO public.request_activity (request_id, actor_id, action, details)
        VALUES (
            NEW.id,
            auth.uid(),
            'delegated',
            jsonb_build_object('delegated_to', NEW.delegated_to)
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for logging activity
CREATE TRIGGER on_request_update_log_activity
    AFTER UPDATE ON public.requests
    FOR EACH ROW
    EXECUTE FUNCTION public.log_request_activity();

-- Function to log request creation
CREATE OR REPLACE FUNCTION public.log_request_creation()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.request_activity (request_id, actor_id, action, details)
    VALUES (
        NEW.id,
        NEW.requester_id,
        'created',
        jsonb_build_object('status', NEW.status)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for logging creation
CREATE TRIGGER on_request_created_log_activity
    AFTER INSERT ON public.requests
    FOR EACH ROW
    EXECUTE FUNCTION public.log_request_creation();

-- -----------------------------------------------------
-- Add quotation_url field for file uploads
-- -----------------------------------------------------
ALTER TABLE public.requests 
ADD COLUMN quotation_url TEXT;

-- Grant permissions
GRANT ALL ON public.request_comments TO authenticated;
GRANT ALL ON public.request_activity TO authenticated;
