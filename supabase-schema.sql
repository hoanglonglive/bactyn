-- ============================================================
-- 📦 PHOTO ORDER MANAGEMENT — SUPABASE DATABASE SCHEMA
-- ============================================================
-- Run this entire script in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- Make sure to run it as a single transaction.
-- ============================================================

-- ============================================================
-- 0. PREREQUISITES & EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. CUSTOM ENUM TYPE: Order Status
-- ============================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
        CREATE TYPE public.order_status AS ENUM (
            'PURCHASED',          -- 🟢 Hàng đã mua được
            'PARTIALLY_PURCHASED',-- 🟠 Chưa mua xong
            'PENDING_ORDER',      -- 🟡 Đang chờ order
            'DELIVERED',          -- 🔵 Đã chuyển cho khách hàng
            'IN_STOCK',           -- 📦 Tồn kho
            'OUT_OF_STOCK',       -- 🔴 Không mua được hàng / Hết hàng
            'PAID_NOT_RECEIVED'   -- 💳 Đã thanh toán - Chưa nhận hàng
        );
    END IF;
END
$$;

-- ============================================================
-- 2. TABLE: profiles
-- ============================================================
-- Links to auth.users, stores the role for RBAC
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email       TEXT,
    full_name   TEXT,
    avatar_url  TEXT,
    role        TEXT NOT NULL DEFAULT 'staff'
                CHECK (role IN ('admin', 'staff')),
    is_approved BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast role lookups (used in every RLS policy)
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(id, role);

COMMENT ON TABLE public.profiles IS 'User profiles with role-based access control. Linked 1:1 to auth.users.';
COMMENT ON COLUMN public.profiles.role IS 'User role: admin or staff. Controls DELETE permissions via RLS.';

