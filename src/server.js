

const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");
const bodyParser = require("body-parser");


const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Conexión inicial para PostgreSQL usando Pool
const pool = new Pool({
  host: "aws-0-us-west-1.pooler.supabase.com",   // Reemplaza con tu valor real
  user: "postgres.zbvnhrrrrdfrwjnxyuz",          // Reemplaza con tu valor real
  password: "AkSkqm30JncAT2Ze",                  // Reemplaza con tu valor real
  database: "postgres",                          // Reemplaza con tu valor real
  port: 6543,                                    // Reemplaza con tu valor real
  ssl: { rejectUnauthorized: false },            // Habilita SSL
});

// Obtener todos los pedidos
app.get("/api/pedidos", async (req, res) => {
  const query = `
    SELECT 
      p.id AS pedido_id, 
      p.fecha, 
      p.total, 
      p.estado,
      i.id AS item_id, 
      i.modelo, 
      i.cantidad, 
      i.variaciones, 
      i.material, 
      i.subtotal
    FROM pedidos p
    LEFT JOIN items i ON p.id = i.pedido_id
  `;

  try {
    const { rows } = await pool.query(query);

    const pedidos = rows.reduce((acc, row) => {
      const pedidoId = row.pedido_id;

      if (!acc[pedidoId]) {
        acc[pedidoId] = {
          id: pedidoId,
          nombre: `Pedido #${pedidoId}`,
          fecha: row.fecha,
          total: row.total,
          estado: row.estado,
          items: [],
        };
      }

      if (row.item_id) {
        acc[pedidoId].items.push({
          id: row.item_id,
          modelo: row.modelo,
          cantidad: row.cantidad,
          variaciones: row.variaciones,
          material: row.material,
          subtotal: row.subtotal,
        });
      }

      return acc;
    }, {});

    res.json(Object.values(pedidos));
  } catch (err) {
    console.error("Error al obtener pedidos:", err);
    res.status(500).json({ error: "Error al obtener pedidos." });
  }
});

// Obtener un pedido por ID
app.get("/api/pedidos/:id", async (req, res) => {
  const { id } = req.params;

  const query = `
    SELECT p.id AS pedido_id, p.fecha, p.total, p.estado,
           i.id AS item_id, i.modelo, i.cantidad, i.variaciones, i.subtotal
    FROM pedidos p
    LEFT JOIN items i ON p.id = i.pedido_id
    WHERE p.id = $1
  `;

  try {
    const { rows } = await pool.query(query, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "Pedido no encontrado." });
    }

    const pedido = rows.reduce(
      (acc, row) => {
        if (!acc.id) {
          acc.id = row.pedido_id;
          acc.nombre = `Pedido #${row.pedido_id}`;
          acc.fecha = row.fecha;
          acc.total = row.total;
          acc.estado = row.estado;
          acc.items = [];
        }

        if (row.item_id) {
          acc.items.push({
            id: row.item_id,
            modelo: row.modelo,
            cantidad: row.cantidad,
            variaciones: row.variaciones,
            subtotal: row.subtotal,
          });
        }

        return acc;
      },
      { id: null, nombre: null, fecha: null, total: null, estado: null, items: [] }
    );

    res.json(pedido);
  } catch (err) {
    console.error("Error al obtener el pedido:", err);
    res.status(500).json({ error: "Error al obtener el pedido." });
  }
});

// Crear un nuevo pedido
app.post("/api/pedidos", async (req, res) => {
  const { total, estado } = req.body;

  if (!total || !estado) {
    return res.status(400).json({ error: "Total y estado son obligatorios." });
  }

  const query = `
    INSERT INTO pedidos (total, estado)
    VALUES ($1, $2)
    RETURNING id
  `;

  try {
    const { rows } = await pool.query(query, [total, estado]);
    const newPedidoId = rows[0].id;

    res.json({ id: newPedidoId, nombre: `Pedido #${newPedidoId}` });
  } catch (err) {
    console.error("Error al crear el pedido:", err);
    res.status(500).json({ error: "Error al crear el pedido." });
  }
});

// Agregar un ítem a un pedido
app.post("/api/items", async (req, res) => {
  const { pedidoId, modelo, cantidad, variaciones, material, subtotal } = req.body;

  if (!pedidoId || !modelo || !cantidad || !subtotal || !material) {
    return res.status(400).json({ error: "Todos los campos son obligatorios, incluido el material." });
  }

  const query = `
    INSERT INTO items (pedido_id, modelo, cantidad, variaciones, material, subtotal)
    VALUES ($1, $2, $3, $4, $5, $6)
  `;

  try {
    await pool.query(query, [pedidoId, modelo, cantidad, variaciones, material, subtotal]);

    // Actualizar el total del pedido después de agregar el ítem
    const updateTotalQuery = `
      UPDATE pedidos
      SET total = (SELECT SUM(subtotal) FROM items WHERE pedido_id = $1)
      WHERE id = $1
    `;

    await pool.query(updateTotalQuery, [pedidoId]);

    res.json({ message: "Ítem agregado correctamente." });
  } catch (err) {
    console.error("Error al agregar el ítem:", err);
    res.status(500).json({ error: "Error al agregar el ítem." });
  }
});

// ================== Iniciar el servidor ==================
app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
