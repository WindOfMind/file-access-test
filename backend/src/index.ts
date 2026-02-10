import express, { type Request, type Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { z, ZodError } from "zod";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { db } from "./db.ts";
import type { User, AuthRequest, File } from "./types.ts";
import { authenticate } from "./middleware/auth.ts";

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || "default_secret_key";

app.use(
    cors({
        origin: "http://localhost:3000", // Adjust this to your frontend URL
        credentials: true,
    }),
);
app.use(express.json());
app.use(cookieParser());

// Zod schema for signup
const signupSchema = z.object({
    username: z.string().min(3),
    email: z.email(),
    password: z.string().min(6),
});

// Zod schema for login
const loginSchema = z.object({
    email: z.email(),
    password: z.string(),
});

app.post("/signup", async (req: Request, res: Response) => {
    try {
        const validatedData = signupSchema.parse(req.body);
        const { username, email, password } = validatedData;

        await db.read();
        const existingUser = db.data.users.find((u: User) => u.email === email);

        if (existingUser) {
            res.status(409).json({ error: "User already exists" });
            return;
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const newUser: User = {
            id: Date.now(),
            username,
            email,
            password: hashedPassword,
            salt,
        };

        db.data.users.push(newUser);
        await db.write();

        res.status(201).json({
            message: "User created successfully",
            user: { id: newUser.id, username, email },
        });
    } catch (error) {
        if (error instanceof ZodError) {
            res.status(400).json({ error: error.issues });
        } else {
            console.error(error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    }
});

app.post("/login", async (req: Request, res: Response) => {
    try {
        const validatedData = loginSchema.parse(req.body);
        const { email, password } = validatedData;

        await db.read();
        const user = db.data.users.find((u: User) => u.email === email);

        if (!user) {
            res.status(401).json({ error: "Invalid email or password" });
            return;
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            res.status(401).json({ error: "Invalid email or password" });
            return;
        }

        const token = jwt.sign(
            { id: user.id },
            JWT_SECRET,
            // TODO: move it to config
            { expiresIn: "24h" },
        );

        // TODO: split it into header.payload + signature for better security
        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            // TODO: move it to config
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
        });

        res.status(200).json({
            message: "Login successful",
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
            },
        });
    } catch (error) {
        if (error instanceof ZodError) {
            res.status(400).json({ error: error.issues });
        } else {
            console.error(error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    }
});

// Configure multer for file uploads
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, "..", "files");

// Ensure uploads directory exists
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(
            null,
            file.fieldname +
                "-" +
                uniqueSuffix +
                path.extname(file.originalname),
        );
    },
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
});

// File upload endpoint
app.post(
    "/upload",
    authenticate,
    upload.single("file"),
    async (req: AuthRequest, res: Response) => {
        try {
            if (!req.user) {
                res.status(401).json({ error: "Unauthorized" });
                return;
            }

            if (!req.file) {
                res.status(400).json({ error: "No file uploaded" });
                return;
            }

            const fileMetadata: File = {
                id: Date.now(),
                name: req.file.originalname,
                size: req.file.size,
                type: req.file.mimetype,
                path: req.file.path,
                uploadedAt: new Date().toISOString(),
                userId: req.user.id,
            };

            await db.read();
            if (!db.data.files) {
                db.data.files = [];
            }
            db.data.files.push(fileMetadata);
            await db.write();

            res.status(201).json({
                message: "File uploaded successfully",
                file: {
                    id: fileMetadata.id,
                    name: fileMetadata.name,
                    size: fileMetadata.size,
                    type: fileMetadata.type,
                    uploadedAt: fileMetadata.uploadedAt,
                },
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    },
);

app.get("/files", authenticate, async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        await db.read();
        const userFiles = db.data.files?.filter(
            (file) => file.userId === req.user!.id,
        );

        res.status(200).json({
            files: userFiles ?? [],
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.post("/logout", (req: Request, res: Response) => {
    res.clearCookie("token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
    });
    res.status(200).json({ message: "Logged out successfully" });
});

if (process.env.NODE_ENV !== "test") {
    app.listen(port, () => {
        console.log(`Server is running at http://localhost:${port}`);
    });
}

export default app;
