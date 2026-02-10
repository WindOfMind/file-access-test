import { afterEach, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { db } from "../src/db.ts";
import app from "../src/index.ts";
import bcrypt from "bcrypt";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("POST /upload", () => {
    let authCookie: string = "";
    let userId: number;
    const uploadsDir = path.join(__dirname, "..", "files");

    beforeEach(async () => {
        await db.read();
        db.data.users = [];
        db.data.files = [];
        await db.write();

        // Create test user
        const password = "password123";
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        userId = Date.now();
        db.data.users.push({
            id: userId,
            username: "testuser",
            email: "test@example.com",
            password: hashedPassword,
            salt: salt,
        });
        await db.write();

        // Login to get a valid auth token
        const loginRes = await request(app).post("/login").send({
            email: "test@example.com",
            password: "password123",
        });

        // Extract the token cookie from the login response
        const cookies = loginRes.get("Set-Cookie");
        if (cookies && Array.isArray(cookies)) {
            const tokenCookie = cookies.find((c: string) =>
                c.startsWith("token="),
            );
            if (tokenCookie) {
                authCookie = tokenCookie.split(";")[0] || "";
            }
        }

        // Ensure uploads directory exists
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }
    });

    afterEach(async () => {
        await db.read();
        db.data.users = [];
        db.data.files = [];
        await db.write();

        // Clean up uploaded files
        if (fs.existsSync(uploadsDir)) {
            const files = fs.readdirSync(uploadsDir);
            for (const file of files) {
                fs.unlinkSync(path.join(uploadsDir, file));
            }
        }
    });

    it("should upload a file successfully for authenticated user", async () => {
        const testFilePath = path.join(__dirname, "test-file.txt");
        fs.writeFileSync(testFilePath, "This is a test file");

        const res = await request(app)
            .post("/upload")
            .set("Cookie", authCookie)
            .attach("file", testFilePath);

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty(
            "message",
            "File uploaded successfully",
        );
        expect(res.body).toHaveProperty("file");
        expect(res.body.file).toHaveProperty("id");
        expect(res.body.file).toHaveProperty("name", "test-file.txt");
        expect(res.body.file).toHaveProperty("size");
        expect(res.body.file).toHaveProperty("type");
        expect(res.body.file).toHaveProperty("uploadedAt");

        // Verify file was saved to database
        await db.read();
        expect(db.data.files).toHaveLength(1);
        expect(db.data.files[0]!.userId).toBe(userId);
        expect(db.data.files[0]!.name).toBe("test-file.txt");

        // Clean up test file
        fs.unlinkSync(testFilePath);
    });

    it("should return 401 when no token is provided", async () => {
        const res = await request(app).post("/upload");

        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty("error");
        expect(res.body.error).toBe("Unauthorized: No token provided");
    });

    it("should return 400 when no file is provided", async () => {
        const res = await request(app)
            .post("/upload")
            .set("Cookie", authCookie);

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty("error", "No file uploaded");
    });

    it("should save file to the files directory", async () => {
        const testFilePath = path.join(__dirname, "test-file.txt");
        const testContent = "This is a test file";
        fs.writeFileSync(testFilePath, testContent);

        const res = await request(app)
            .post("/upload")
            .set("Cookie", authCookie)
            .attach("file", testFilePath);

        expect(res.status).toBe(201);

        // Verify file exists in uploads directory
        await db.read();
        const uploadedFile = db.data.files[0];
        expect(uploadedFile).toBeDefined();
        if (uploadedFile) {
            expect(fs.existsSync(uploadedFile.path)).toBe(true);

            // Verify file content
            const uploadedContent = fs.readFileSync(uploadedFile.path, "utf-8");
            expect(uploadedContent).toBe(testContent);
        }

        // Clean up test file
        fs.unlinkSync(testFilePath);
    });

    it("should handle multiple file uploads from same user", async () => {
        const testFile1Path = path.join(__dirname, "test-file-1.txt");
        const testFile2Path = path.join(__dirname, "test-file-2.txt");
        fs.writeFileSync(testFile1Path, "First file");
        fs.writeFileSync(testFile2Path, "Second file");

        const res1 = await request(app)
            .post("/upload")
            .set("Cookie", authCookie)
            .attach("file", testFile1Path);

        const res2 = await request(app)
            .post("/upload")
            .set("Cookie", authCookie)
            .attach("file", testFile2Path);

        expect(res1.status).toBe(201);
        expect(res2.status).toBe(201);

        // Verify both files are in database
        await db.read();
        expect(db.data.files).toHaveLength(2);
        expect(db.data.files[0]!.userId).toBe(userId);
        expect(db.data.files[1]!.userId).toBe(userId);

        // Clean up test files
        fs.unlinkSync(testFile1Path);
        fs.unlinkSync(testFile2Path);
    });
});
