const express = require('express');
const serverless = require('serverless-http');
const { registerRoutes } = require('../../server/routes');

const app = express();

// Middleware: JSON body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Middleware: CORS
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

// Register API routes
registerRoutes(app);

module.exports.handler = serverless(app);