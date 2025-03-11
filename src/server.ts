import express, { Request, Response } from "express";
import pool from "./db";

const app = express();
app.use(express.json());

app.get("/users", async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.query("SELECT * FROM users");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post("/users", async (req: Request, res: Response) => {
  const { name, email } = req.body;
  try {
    await pool.query("INSERT INTO users (name, email) VALUES (?, ?)", [
      name,
      email,
    ]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
