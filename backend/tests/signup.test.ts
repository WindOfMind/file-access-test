import { afterEach, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { db } from "../src/db.ts";
import app from "../src/index.ts";

describe("POST /signup", () => {
    beforeEach(async () => {
        await db.read();
        db.data.users = [];
        await db.write();
    });

    afterEach(async () => {
        await db.read();
        db.data.users = [];
        await db.write();
    });

    it("should create a new user with valid data", async () => {
        const res = await request(app).post("/signup").send({
            username: "testuser",
            email: "test@example.com",
            password: "password123",
        });

        expect(res.status).toBe(201);
        expect(res.body.message).toBe("User created successfully");
        expect(res.body.user.username).toBe("testuser");
        expect(res.body.user.email).toBe("test@example.com");
        // Check if user is added to db
        expect(db.data.users).toHaveLength(1);
        expect(db.data.users[0]?.email).toBe("test@example.com");
    });

    it("should return 400 for invalid data", async () => {
        const res = await request(app).post("/signup").send({
            username: "ab", // too short
            email: "invalid-email",
            password: "123", // too short
        });

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty("error");
    });

    it("should return 409 if user already exists", async () => {
        // Pre-populate db
        db.data.users.push({
            id: 1,
            username: "existing",
            email: "test@example.com",
            password: "hashedpassword",
            salt: "randomsalt",
        });

        const res = await request(app).post("/signup").send({
            username: "newuser",
            email: "test@example.com",
            password: "password123",
        });

        expect(res.status).toBe(409);
        expect(res.body.error).toBe("User already exists");
    });
});
