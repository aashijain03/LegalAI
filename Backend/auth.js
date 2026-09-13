import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { config } from "./config.js";
import { requireAuth } from "./authMiddleware.js";
import { parseOrRespond } from "./validation.js";
import {
  getUserByEmail,
  getUserById,
  createUser,
  updateUserName,
  updateUserPassword,
} from "./db.js";

const router = express.Router();

const signupSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const loginSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const updateProfileSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
});

router.post("/signup", async (req, res) => {
  try {
    const data = parseOrRespond(signupSchema, req.body, res);
    if (!data) return;
    const { name, email, password } = data;

    const existingUser = getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: Date.now().toString(),
      name,
      email,
      password: hashedPassword,
    };

    createUser(newUser);

    const token = jwt.sign({ userId: newUser.id, email: newUser.email }, config.jwtSecret, {
      expiresIn: "24h",
    });

    res.json({ token, user: { id: newUser.id, name: newUser.name, email: newUser.email } });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const data = parseOrRespond(loginSchema, req.body, res);
    if (!data) return;
    const { email, password } = data;

    const user = getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign({ userId: user.id, email: user.email }, config.jwtSecret, {
      expiresIn: "24h",
    });

    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = getUserById(req.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    console.error("Auth me error:", err);
    res.status(401).json({ error: "Invalid token" });
  }
});

router.put("/me", requireAuth, async (req, res) => {
  try {
    const data = parseOrRespond(updateProfileSchema, req.body, res);
    if (!data) return;

    const user = getUserById(req.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    updateUserName(req.userId, data.name);

    res.json({ user: { id: user.id, name: data.name, email: user.email } });
  } catch (err) {
    console.error("Update profile error:", err);
    res.status(401).json({ error: "Invalid token" });
  }
});

router.post("/change-password", requireAuth, async (req, res) => {
  try {
    const data = parseOrRespond(changePasswordSchema, req.body, res);
    if (!data) return;
    const { currentPassword, newPassword } = data;

    const user = getUserById(req.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    updateUserPassword(req.userId, hashedPassword);

    res.json({ success: true });
  } catch (err) {
    console.error("Change password error:", err);
    res.status(401).json({ error: "Invalid token" });
  }
});

export default router;
