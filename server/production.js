import express from "express";
import { createServer } from "http";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// CORS
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Health check
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "Virtual Mic System is running" });
});

app.get("/health", (req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

// Basic storage
const storage = {
  sessions: new Map(),
  questions: new Map(),
  currentSessionId: 1,
  currentQuestionId: 1
};

// API Routes
app.post("/api/sessions", (req, res) => {
  const sessionId = `session_${Date.now()}`;
  const session = {
    id: sessionId,
    hostName: req.body.hostName || "Anonymous Host",
    isActive: true,
    participantCount: 0,
    createdAt: new Date().toISOString()
  };
  
  storage.sessions.set(sessionId, session);
  res.json(session);
});

app.get("/api/sessions/:id", (req, res) => {
  const session = storage.sessions.get(req.params.id);
  if (!session) {
    return res.status(404).json({ message: "Session not found" });
  }
  res.json(session);
});

app.get("/api/sessions/:sessionId/questions", (req, res) => {
  const questions = Array.from(storage.questions.values())
    .filter(q => q.sessionId === req.params.sessionId)
    .sort((a, b) => a.order - b.order);
  res.json(questions);
});

app.post("/api/questions", (req, res) => {
  const questionId = storage.currentQuestionId++;
  const question = {
    id: questionId,
    sessionId: req.body.sessionId,
    participantName: req.body.participantName || "Anonymous",
    audioFilename: `question_${questionId}.webm`,
    duration: req.body.duration || 0,
    status: "pending",
    order: questionId,
    createdAt: new Date().toISOString()
  };
  
  storage.questions.set(questionId, question);
  res.json(question);
});

// Serve static files
const publicPath = path.join(__dirname, "../dist/public");
if (fs.existsSync(publicPath)) {
  app.use(express.static(publicPath));
  
  app.get("*", (req, res) => {
    res.sendFile(path.join(publicPath, "index.html"));
  });
} else {
  console.log("Static files directory not found, serving basic response");
  app.get("*", (req, res) => {
    res.json({ message: "Virtual Mic API is running", path: req.path });
  });
}

// Error handler
app.use((err, req, res, next) => {
  console.error("Server Error:", err);
  res.status(500).json({ message: "Internal Server Error" });
});

const port = process.env.PORT || 3000;
const host = "0.0.0.0";

server.listen(port, host, () => {
  console.log(`✅ Server running on http://${host}:${port}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'production'}`);
});