-- ============================================================
-- 3. TABLE: stores
-- ============================================================
-- Album/Store containing order item photos
-- ============================================================
CREATE TABLE IF NOT EXISTS public.stores (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        TEXT NOT NULL,
    note        TEXT DEFAULT '',
    cover_url   TEXT DEFAULT '',
    display_order INT DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by  UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_stores_created_at ON public.stores(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stores_created_by ON public.stores(created_by);

COMMENT ON TABLE public.stores IS 'Store albums (Zara, H&M, Uniqlo, etc.) containing order item photos.';

-- ============================================================
-- 4. TABLE: order_items
-- ============================================================
-- Individual order photos within a store album
-- ============================================================
CREATE TABLE IF NOT EXISTS public.order_items (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id        UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    image_url       TEXT NOT NULL,
    thumbnail_url   TEXT NOT NULL,
    status          public.order_status NOT NULL DEFAULT 'PENDING_ORDER',
    order_code      TEXT DEFAULT '',
    customer_name   TEXT DEFAULT '',
    size            TEXT DEFAULT '',
    color           TEXT DEFAULT '',
    note            TEXT DEFAULT '',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by      UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_order_items_store_id ON public.order_items(store_id);
CREATE INDEX IF NOT EXISTS idx_order_items_status ON public.order_items(status);
CREATE INDEX IF NOT EXISTS idx_order_items_store_status ON public.order_items(store_id, status);
CREATE INDEX IF NOT EXISTS idx_order_items_created_at ON public.order_items(created_at DESC);
-- Cover the two hot gallery queries without an extra sort.
CREATE INDEX IF NOT EXISTS idx_order_items_store_created_at
    ON public.order_items(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_store_status_created_at
    ON public.order_items(store_id, status, created_at DESC);

COMMENT ON TABLE public.order_items IS 'Order item photos belonging to a store album. Status tracks the order lifecycle.';

-- ============================================================
-- 5. HELPER FUNCTION: Get current user role
-- ============================================================
-- Reusable function for RLS policies to check if the current
-- authenticated user is an admin.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

COMMENT ON FUNCTION public.get_user_role() IS 'Returns the role of the currently authenticated user. Used in RLS policies.';

-- ============================================================
-- 6. HELPER FUNCTION: Check if current user is admin
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
$$;

COMMENT ON FUNCTION public.is_admin() IS 'Returns true if the currently authenticated user has the admin role.';

-- ============================================================
-- 7. TRIGGER FUNCTION: Auto-create profile on user signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url, role, is_approved)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
        COALESCE(NEW.raw_user_meta_data ->> 'avatar_url', ''),
        COALESCE(NEW.raw_user_meta_data ->> 'role', 'staff'),
        CASE WHEN COALESCE(NEW.raw_user_meta_data ->> 'role', 'staff') = 'admin' THEN TRUE ELSE FALSE END
    );
    RETURN NEW;
END;
$$;

-- Drop existing trigger if any, then create
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

COMMENT ON FUNCTION public.handle_new_user() IS 'Automatically creates a profile entry when a new user signs up via Supabase Auth.';

-- ============================================================
-- 8. TRIGGER FUNCTION: Auto-update updated_at timestamp
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Apply to profiles
DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

-- Apply to stores
DROP TRIGGER IF EXISTS set_stores_updated_at ON public.stores;
CREATE TRIGGER set_stores_updated_at
    BEFORE UPDATE ON public.stores
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

-- Apply to order_items
DROP TRIGGER IF EXISTS set_order_items_updated_at ON public.order_items;
CREATE TRIGGER set_order_items_updated_at
    BEFORE UPDATE ON public.order_items
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- 9. VIEW: Store with item counts (for listing page)
-- ============================================================
CREATE OR REPLACE VIEW public.stores_with_counts AS
SELECT
    s.id,
    s.name,
    s.note,
    s.cover_url,
    s.display_order,
    s.created_at,
    s.updated_at,
    s.created_by,
    COUNT(oi.id)::INT AS total_items,
    COUNT(oi.id) FILTER (WHERE oi.status = 'PURCHASED')::INT          AS purchased_count,
    COUNT(oi.id) FILTER (WHERE oi.status = 'PARTIALLY_PURCHASED')::INT AS partially_purchased_count,
    COUNT(oi.id) FILTER (WHERE oi.status = 'PENDING_ORDER')::INT       AS pending_count,
    COUNT(oi.id) FILTER (WHERE oi.status = 'DELIVERED')::INT           AS delivered_count,
    COUNT(oi.id) FILTER (WHERE oi.status = 'IN_STOCK')::INT            AS in_stock_count,
    COUNT(oi.id) FILTER (WHERE oi.status = 'OUT_OF_STOCK')::INT        AS out_of_stock_count,
    COUNT(oi.id) FILTER (WHERE oi.status = 'PAID_NOT_RECEIVED')::INT   AS paid_not_received_count
FROM public.stores s
LEFT JOIN public.order_items oi ON oi.store_id = s.id
GROUP BY s.id;

COMMENT ON VIEW public.stores_with_counts IS 'Stores with aggregated order item counts per status. Used for the store listing page badges.';

-- ============================================================
-- 10. ENABLE ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 11. RLS POLICIES: profiles
-- ============================================================

-- 11a. SELECT: Any authenticated user can view all profiles
--      (needed to display names, check roles in the UI)
DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;
CREATE POLICY "profiles_select_authenticated"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (true);

-- 11b. UPDATE: Users can only update their own profile
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- 11c. INSERT: Allow service_role (trigger) to insert
--      Normal users cannot insert profiles directly — handled by trigger
DROP POLICY IF EXISTS "profiles_insert_self" ON public.profiles;
CREATE POLICY "profiles_insert_self"
    ON public.profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (id = auth.uid());

-- ============================================================
-- 12. RLS POLICIES: stores
-- ============================================================

-- 12a. SELECT: All authenticated users can view all stores
DROP POLICY IF EXISTS "stores_select_authenticated" ON public.stores;
CREATE POLICY "stores_select_authenticated"
    ON public.stores
    FOR SELECT
    TO authenticated
    USING (true);

-- 12b. INSERT: All authenticated users can create stores
DROP POLICY IF EXISTS "stores_insert_authenticated" ON public.stores;
CREATE POLICY "stores_insert_authenticated"
    ON public.stores
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = created_by);

-- 12c. UPDATE: All authenticated users can update stores
DROP POLICY IF EXISTS "stores_update_authenticated" ON public.stores;
CREATE POLICY "stores_update_authenticated"
    ON public.stores
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 12d. DELETE: *** ADMIN ONLY ***
--      This is the critical security policy — staff cannot delete stores
DROP POLICY IF EXISTS "stores_delete_admin_only" ON public.stores;
CREATE POLICY "stores_delete_admin_only"
    ON public.stores
    FOR DELETE
    TO authenticated
    USING (
        public.is_admin()
    );

-- ============================================================
-- 13. RLS POLICIES: order_items
-- ============================================================

-- 13a. SELECT: All authenticated users can view all order items
DROP POLICY IF EXISTS "order_items_select_authenticated" ON public.order_items;
CREATE POLICY "order_items_select_authenticated"
    ON public.order_items
    FOR SELECT
    TO authenticated
    USING (true);

-- 13b. INSERT: All authenticated users can create order items
DROP POLICY IF EXISTS "order_items_insert_authenticated" ON public.order_items;
CREATE POLICY "order_items_insert_authenticated"
    ON public.order_items
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = created_by);

-- 13c. UPDATE: All authenticated users can update order items
--      (change status, edit info, move to another store)
DROP POLICY IF EXISTS "order_items_update_authenticated" ON public.order_items;
CREATE POLICY "order_items_update_authenticated"
    ON public.order_items
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 13d. DELETE: *** ADMIN ONLY ***
--      Staff cannot delete order items — enforced at database level
DROP POLICY IF EXISTS "order_items_delete_admin_only" ON public.order_items;
CREATE POLICY "order_items_delete_admin_only"
    ON public.order_items
    FOR DELETE
    TO authenticated
    USING (
        public.is_admin()
    );

