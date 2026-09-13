import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { API_BASE_URL } from "../api";
import { useAuth } from "../contexts/AuthContext";
import { Scale } from "lucide-react";

export function Signup() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { login, user } = useAuth();

    useEffect(() => {
        if (user) {
            navigate("/");
        }
    }, [user, navigate]);

    if (user) {
        return null;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await fetch(`${API_BASE_URL}/auth/signup`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Signup failed");
            }

            login(data.token, data.user);
            navigate("/");
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-[calc(100vh-130px)] items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-xl shadow-sm border border-slate-200 p-8">
                <div className="flex flex-col items-center mb-8">
                    <div className="w-12 h-12 bg-slate-900 rounded flex items-center justify-center mb-4">
                        <Scale className="w-7 h-7 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900">Create an Account</h2>
                    <p className="text-slate-500 mt-2">Join LegalAI to get started</p>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-md text-sm text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition-colors"
                            placeholder="John Doe"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition-colors"
                            placeholder="you@example.com"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition-colors"
                            placeholder="••••••••"
                            minLength={6}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-slate-900 text-white py-2 rounded-md hover:bg-slate-800 transition-colors disabled:opacity-70"
                    >
                        {loading ? "Creating Account..." : "Sign Up"}
                    </button>
                </form>

                <p className="text-center text-sm text-slate-600 mt-6">
                    Already have an account?{" "}
                    <Link to="/login" className="text-blue-600 font-semibold hover:underline">
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    );
}
