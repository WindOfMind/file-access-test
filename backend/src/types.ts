// Define the User interface
export interface User {
    id: number;
    username: string;
    email: string;
    password: string; // hashed password
    salt: string;
}

// Define the structure of the database
export interface Data {
    users: User[];
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
