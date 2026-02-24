"use client";

import { useState, useEffect, useRef } from "react";

interface UserInfo {
  id: string;
  employeeId: string | null;
  email: string;
  name: string;
  phone: string | null;
  department: string | null;
  position: string | null;
  role: string | null;
  signatureUrl: string | null;
  annualLeave: number;
  additionalLeave: number;
}

export default function MyPage() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  // 비밀번호 변경
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // 서명 업로드
  const [signatureLoading, setSignatureLoading] = useState(false);
  const [signatureMessage, setSignatureMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      }
    } catch (err) {
      console.error("사용자 정보 조회 실패:", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);

    if (newPassword !== confirmPassword) {
      setPasswordMessage({
        type: "error",
        text: "새 비밀번호가 일치하지 않습니다",
      });
      return;
    }

    if (newPassword.length < 6) {
      setPasswordMessage({
        type: "error",
        text: "비밀번호는 6자 이상이어야 합니다",
      });
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await fetch(`/api/users/${user?.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      });

      if (res.ok) {
        setPasswordMessage({
          type: "success",
          text: "비밀번호가 변경되었습니다",
        });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        const data = await res.json();
        setPasswordMessage({
          type: "error",
          text: data.error || "비밀번호 변경에 실패했습니다",
        });
      }
    } catch {
      setPasswordMessage({
        type: "error",
        text: "비밀번호 변경에 실패했습니다",
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleSignatureUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setSignatureMessage({
        type: "error",
        text: "이미지 파일만 업로드 가능합니다",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setSignatureMessage({
        type: "error",
        text: "파일 크기는 5MB 이하여야 합니다",
      });
      return;
    }

    setSignatureLoading(true);
    setSignatureMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/users/${user?.id}/signature`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        setSignatureMessage({ type: "success", text: "서명이 등록되었습니다" });
        fetchUser();
      } else {
        const data = await res.json();
        setSignatureMessage({
          type: "error",
          text: data.error || "서명 업로드에 실패했습니다",
        });
      }
    } catch {
      setSignatureMessage({
        type: "error",
        text: "서명 업로드에 실패했습니다",
      });
    } finally {
      setSignatureLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSignatureDelete = async () => {
    if (!confirm("서명을 삭제하시겠습니까?")) return;

    setSignatureLoading(true);
    setSignatureMessage(null);

    try {
      const res = await fetch(`/api/users/${user?.id}/signature`, {
        method: "DELETE",
      });

      if (res.ok) {
        setSignatureMessage({ type: "success", text: "서명이 삭제되었습니다" });
        fetchUser();
      } else {
        const data = await res.json();
        setSignatureMessage({
          type: "error",
          text: data.error || "서명 삭제에 실패했습니다",
        });
      }
    } catch {
      setSignatureMessage({ type: "error", text: "서명 삭제에 실패했습니다" });
    } finally {
      setSignatureLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">로그인이 필요합니다</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">마이페이지</h1>
        <p className="text-gray-500 mt-1">내 정보 관리</p>
      </div>

      {/* 기본 정보 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">기본 정보</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-500">이름</label>
            <div className="text-gray-900 font-medium">{user.name}</div>
          </div>
          <div>
            <label className="block text-sm text-gray-500">이메일</label>
            <div className="text-gray-900">{user.email}</div>
          </div>
          <div>
            <label className="block text-sm text-gray-500">사번</label>
            <div className="text-gray-900">{user.employeeId || "-"}</div>
          </div>
          <div>
            <label className="block text-sm text-gray-500">연락처</label>
            <div className="text-gray-900">{user.phone || "-"}</div>
          </div>
          <div>
            <label className="block text-sm text-gray-500">부서</label>
            <div className="text-gray-900">{user.department || "-"}</div>
          </div>
          <div>
            <label className="block text-sm text-gray-500">직급</label>
            <div className="text-gray-900">{user.position || "-"}</div>
          </div>
          <div>
            <label className="block text-sm text-gray-500">연차</label>
            <div className="text-gray-900">{user.annualLeave}일</div>
          </div>
          <div>
            <label className="block text-sm text-gray-500">추가휴가</label>
            <div className="text-gray-900">{user.additionalLeave}일</div>
          </div>
        </div>
      </div>

      {/* 서명 관리 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">서명 관리</h2>
        <p className="text-sm text-gray-500 mb-4">
          품의서 결재 시 사용할 서명 이미지를 등록하세요.
        </p>

        {signatureMessage && (
          <div
            className={`mb-4 p-3 rounded-lg text-sm ${
              signatureMessage.type === "success"
                ? "bg-green-50 text-green-700"
                : "bg-red-50 text-red-700"
            }`}
          >
            {signatureMessage.text}
          </div>
        )}

        <div className="flex items-start gap-6">
          {/* 현재 서명 */}
          <div className="flex-shrink-0">
            <div className="w-48 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
              {user.signatureUrl ? (
                <img
                  src={user.signatureUrl}
                  alt="서명"
                  className="w-full h-full object-contain"
                />
              ) : (
                <span className="text-gray-400 text-sm">서명 없음</span>
              )}
            </div>
          </div>

          {/* 액션 버튼 */}
          <div className="flex flex-col gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleSignatureUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={signatureLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {signatureLoading ? "업로드 중..." : "서명 업로드"}
            </button>
            {user.signatureUrl && (
              <button
                onClick={handleSignatureDelete}
                disabled={signatureLoading}
                className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm hover:bg-red-100 disabled:opacity-50"
              >
                서명 삭제
              </button>
            )}
            <p className="text-xs text-gray-400 mt-1">
              PNG, JPG 형식 / 최대 5MB
            </p>
          </div>
        </div>
      </div>

      {/* 비밀번호 변경 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          비밀번호 변경
        </h2>

        {passwordMessage && (
          <div
            className={`mb-4 p-3 rounded-lg text-sm ${
              passwordMessage.type === "success"
                ? "bg-green-50 text-green-700"
                : "bg-red-50 text-red-700"
            }`}
          >
            {passwordMessage.text}
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              현재 비밀번호
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="현재 비밀번호 입력"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              새 비밀번호
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="새 비밀번호 입력 (6자 이상)"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              새 비밀번호 확인
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="새 비밀번호 다시 입력"
            />
          </div>
          <button
            type="submit"
            disabled={passwordLoading || !newPassword || !confirmPassword}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800 disabled:opacity-50"
          >
            {passwordLoading ? "변경 중..." : "비밀번호 변경"}
          </button>
        </form>
      </div>
    </div>
  );
}
