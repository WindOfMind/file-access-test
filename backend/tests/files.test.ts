import { afterEach, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { db } from "../src/db.ts";
import app from "../src/index.ts";
import bcrypt from "bcrypt";
import type { File } from "../src/types.ts";

describe("GET /files", () => {
    let authCookie: string = "";
    let userId: number;
    let otherUserId: number;

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

        // Create another user for testing isolation
        otherUserId = userId + 1;
        db.data.users.push({
            id: otherUserId,
            username: "otheruser",
            email: "other@example.com",
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

        // Add some test files
        const testFiles: File[] = [
            {
                id: 1,
                name: "document1.pdf",
                size: 1024,
                type: "application/pdf",
                path: "/fake/path/document1.pdf",
                uploadedAt: new Date().toISOString(),
                userId: userId,
            },
            {
                id: 2,
                name: "image.png",
                size: 2048,
                type: "image/png",
                path: "/fake/path/image.png",
                uploadedAt: new Date().toISOString(),
                userId: userId,
            },
            {
                id: 3,
                name: "other-user-file.txt",
                size: 512,
                type: "text/plain",
                path: "/fake/path/other-user-file.txt",
                uploadedAt: new Date().toISOString(),
                userId: otherUserId,
            },
        ];

        db.data.files = testFiles;
        await db.write();
    });

    afterEach(async () => {
        await db.read();
        db.data.users = [];
        db.data.files = [];
        await db.write();
    });

    it("should return files for authenticated user", async () => {
        const res = await request(app).get("/files").set("Cookie", authCookie);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("files");
        expect(Array.isArray(res.body.files)).toBe(true);
        expect(res.body.files).toHaveLength(2);

        // Verify only user's files are returned
        const fileNames = res.body.files.map((f: File) => f.name);
        expect(fileNames).toContain("document1.pdf");
        expect(fileNames).toContain("image.png");
        expect(fileNames).not.toContain("other-user-file.txt");

        // Verify all files belong to the authenticated user
        res.body.files.forEach((file: File) => {
            expect(file.userId).toBe(userId);
        });
    });

    it("should return empty array when user has no files", async () => {
        // Clear all files for the test user
        await db.read();
        db.data.files = db.data.files.filter((f) => f.userId !== userId);
        await db.write();

        const res = await request(app).get("/files").set("Cookie", authCookie);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("files");
        expect(Array.isArray(res.body.files)).toBe(true);
        expect(res.body.files).toHaveLength(0);
    });

    it("should return 401 when no token is provided", async () => {
        const res = await request(app).get("/files");

        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty("error");
        expect(res.body.error).toBe("Unauthorized: No token provided");
    });

    it("should return 401 when invalid token is provided", async () => {
        const res = await request(app)
            .get("/files")
            .set("Cookie", "token=invalid_token_here");

        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty("error");
        expect(res.body.error).toBe("Unauthorized: Invalid token");
    });

    it("should return files with correct structure", async () => {
        const res = await request(app).get("/files").set("Cookie", authCookie);

        expect(res.status).toBe(200);
        expect(res.body.files).toHaveLength(2);

        // Verify file structure
        const file = res.body.files[0];
        expect(file).toHaveProperty("id");
        expect(file).toHaveProperty("name");
        expect(file).toHaveProperty("size");
        expect(file).toHaveProperty("type");
        expect(file).toHaveProperty("uploadedAt");
        expect(file).toHaveProperty("userId");

        // Verify data types
        expect(typeof file.id).toBe("number");
        expect(typeof file.name).toBe("string");
        expect(typeof file.size).toBe("number");
        expect(typeof file.type).toBe("string");
        expect(typeof file.uploadedAt).toBe("string");
        expect(typeof file.userId).toBe("number");
    });

    it("should not return files from other users", async () => {
        const res = await request(app).get("/files").set("Cookie", authCookie);

        expect(res.status).toBe(200);

        // Ensure no files from other users are included
        const otherUserFiles = res.body.files.filter(
            (f: File) => f.userId === otherUserId,
        );
        expect(otherUserFiles).toHaveLength(0);
    });
});
