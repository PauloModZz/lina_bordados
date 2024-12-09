const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { Pool } = require("pg");

const app = express();
const PORT = 5000;

// URL de Render
const API_URL = "https://lina-bordados.onrender.com";

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Configuración de conexión a la base de datos PostgreSQL (usa tus datos de Supabase)
const pool = new Pool({
  host: "aws-0-us-west-1.pooler.supabase.com",   // Reemplaza con tu valor real
  user: "postgres.zbvnhrrrrdfrwjnxyuz",          // Reemplaza con tu valor real
  password: "AkSkqm30JncAT2Ze",                  // Reemplaza con tu valor real
  database: "postgres",                          // Reemplaza con tu valor real
  port: 6543,                                    // Reemplaza con tu valor real
  ssl: { rejectUnauthorized: false },            // Habilita SSL
});

