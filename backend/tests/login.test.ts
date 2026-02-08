import { afterEach, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { db } from "../src/db.ts";
import app from "../src/index.ts";
import bcrypt from "bcrypt";

describe("POST /login", () => {
    beforeEach(async () => {
        await db.read();
        db.data.users = [];
        await db.write();

        // Add a test user
        const password = "password123";
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        db.data.users.push({
            id: 1,
            username: "testuser",
            email: "test@example.com",
            password: hashedPassword,
            salt: salt,
        });
        await db.write();
    });

    afterEach(async () => {
        await db.read();
        db.data.users = [];
        await db.write();
    });

    it("should login successfully with correct credentials", async () => {
        const res = await request(app).post("/login").send({
            email: "test@example.com",
            password: "password123",
        });

        expect(res.status).toBe(200);
        expect(res.body.message).toBe("Login successful");
        expect(res.body.user.email).toBe("test@example.com");

        // Verify cookie
        const cookies = res.get("Set-Cookie");
        expect(cookies).toBeDefined();
        expect(Array.isArray(cookies)).toBe(true);
        const tokenCookie = (cookies as string[]).find((c: string) =>
            c.startsWith("token="),
        );
        expect(tokenCookie).toBeDefined();
        expect(tokenCookie).toContain("HttpOnly");
        expect(tokenCookie).toContain("SameSite=Lax");
    });

    it("should return 401 for incorrect password", async () => {
        const res = await request(app).post("/login").send({
            email: "test@example.com",
            password: "wrongpassword",
        });

        expect(res.status).toBe(401);
        expect(res.body.error).toBe("Invalid email or password");
    });

    it("should return 401 for non-existent user", async () => {
        const res = await request(app).post("/login").send({
            email: "nonexistent@example.com",
            password: "password123",
        });

        expect(res.status).toBe(401);
        expect(res.body.error).toBe("Invalid email or password");
    });

    it("should return 400 for invalid email format", async () => {
        const res = await request(app).post("/login").send({
            email: "invalid-email",
            password: "password123",
        });

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty("error");
    });
});
