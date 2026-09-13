import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { API_BASE_URL } from "../api";
import { useAuth } from "../contexts/AuthContext";
import { User as UserIcon } from "lucide-react";

export function Profile() {
    const { user, token, updateUser } = useAuth();
    const navigate = useNavigate();

    const [name, setName] = useState("");
    const [profileError, setProfileError] = useState("");
    const [profileSuccess, setProfileSuccess] = useState("");
    const [profileLoading, setProfileLoading] = useState(false);

    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [passwordError, setPasswordError] = useState("");
    const [passwordSuccess, setPasswordSuccess] = useState("");
    const [passwordLoading, setPasswordLoading] = useState(false);

    useEffect(() => {
        if (!user) {
            navigate("/login");
        } else {
            setName(user.name);
        }
    }, [user, navigate]);

    if (!user) {
        return null;
    }

    const handleProfileSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setProfileLoading(true);
        setProfileError("");
        setProfileSuccess("");

        try {
            const res = await fetch(`${API_BASE_URL}/auth/me`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ name }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to update profile");
            }

            updateUser(data.user);
            setProfileSuccess("Profile updated successfully");
        } catch (err: any) {
            setProfileError(err.message);
        } finally {
            setProfileLoading(false);
        }
    };

    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordError("");
        setPasswordSuccess("");

        if (newPassword !== confirmPassword) {
            setPasswordError("New passwords do not match");
            return;
        }

        setPasswordLoading(true);

        try {
            const res = await fetch(`${API_BASE_URL}/auth/change-password`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ currentPassword, newPassword }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to change password");
            }

            setPasswordSuccess("Password changed successfully");
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (err: any) {
            setPasswordError(err.message);
        } finally {
            setPasswordLoading(false);
        }
    };

    return (
        <div className="min-h-[calc(100vh-130px)] p-4 sm:p-6 lg:p-8">
            <div className="max-w-2xl mx-auto space-y-6">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center border border-slate-200">
                        <UserIcon className="w-8 h-8 text-slate-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">{user.name}</h1>
                        <p className="text-slate-500">{user.email}</p>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
                    <h2 className="text-lg font-semibold text-slate-900 mb-1">Profile Information</h2>
                    <p className="text-sm text-slate-500 mb-6">Update your account's name.</p>

                    {profileError && (
                        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-md text-sm text-center">
                            {profileError}
                        </div>
                    )}
                    {profileSuccess && (
                        <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-md text-sm text-center">
                            {profileSuccess}
                        </div>
                    )}

                    <form onSubmit={handleProfileSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-4 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition-colors"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                            <input
                                type="email"
                                disabled
                                value={user.email}
                                className="w-full px-4 py-2 border border-slate-200 bg-slate-50 text-slate-500 rounded-md outline-none cursor-not-allowed"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={profileLoading}
                            className="bg-slate-900 text-white py-2 px-4 rounded-md hover:bg-slate-800 transition-colors disabled:opacity-70"
                        >
                            {profileLoading ? "Saving..." : "Save Changes"}
                        </button>
                    </form>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
                    <h2 className="text-lg font-semibold text-slate-900 mb-1">Change Password</h2>
                    <p className="text-sm text-slate-500 mb-6">Update your password to keep your account secure.</p>

                    {passwordError && (
                        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-md text-sm text-center">
                            {passwordError}
                        </div>
                    )}
                    {passwordSuccess && (
                        <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-md text-sm text-center">
                            {passwordSuccess}
                        </div>
                    )}

                    <form onSubmit={handlePasswordSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Current Password</label>
                            <input
                                type="password"
                                required
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                className="w-full px-4 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition-colors"
                                placeholder="••••••••"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                            <input
                                type="password"
                                required
                                minLength={6}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full px-4 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition-colors"
                                placeholder="••••••••"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Confirm New Password</label>
                            <input
                                type="password"
                                required
                                minLength={6}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full px-4 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition-colors"
                                placeholder="••••••••"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={passwordLoading}
                            className="bg-slate-900 text-white py-2 px-4 rounded-md hover:bg-slate-800 transition-colors disabled:opacity-70"
                        >
                            {passwordLoading ? "Updating..." : "Update Password"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
