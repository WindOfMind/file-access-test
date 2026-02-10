import type { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import type { AuthRequest, AuthPayload } from "../types.ts";

export const authenticate = (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
) => {
    const token = req.cookies?.token;

    if (!token) {
        res.status(401).json({ error: "Unauthorized: No token provided" });
        return;
    }

    try {
        const JWT_SECRET = process.env.JWT_SECRET || "default_secret_key";
        const decoded = jwt.verify(token, JWT_SECRET) as AuthPayload;
        req.user = decoded;
        next();
    } catch (error) {
        console.error("Token verification failed:", error);
        res.status(401).json({ error: "Unauthorized: Invalid token" });
    }
};
