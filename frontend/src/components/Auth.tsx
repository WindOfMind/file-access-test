"use client";

import { useState } from "react";

interface User {
    id: number;
    username: string;
    email: string;
}

export default function Auth({
    onLoginSuccess,
}: {
    onLoginSuccess?: (user: User) => void;
}) {
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({
        username: "",
        email: "",
        password: "",
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: "", text: "" });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: "", text: "" });

        const endpoint = isLogin ? "/login" : "/signup";
        const body = isLogin
            ? { email: formData.email, password: formData.password }
            : formData;

        try {
            const response = await fetch(`http://localhost:4000${endpoint}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
                credentials: "include",
            });

            const data = await response.json();

            if (response.ok) {
                setMessage({
                    type: "success",
                    text: isLogin
                        ? "Login successful!"
                        : "Signup successful! You can now login.",
                });
                if (!isLogin) {
                    setIsLogin(true);
                } else if (onLoginSuccess) {
                    onLoginSuccess(data.user);
                }
            } else {
                setMessage({
                    type: "error",
                    text: Array.isArray(data.error)
                        ? data.error[0].message
                        : typeof data.error === "string"
                          ? data.error
                          : "Something went wrong",
                });
            }
        } catch (error) {
            setMessage({
                type: "error",
                text: "Failed to connect to the server.",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md p-8 space-y-8 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-zinc-800/50 transition-all duration-500 ease-in-out transform hover:scale-[1.01]">
            <div className="text-center">
                <h2 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-linear-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400">
                    {isLogin ? "Welcome Back" : "Create Account"}
                </h2>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                    {isLogin
                        ? "Enter your credentials to access your account"
                        : "Join our community and start your journey"}
                </p>
            </div>

            <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                <div className="space-y-4 rounded-md">
                    {!isLogin && (
                        <div className="group">
                            <label
                                htmlFor="username"
                                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1 group-focus-within:text-purple-600 dark:group-focus-within:text-purple-400 transition-colors"
                            >
                                Username
                            </label>
                            <input
                                id="username"
                                name="username"
                                type="text"
                                required={!isLogin}
                                className="block w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
                                placeholder="johndoe"
                                value={formData.username}
                                onChange={handleChange}
                            />
                        </div>
                    )}
                    <div className="group">
                        <label
                            htmlFor="email"
                            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1 group-focus-within:text-purple-600 dark:group-focus-within:text-purple-400 transition-colors"
                        >
                            Email Address
                        </label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            required
                            className="block w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
                            placeholder="you@example.com"
                            value={formData.email}
                            onChange={handleChange}
                        />
                    </div>
                    <div className="group">
                        <label
                            htmlFor="password"
                            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1 group-focus-within:text-purple-600 dark:group-focus-within:text-purple-400 transition-colors"
                        >
                            Password
                        </label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            required
                            className="block w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
                            placeholder="••••••••"
                            value={formData.password}
                            onChange={handleChange}
                        />
                    </div>
                </div>

                {message.text && (
                    <div
                        className={`p-4 rounded-xl text-sm font-medium animate-in fade-in slide-in-from-top-2 ${
                            message.type === "success"
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                                : "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border border-rose-200 dark:border-rose-800"
                        }`}
                    >
                        {message.text}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="relative w-full overflow-hidden group py-3 px-4 rounded-xl font-bold text-white transition-all duration-300 disabled:opacity-70"
                >
                    <div className="absolute inset-0 bg-linear-to-r from-purple-600 via-pink-600 to-purple-600 bg-size-[200%_100%] animate-gradient-x group-hover:bg-size-[100%_100%] transition-all"></div>
                    <span className="relative flex items-center justify-center">
                        {loading ? (
                            <svg
                                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                                fill="none"
                                viewBox="0 0 24 24"
                            >
                                <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                ></circle>
                                <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                ></path>
                            </svg>
                        ) : isLogin ? (
                            "Sign In"
                        ) : (
                            "Sign Up"
                        )}
                    </span>
                </button>

                <div className="text-center">
                    <button
                        type="button"
                        onClick={() => setIsLogin(!isLogin)}
                        className="text-sm font-semibold text-zinc-600 hover:text-purple-600 dark:text-zinc-400 dark:hover:text-purple-400 transition-colors"
                    >
                        {isLogin
                            ? "Don't have an account? Create one"
                            : "Already have an account? Sign in"}
                    </button>
                </div>
            </form>
        </div>
    );
}
