import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertSessionSchema, insertQuestionSchema } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";
import { nanoid } from "nanoid";

// Configure multer for audio file uploads
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  dest: uploadDir,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    console.log('File mimetype:', file.mimetype);
    if (file.mimetype.startsWith('audio/') || 
        file.mimetype === 'video/webm' || 
        file.mimetype === 'application/octet-stream') {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint for Railway
  app.get("/", (req, res) => {
    res.json({ status: "ok", message: "Virtual Mic System is running" });
  });
  app.get("/health", (req, res) => {
    res.json({ status: "healthy", timestamp: new Date().toISOString() });
  });
  // Session routes
  app.post("/api/sessions", async (req, res) => {
    try {
      const sessionData = insertSessionSchema.parse({
        ...req.body,
        id: nanoid(8), // Generate unique session ID
      });
      
      const session = await storage.createSession(sessionData);
      res.json(session);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/sessions/:id", async (req, res) => {
    try {
      const session = await storage.getSession(req.params.id);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      res.json(session);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/sessions/:id", async (req, res) => {
    try {
      const session = await storage.updateSession(req.params.id, req.body);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      res.json(session);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Question routes
  app.post("/api/questions", upload.single('audio'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Audio file is required" });
      }

      const questionData = insertQuestionSchema.parse({
        sessionId: req.body.sessionId,
        participantName: req.body.participantName || "Anonymous",
        audioFilename: req.file.filename,
        duration: parseInt(req.body.duration) || 0,
      });

      const question = await storage.createQuestion(questionData);
      
      // Update participant count if this is a new participant
      const session = await storage.getSession(questionData.sessionId);
      if (session) {
        await storage.updateSession(session.id, {
          participantCount: session.participantCount + 1,
        });
      }

      res.json(question);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/sessions/:sessionId/questions", async (req, res) => {
    try {
      const questions = await storage.getQuestionsBySession(req.params.sessionId);
      res.json(questions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/questions/:id", async (req, res) => {
    try {
      const question = await storage.updateQuestion(parseInt(req.params.id), req.body);
      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }
      res.json(question);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/questions/:id", async (req, res) => {
    try {
      const question = await storage.getQuestion(parseInt(req.params.id));
      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }

      // Delete the audio file
      const filePath = path.join(uploadDir, question.audioFilename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      await storage.deleteQuestion(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/questions/reorder", async (req, res) => {
    try {
      const { sessionId, questionOrders } = req.body;
      await storage.updateQuestionOrder(sessionId, questionOrders);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Serve audio files with better headers
  app.get("/api/audio/:filename", (req, res) => {
    const filePath = path.join(uploadDir, req.params.filename);
    if (fs.existsSync(filePath)) {
      const stat = fs.statSync(filePath);
      const fileSize = stat.size;
      const range = req.headers.range;

      if (range) {
        // Support range requests for better streaming
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;
        const file = fs.createReadStream(filePath, { start, end });
        const head = {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': 'audio/webm',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=3600'
        };
        res.writeHead(206, head);
        file.pipe(res);
      } else {
        // Regular request
        const head = {
          'Content-Length': fileSize,
          'Content-Type': 'audio/webm',
          'Accept-Ranges': 'bytes',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=3600'
        };
        res.writeHead(200, head);
        fs.createReadStream(filePath).pipe(res);
      }
    } else {
      res.status(404).json({ message: "Audio file not found" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
