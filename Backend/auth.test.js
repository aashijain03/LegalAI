import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";
import authRoutes from "./auth.js";

const app = express();
app.use(express.json());
app.use("/auth", authRoutes);

describe("auth routes", () => {
  it("signs up a new user", async () => {
    const res = await request(app)
      .post("/auth/signup")
      .send({ name: "Alice", email: "alice@example.com", password: "password123" });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user).toMatchObject({ name: "Alice", email: "alice@example.com" });
  });

  it("rejects signup with missing fields", async () => {
    const res = await request(app)
      .post("/auth/signup")
      .send({ email: "no-name@example.com", password: "password123" });

    expect(res.status).toBe(400);
  });

  it("rejects a duplicate signup", async () => {
    await request(app)
      .post("/auth/signup")
      .send({ name: "Bob", email: "bob@example.com", password: "password123" });

    const res = await request(app)
      .post("/auth/signup")
      .send({ name: "Bob Two", email: "bob@example.com", password: "password123" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/already exists/i);
  });

  it("logs in with correct credentials", async () => {
    await request(app)
      .post("/auth/signup")
      .send({ name: "Carol", email: "carol@example.com", password: "password123" });

    const res = await request(app)
      .post("/auth/login")
      .send({ email: "carol@example.com", password: "password123" });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it("rejects login with the wrong password", async () => {
    await request(app)
      .post("/auth/signup")
      .send({ name: "Dave", email: "dave@example.com", password: "password123" });

    const res = await request(app)
      .post("/auth/login")
      .send({ email: "dave@example.com", password: "wrongpassword" });

    expect(res.status).toBe(401);
  });

  it("returns the current user for a valid token", async () => {
    const signup = await request(app)
      .post("/auth/signup")
      .send({ name: "Eve", email: "eve@example.com", password: "password123" });

    const res = await request(app)
      .get("/auth/me")
      .set("Authorization", `Bearer ${signup.body.token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe("eve@example.com");
  });

  it("rejects /auth/me with an invalid token", async () => {
    const res = await request(app).get("/auth/me").set("Authorization", "Bearer not-a-real-token");

    expect(res.status).toBe(401);
  });

  it("updates the user's name", async () => {
    const signup = await request(app)
      .post("/auth/signup")
      .send({ name: "Frank", email: "frank@example.com", password: "password123" });

    const res = await request(app)
      .put("/auth/me")
      .set("Authorization", `Bearer ${signup.body.token}`)
      .send({ name: "Franklin" });

    expect(res.status).toBe(200);
    expect(res.body.user.name).toBe("Franklin");
  });

  it("changes the password given the correct current password", async () => {
    const signup = await request(app)
      .post("/auth/signup")
      .send({ name: "Grace", email: "grace@example.com", password: "password123" });

    const changeRes = await request(app)
      .post("/auth/change-password")
      .set("Authorization", `Bearer ${signup.body.token}`)
      .send({ currentPassword: "password123", newPassword: "newpassword456" });

    expect(changeRes.status).toBe(200);

    const loginRes = await request(app)
      .post("/auth/login")
      .send({ email: "grace@example.com", password: "newpassword456" });

    expect(loginRes.status).toBe(200);
  });

  it("rejects a password change with the wrong current password", async () => {
    const signup = await request(app)
      .post("/auth/signup")
      .send({ name: "Heidi", email: "heidi@example.com", password: "password123" });

    const res = await request(app)
      .post("/auth/change-password")
      .set("Authorization", `Bearer ${signup.body.token}`)
      .send({ currentPassword: "wrongpassword", newPassword: "newpassword456" });

    expect(res.status).toBe(401);
  });
});
