const express = require("express");
const { Pool } = require("pg"); // Cliente PostgreSQL
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Configuración de conexión a Supabase
const pool = new Pool({
  host: "aws-0-us-west-1.pooler.supabase.com", // Cambia si es otro host
  user: "postgres.zbvnhrrrrdfrwjnxyuz",
  password: "q9Pqk989wxLtInx1",
  database: "postgres", // Asegúrate de usar la base de datos correcta
  port: 5432, // Puerto para PostgreSQL
  ssl: { rejectUnauthorized: false }, // Requerido para conexiones seguras
});

// Verificar conexión
pool.connect((err) => {
  if (err) {
    console.error("Error conectando a la base de datos:", err);
  } else {
    console.log("Conexión exitosa con la base de datos Supabase.");
  }
});

// Crear tablas si no existen
const initializeTables = async () => {
  try {
    const createPedidosTable = `
      CREATE TABLE IF NOT EXISTS pedidos (
        id SERIAL PRIMARY KEY,
        fecha DATE DEFAULT CURRENT_DATE,
        total DECIMAL(10, 2) NOT NULL,
        estado VARCHAR(20) DEFAULT 'Pendiente'
      );
    `;

    const createItemsTable = `
      CREATE TABLE IF NOT EXISTS items (
        id SERIAL PRIMARY KEY,
        pedido_id INT REFERENCES pedidos(id) ON DELETE CASCADE,
        modelo VARCHAR(255) NOT NULL,
        cantidad INT NOT NULL,
        variaciones TEXT,
        material VARCHAR(255),
        subtotal DECIMAL(10, 2) NOT NULL
      );
    `;

    await pool.query(createPedidosTable);
    await pool.query(createItemsTable);

    console.log("Tablas verificadas o creadas exitosamente.");
  } catch (err) {
    console.error("Error al inicializar tablas:", err);
  }
};

// Llamar a la función para crear tablas
initializeTables();

// ================== Rutas para manejo de pedidos ==================

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
    LEFT JOIN items i ON p.id = i.pedido_id;
  `;

  try {
    const result = await pool.query(query);

    const pedidos = result.rows.reduce((acc, row) => {
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

// Crear un nuevo pedido
app.post("/api/pedidos", async (req, res) => {
  const { total, estado } = req.body;

  if (!total || !estado) {
    return res.status(400).json({ error: "Total y estado son obligatorios." });
  }

  const query = `INSERT INTO pedidos (total, estado) VALUES ($1, $2) RETURNING id`;

  try {
    const result = await pool.query(query, [total, estado]);
    res.json({ id: result.rows[0].id, nombre: `Pedido #${result.rows[0].id}` });
  } catch (err) {
    console.error("Error al crear el pedido:", err);
    res.status(500).json({ error: "Error al crear el pedido." });
  }
});

// Agregar un ítem a un pedido
app.post("/api/items", async (req, res) => {
  const { pedidoId, modelo, cantidad, variaciones, material, subtotal } = req.body;

  if (!pedidoId || !modelo || !cantidad || !subtotal || !material) {
    return res.status(400).json({ error: "Todos los campos son obligatorios." });
  }

  const query = `
    INSERT INTO items (pedido_id, modelo, cantidad, variaciones, material, subtotal)
    VALUES ($1, $2, $3, $4, $5, $6)
  `;

  try {
    await pool.query(query, [pedidoId, modelo, cantidad, variaciones, material, subtotal]);

    const updateTotalQuery = `
      UPDATE pedidos
      SET total = (SELECT SUM(subtotal) FROM items WHERE pedido_id = $1)
      WHERE id = $1
    `;
    await pool.query(updateTotalQuery, [pedidoId]);

    res.json({ message: "Ítem agregado y total actualizado correctamente." });
  } catch (err) {
    console.error("Error al agregar el ítem:", err);
    res.status(500).json({ error: "Error al agregar el ítem." });
  }
});

// Actualizar un ítem
app.put("/api/items/:id", async (req, res) => {
  const { id } = req.params;
  const { cantidad, variaciones, material } = req.body;

  if (!cantidad && !variaciones && !material) {
    return res.status(400).json({ error: "Debe proporcionar cantidad, variaciones o material para actualizar." });
  }

  const updates = [];
  const values = [];

  if (cantidad) {
    updates.push("cantidad = $1");
    values.push(cantidad);
  }
  if (variaciones) {
    updates.push("variaciones = $2");
    values.push(variaciones);
  }
  if (material) {
    updates.push("material = $3");
    values.push(material);
  }

  const query = `UPDATE items SET ${updates.join(", ")} WHERE id = $4 RETURNING pedido_id`;

  try {
    const result = await pool.query(query, [...values, id]);
    const pedidoId = result.rows[0].pedido_id;

    const updateTotalQuery = `
      UPDATE pedidos
      SET total = (SELECT SUM(subtotal) FROM items WHERE pedido_id = $1)
      WHERE id = $1
    `;
    await pool.query(updateTotalQuery, [pedidoId]);

    res.json({ message: "Ítem y total del pedido actualizados correctamente." });
  } catch (err) {
    console.error("Error al actualizar el ítem:", err);
    res.status(500).json({ error: "Error al actualizar el ítem." });
  }
});

// Eliminar un pedido
app.delete("/api/pedidos/:id", async (req, res) => {
  const { id } = req.params;

  const query = `DELETE FROM pedidos WHERE id = $1`;

  try {
    const result = await pool.query(query, [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Pedido no encontrado." });
    }

    res.json({ message: `Pedido #${id} eliminado correctamente.` });
  } catch (err) {
    console.error("Error al eliminar el pedido:", err);
    res.status(500).json({ error: "Error al eliminar el pedido." });
  }
});

// ================== Iniciar el servidor ==================
app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
