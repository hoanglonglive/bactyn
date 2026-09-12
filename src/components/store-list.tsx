"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Plus,
  LogOut,
  Package,
  ImageIcon,
  ShieldCheck,
} from "lucide-react";
import type { StoreWithCounts, Profile } from "@/lib/types";
import { CreateStoreDialog } from "./create-store-dialog";
import { DeleteStoreDialog } from "./delete-store-dialog";
import { signOut } from "@/app/actions/auth-actions";

interface StoreListProps {
  stores: StoreWithCounts[];
  profile: Profile | null;
}

export function StoreList({ stores, profile }: StoreListProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<StoreWithCounts | null>(null);
  const isAdmin = profile?.role === "admin";

  return (
    <div className="min-h-dvh bg-surface">
      {/* Header */}
      <header className="sticky top-0 z-30 glass border-b border-border-subtle">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white leading-tight">
                Bactyn Orders
              </h1>
              <p className="text-[10px] text-white/40 flex items-center gap-1">
                {isAdmin && (
                  <ShieldCheck className="w-3 h-3 text-amber-400" />
                )}
                {profile?.full_name || profile?.email}
              </p>
            </div>
          </div>
          <button
            onClick={() => signOut()}
            className="p-2 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/5 transition-all"
            title="Đăng xuất"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="px-4 py-4 pb-24">
        {stores.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-surface-elevated flex items-center justify-center mb-4">
              <ImageIcon className="w-8 h-8 text-white/20" />
            </div>
            <p className="text-white/40 text-sm">Chưa có gian hàng nào</p>
            <p className="text-white/25 text-xs mt-1">
              Nhấn nút + để tạo gian hàng mới
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {stores.map((store, i) => (
              <StoreCard
                key={store.id}
                store={store}
                index={i}
                isAdmin={isAdmin}
                onDelete={() => setDeleteTarget(store)}
              />
            ))}
          </div>
        )}
      </main>

      {/* FAB - Create Store */}
      <button
        onClick={() => setShowCreate(true)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30 flex items-center justify-center hover:shadow-indigo-500/50 active:scale-95 transition-all"
      >
        <Plus className="w-6 h-6 text-white" />
      </button>

      {/* Dialogs */}
      {showCreate && (
        <CreateStoreDialog onClose={() => setShowCreate(false)} />
      )}
      {deleteTarget && (
        <DeleteStoreDialog
          store={deleteTarget}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

function StoreCard({
  store,
  index,
  isAdmin,
  onDelete,
}: {
  store: StoreWithCounts;
  index: number;
  isAdmin: boolean;
  onDelete: () => void;
}) {
  return (
    <div
      className="animate-fade-in relative group"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <Link
        href={`/stores/${store.id}`}
        className="block rounded-2xl overflow-hidden bg-surface-elevated border border-border-subtle photo-card"
      >
        {/* Cover Image */}
        <div className="relative aspect-[4/3] bg-surface-overlay">
          {store.cover_url ? (
            <img
              src={store.cover_url}
              alt={store.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="w-10 h-10 text-white/10" />
            </div>
          )}
          {/* Badge */}
          <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm text-[10px] font-semibold text-white flex items-center gap-1">
            <ImageIcon className="w-3 h-3" />
            {store.total_items}
          </div>
        </div>

        {/* Info */}
        <div className="p-3">
          <h3 className="text-sm font-semibold text-white truncate">
            {store.name}
          </h3>
          {store.total_items > 0 && (
            <div className="flex gap-1.5 mt-2">
              {store.purchased_count > 0 && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                  🟢 {store.purchased_count}
                </span>
              )}
              {store.pending_count > 0 && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">
                  🟡 {store.pending_count}
                </span>
              )}
              {store.delivered_count > 0 && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-400">
                  🔵 {store.delivered_count}
                </span>
              )}
              {store.out_of_stock_count > 0 && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400">
                  🔴 {store.out_of_stock_count}
                </span>
              )}
            </div>
          )}
        </div>
      </Link>

      {/* Admin delete button */}
      {isAdmin && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete();
          }}
          className="absolute top-2 left-2 w-7 h-7 rounded-full bg-red-500/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-bold"
          title="Xóa gian hàng"
        >
          ✕
        </button>
      )}
    </div>
  );
}
