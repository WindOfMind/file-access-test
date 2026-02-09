// Define the User interface
export interface User {
    id: number;
    username: string;
    email: string;
    password: string; // hashed password
    salt: string;
}

// Define the File interface
export interface File {
    id: number;
    name: string;
    size: number;
    type: string;
    uploadedAt: string;
    userId: number; // owner of the file
}

// Define the structure of the database
export interface Data {
    users: User[];
    files: File[];
}

export interface AuthPayload {
    id: number;
    email: string;
    username: string;
}

import type { Request } from "express";

export interface AuthRequest extends Request {
    user?: AuthPayload;
}
