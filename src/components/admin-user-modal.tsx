"use client";

import { useState, useEffect, useMemo } from "react";
import {
  X,
  ShieldCheck,
  User,
  Search,
  Loader2,
  Trash2,
  AlertCircle,
  Users,
  CheckCircle2,
} from "lucide-react";
import type { Profile, UserRole } from "@/lib/types";
import {
  getAllUsers,
  updateUserRole,
  deleteUserAccount,
} from "@/app/actions/admin-actions";
import { cleanupExpiredCompletedOrders } from "@/app/actions/cleanup-actions";

interface Props {
  currentUserId?: string;
  onClose: () => void;
  onUserListChanged?: () => void;
}

export function AdminUserModal({
  currentUserId,
  onClose,
  onUserListChanged,
}: Props) {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Profile | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  async function handleManualCleanup() {
    setCleaning(true);
    setErrorMsg("");
    setSuccessMsg("");

    const result = await cleanupExpiredCompletedOrders();

    if (result.error) {
      setErrorMsg(`Lỗi dọn dẹp: ${result.error}`);
    } else if (result.deletedCount > 0) {
      setSuccessMsg(`Đã tự động xóa ${result.deletedCount} ảnh đơn hàng cũ (>14 ngày) và giải phóng bộ nhớ!`);
    } else {
      setSuccessMsg("Tất cả dữ liệu đã sạch. Không có ảnh đơn hàng nào (Đã giao/Hết hàng) cũ hơn 14 ngày.");
    }

    setCleaning(false);
  }

  // Fetch users on mount
  useEffect(() => {
    async function loadUsers() {
      setLoading(true);
      const { data, error } = await getAllUsers();
      if (error) {
        setErrorMsg(error);
      } else if (data) {
        setUsers(data);
      }
      setLoading(false);
    }
    loadUsers();
  }, []);

  // Filter users by search query
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase().trim();
    return users.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        (u.full_name && u.full_name.toLowerCase().includes(q))
    );
  }, [users, searchQuery]);

  async function handleRoleToggle(user: Profile) {
    const newRole: UserRole = user.role === "admin" ? "staff" : "admin";
    setUpdatingId(user.id);
    setErrorMsg("");
    setSuccessMsg("");

    const result = await updateUserRole(user.id, newRole);

    if (result.error) {
      setErrorMsg(result.error);
    } else {
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, role: newRole } : u))
      );
      setSuccessMsg(`Đã cập nhật quyền của ${user.email} thành ${newRole === "admin" ? "Admin 👑" : "Nhân viên 👤"}`);
      if (onUserListChanged) onUserListChanged();
    }

    setUpdatingId(null);
  }

  async function handleDeleteUser() {
    if (!deleteTarget) return;
    setDeleting(true);
    setErrorMsg("");
    setSuccessMsg("");

    const result = await deleteUserAccount(deleteTarget.id);

    if (result.error) {
      setErrorMsg(result.error);
    } else {
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
      setSuccessMsg(`Đã xóa người dùng ${deleteTarget.email}`);
      setDeleteTarget(null);
      if (onUserListChanged) onUserListChanged();
    }

    setDeleting(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Modal Window */}
      <div className="relative w-full max-w-lg max-h-[85dvh] rounded-3xl bg-surface-elevated border border-border-subtle flex flex-col shadow-2xl animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
          <div>
            <h2 className="text-base font-extrabold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-400" />
              Quản lý tài khoản người dùng
            </h2>
            <p className="text-[11px] text-white/40 mt-0.5">
              Phân quyền Admin / Nhân viên & Xóa người dùng trong hệ thống
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/5 hover:bg-white/15 text-white/60 hover:text-white transition-all active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div className="mx-6 mt-3 px-4 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs font-semibold text-rose-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mx-6 mt-3 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-400 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Search Input */}
        <div className="px-6 pt-4 pb-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo email hoặc họ tên..."
              className="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-surface border border-border-subtle text-xs text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            onClick={handleManualCleanup}
            disabled={cleaning}
            className="w-full mt-2.5 py-2.5 px-3 rounded-2xl bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 text-xs font-semibold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 shadow-sm"
            title="Quét và xóa ảnh đã giao hoặc hết hàng quá 14 ngày để giải phóng bộ nhớ"
          >
            {cleaning ? (
              <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
            ) : (
              <Trash2 className="w-4 h-4 text-indigo-400" />
            )}
            <span>Quét & Dọn dẹp ảnh cũ (&gt;14 ngày)</span>
          </button>
        </div>

        {/* Users List */}
        <div className="flex-1 overflow-y-auto px-6 py-2 space-y-2.5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Loader2 className="w-7 h-7 text-indigo-400 animate-spin mb-2" />
              <p className="text-xs text-white/40">Đang tải danh sách người dùng...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <User className="w-8 h-8 text-white/20 mb-2" />
              <p className="text-xs text-white/40">Không tìm thấy người dùng nào</p>
            </div>
          ) : (
            filteredUsers.map((user) => {
              const isSelf = user.id === currentUserId;
              const isAdminRole = user.role === "admin";
              const isUpdating = updatingId === user.id;

              return (
                <div
                  key={user.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-surface/70 border border-border-subtle hover:border-white/20 transition-all"
                >
                  {/* User Profile Info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 flex items-center justify-center font-bold text-white text-sm flex-shrink-0 shadow-md border border-white/10">
                      {user.full_name
                        ? user.full_name.substring(0, 1).toUpperCase()
                        : user.email.substring(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-bold text-white truncate">
                          {user.full_name || "Thành viên"}
                        </p>
                        {isSelf && (
                          <span className="text-[9px] font-bold text-indigo-300 bg-indigo-500/20 px-1.5 py-0.2 rounded border border-indigo-500/30">
                            Bạn
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-medium text-white/50 truncate">
                        {user.email}
                      </p>
                    </div>
                  </div>

                  {/* Actions & Role Toggle */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Role Toggle Button */}
                    <button
                      onClick={() => handleRoleToggle(user)}
                      disabled={isUpdating || isSelf}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                        isAdminRole
                          ? "bg-amber-400/15 text-amber-300 border-amber-400/30 hover:bg-amber-400/25 shadow-amber-400/10 shadow-sm"
                          : "bg-indigo-500/15 text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/25"
                      }`}
                      title={isSelf ? "Bạn không thể hạ quyền của chính mình" : "Nhấn để đổi quyền"}
                    >
                      {isUpdating ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : isAdminRole ? (
                        <>
                          <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                          <span>Admin 👑</span>
                        </>
                      ) : (
                        <>
                          <User className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Nhân viên 👤</span>
                        </>
                      )}
                    </button>

                    {/* Delete User Button */}
                    {!isSelf && (
                      <button
                        onClick={() => setDeleteTarget(user)}
                        className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 border border-rose-500/20 transition-all active:scale-95"
                        title="Xóa người dùng"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setDeleteTarget(null)}
          />
          <div className="relative w-full max-w-xs rounded-2xl bg-surface-elevated border border-border-subtle p-5 text-center shadow-2xl animate-fade-in">
            <p className="text-base font-extrabold text-white mb-1.5">
              Xóa người dùng?
            </p>
            <p className="text-xs text-white/60 mb-1 font-semibold truncate">
              {deleteTarget.email}
            </p>
            <p className="text-[11px] text-white/40 mb-5">
              Tài khoản này sẽ bị xóa quyền truy cập khỏi hệ thống.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 rounded-xl border border-border-subtle py-2.5 text-xs font-semibold text-white/70 hover:text-white transition-all active:scale-95"
              >
                Hủy
              </button>
              <button
                onClick={handleDeleteUser}
                disabled={deleting}
                className="flex-1 rounded-xl bg-rose-600 py-2.5 text-xs font-bold text-white hover:bg-rose-500 disabled:opacity-50 flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-rose-600/30"
              >
                {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                Xóa người dùng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
