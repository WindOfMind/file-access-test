"use client";

import { useEffect, useState } from "react";
import Auth from "@/components/Auth";

interface User {
    id: number;
    username: string;
    email: string;
}

interface FileData {
    id: number;
    name: string;
    size: number;
    type: string;
    uploadedAt: string;
}

export default function Home() {
    const [user, setUser] = useState<User | null>(null);
    const [files, setFiles] = useState<FileData[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    const fetchFiles = async () => {
        try {
            const res = await fetch("http://localhost:4000/files", {
                credentials: "include",
            });
            if (res.ok) {
                const data = await res.json();
                setFiles(data.files);
                return true;
            }
            return false;
        } catch (error) {
            console.error(error);
            return false;
        }
    };

    useEffect(() => {
        const checkAuth = async () => {
            const success = await fetchFiles();
            if (success) {
                // We don't have user details from /files, but we know we're logged in
                setUser({ id: 0, username: "User", email: "" });
            }
            setLoading(false);
        };
        checkAuth();
    }, []);

    const handleLoginSuccess = (userData: User) => {
        setUser(userData);
        fetchFiles();
    };

    const handleSignOut = async () => {
        try {
            await fetch("http://localhost:4000/logout", {
                method: "POST",
                credentials: "include",
            });
        } catch (error) {
            console.error("Logout failed", error);
        }
        setUser(null);
        setFiles([]);
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        const file = e.target.files[0];
        const formData = new FormData();
        formData.append("file", file);

        setUploading(true);
        try {
            const res = await fetch("http://localhost:4000/upload", {
                method: "POST",
                body: formData,
                credentials: "include",
            });

            if (res.ok) {
                await fetchFiles();
            } else {
                console.error("Upload failed");
            }
        } catch (error) {
            console.error("Upload error:", error);
        } finally {
            setUploading(false);
            e.target.value = ""; // Reset input
        }
    };

    const formatSize = (bytes: number) => {
        if (bytes === 0) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-zinc-50 dark:bg-zinc-950">
                <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
                <div className="absolute top-0 -right-4 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
                <div className="absolute -bottom-8 left-20 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>

                <main className="relative z-10 w-full flex flex-col items-center px-4">
                    <Auth onLoginSuccess={handleLoginSuccess} />
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 p-8 transition-colors duration-300">
            <div className="max-w-6xl mx-auto">
                <header className="flex justify-between items-center mb-12 animate-in fade-in slide-in-from-top-4 duration-500">
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-linear-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400">
                        My Files
                    </h1>
                    <button
                        onClick={handleSignOut}
                        className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                    >
                        Sign Out
                    </button>
                </header>

                <main className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
                    <div className="flex justify-end">
                        <label
                            className={`cursor-pointer inline-flex items-center px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-medium transition-all shadow-lg hover:shadow-purple-500/30 active:scale-95 ${
                                uploading ? "opacity-75 cursor-wait" : ""
                            }`}
                        >
                            <svg
                                className={`w-5 h-5 mr-2 ${
                                    uploading ? "animate-spin" : ""
                                }`}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                {uploading ? (
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                    />
                                ) : (
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                                    />
                                )}
                            </svg>
                            {uploading ? "Uploading..." : "Upload New File"}
                            <input
                                type="file"
                                className="hidden"
                                onChange={handleUpload}
                                disabled={uploading}
                            />
                        </label>
                    </div>

                    <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden backdrop-blur-sm bg-opacity-50">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-zinc-50 dark:bg-zinc-950/50 border-b border-zinc-200 dark:border-zinc-800">
                                    <tr>
                                        <th className="px-6 py-4 font-semibold text-sm text-zinc-500 dark:text-zinc-400">
                                            Name
                                        </th>
                                        <th className="px-6 py-4 font-semibold text-sm text-zinc-500 dark:text-zinc-400">
                                            Type
                                        </th>
                                        <th className="px-6 py-4 font-semibold text-sm text-zinc-500 dark:text-zinc-400">
                                            Size
                                        </th>
                                        <th className="px-6 py-4 font-semibold text-sm text-zinc-500 dark:text-zinc-400">
                                            Date
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                    {files.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={4}
                                                className="px-6 py-12 text-center text-zinc-500 dark:text-zinc-400"
                                            >
                                                No files uploaded yet
                                            </td>
                                        </tr>
                                    ) : (
                                        files.map((file) => (
                                            <tr
                                                key={file.id}
                                                className="group hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                                            >
                                                <td className="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100">
                                                    <div className="flex items-center">
                                                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg mr-3 text-purple-600 dark:text-purple-400">
                                                            <svg
                                                                className="w-5 h-5"
                                                                fill="none"
                                                                viewBox="0 0 24 24"
                                                                stroke="currentColor"
                                                            >
                                                                <path
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                    strokeWidth={
                                                                        2
                                                                    }
                                                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                                                />
                                                            </svg>
                                                        </div>
                                                        {file.name}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-zinc-500 dark:text-zinc-400">
                                                    {file.type}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-zinc-500 dark:text-zinc-400 font-mono">
                                                    {formatSize(file.size)}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-zinc-500 dark:text-zinc-400">
                                                    {new Date(
                                                        file.uploadedAt,
                                                    ).toLocaleDateString()}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
