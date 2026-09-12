-- Accelerate the two hot gallery access patterns:
--   1. newest photos for a store
--   2. newest photos for a store filtered by status
CREATE INDEX IF NOT EXISTS idx_order_items_store_created_at
    ON public.order_items (store_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_order_items_store_status_created_at
    ON public.order_items (store_id, status, created_at DESC);