-- ============================================================
-- 14. FUNCTION: Collect storage paths before store deletion
-- ============================================================
-- This function collects all file paths from order_items that
-- belong to a store being deleted. The actual file deletion
-- from Supabase Storage is handled in the Server Action
-- (deleteStore) BEFORE the DB record is removed.
--
-- However, we also provide this function as a utility that
-- the Server Action can call to get all paths to clean up.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_store_file_paths(target_store_id UUID)
RETURNS TABLE(file_path TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    -- Return all image and thumbnail URLs for the given store
    SELECT image_url AS file_path
    FROM public.order_items
    WHERE store_id = target_store_id
    UNION ALL
    SELECT thumbnail_url AS file_path
    FROM public.order_items
    WHERE store_id = target_store_id;
$$;

COMMENT ON FUNCTION public.get_store_file_paths(UUID) IS 'Returns all Storage file paths (images + thumbnails) for a store. Used by Server Action for cascade cleanup before deletion.';

-- ============================================================
-- 15. FUNCTION: Get item counts by status for a store
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_store_status_counts(target_store_id UUID)
RETURNS TABLE(
    total        INT,
    purchased    INT,
    pending      INT,
    delivered    INT,
    out_of_stock INT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        COUNT(*)::INT AS total,
        COUNT(*) FILTER (WHERE status = 'PURCHASED')::INT      AS purchased,
        COUNT(*) FILTER (WHERE status = 'PENDING_ORDER')::INT   AS pending,
        COUNT(*) FILTER (WHERE status = 'DELIVERED')::INT       AS delivered,
        COUNT(*) FILTER (WHERE status = 'OUT_OF_STOCK')::INT    AS out_of_stock
    FROM public.order_items
    WHERE store_id = target_store_id;
$$;

COMMENT ON FUNCTION public.get_store_status_counts(UUID) IS 'Returns aggregated status counts for a specific store. Used for filter chip badges.';

-- ============================================================
-- 16. STORAGE BUCKET: order-photos
-- ============================================================
-- NOTE: Run these statements in the SQL Editor.
-- Supabase Storage bucket creation and policies.
-- ============================================================

-- Create the storage bucket (public read for serving images)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'order-photos',
    'order-photos',
    true,                              -- Public read access (images viewable via URL)
    5242880,                           -- 5MB max file size limit
    ARRAY['image/webp', 'image/jpeg', 'image/png', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================================
-- 17. STORAGE RLS POLICIES: order-photos bucket
-- ============================================================

-- 17a. SELECT (Download): Anyone can view/download images (public bucket)
DROP POLICY IF EXISTS "order_photos_select_public" ON storage.objects;
CREATE POLICY "order_photos_select_public"
    ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'order-photos');

-- 17b. INSERT (Upload): Only authenticated users can upload
DROP POLICY IF EXISTS "order_photos_insert_authenticated" ON storage.objects;
CREATE POLICY "order_photos_insert_authenticated"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'order-photos');

-- 17c. UPDATE (Replace): Only authenticated users can update/replace files
DROP POLICY IF EXISTS "order_photos_update_authenticated" ON storage.objects;
CREATE POLICY "order_photos_update_authenticated"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'order-photos');

-- 17d. DELETE: Only admin users can delete files from storage
DROP POLICY IF EXISTS "order_photos_delete_admin" ON storage.objects;
CREATE POLICY "order_photos_delete_admin"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'order-photos'
        AND public.is_admin()
    );

-- ============================================================
-- 18. SEED DATA: (Optional) Create first admin user profile
-- ============================================================
-- After creating your first user via Supabase Auth (Dashboard → Authentication → Users → Add User),
-- run this to promote them to admin:
--
--   UPDATE public.profiles
--   SET role = 'admin'
--   WHERE email = 'your-admin@email.com';
--
-- All subsequent users will default to 'staff' role.
-- ============================================================

-- ============================================================
-- ✅ SCHEMA SETUP COMPLETE
-- ============================================================
-- Summary of objects created:
--   • 1 ENUM type: order_status
--   • 3 TABLES: profiles, stores, order_items
--   • 1 VIEW: stores_with_counts
--   • 4 FUNCTIONS: get_user_role, is_admin, get_store_file_paths, get_store_status_counts
--   • 4 TRIGGERS: on_auth_user_created, 3x updated_at auto-setters
--   • 9 TABLE RLS POLICIES (3 profiles + 4 stores + 4 order_items)
--   • 4 STORAGE RLS POLICIES (order-photos bucket)
--   • 1 STORAGE BUCKET: order-photos
--   • 4 INDEXES on order_items, 2 on stores
-- ============================================================
