const express = require("express");
const mysql = require("mysql");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Conexión inicial para la base de datos
const db = mysql.createConnection({
  host: "aws-0-us-west-1.pooler.supabase.com", // Cambia esto si usas otro servicio
  user: "postgres.zbvnhrrrrdfrwjnxyuz",
  password: "q9Pqk989wxLtInx1",
  database: "bordados", // Asegúrate de usar tu base de datos
});

db.connect((err) => {
  if (err) {
    console.error("Error conectando al servidor MySQL:", err);
    return;
  }
  console.log("Conectado a la base de datos.");

  // Crear las tablas si no existen
  const createTables = `
    CREATE TABLE IF NOT EXISTS pedidos (
      id INT AUTO_INCREMENT PRIMARY KEY,
      fecha DATE DEFAULT CURDATE(),
      total DECIMAL(10, 2) NOT NULL,
      estado ENUM('Pendiente', 'Hecho', 'Entregado', 'Pagado') DEFAULT 'Pendiente'
    );

    CREATE TABLE IF NOT EXISTS items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      pedido_id INT NOT NULL,
      modelo VARCHAR(255) NOT NULL,
      cantidad INT NOT NULL,
      variaciones TEXT,
      material VARCHAR(255),
      subtotal DECIMAL(10, 2) NOT NULL,
      FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE
    );
  `;

  db.query(createTables, (err) => {
    if (err) {
      console.error("Error creando tablas:", err);
    } else {
      console.log("Tablas verificadas o creadas exitosamente.");
    }
  });
});

// ================== Rutas para manejo de pedidos ==================

// Obtener todos los pedidos
app.get("/api/pedidos", (req, res) => {
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

  db.query(query, (err, results) => {
    if (err) {
      console.error("Error al obtener pedidos:", err);
      return res.status(500).json({ error: "Error al obtener pedidos." });
    }

    const pedidos = results.reduce((acc, row) => {
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
  });
});

// Crear un nuevo pedido
app.post("/api/pedidos", (req, res) => {
  const { total, estado } = req.body;

  if (!total || !estado) {
    return res.status(400).json({ error: "Total y estado son obligatorios." });
  }

  const query = `INSERT INTO pedidos (total, estado) VALUES (?, ?)`;

  db.query(query, [total, estado], (err, result) => {
    if (err) {
      console.error("Error al crear el pedido:", err);
      return res.status(500).json({ error: "Error al crear el pedido." });
    }
    res.json({ id: result.insertId, nombre: `Pedido #${result.insertId}` });
  });
});

// Agregar un ítem a un pedido
app.post("/api/items", (req, res) => {
  const { pedidoId, modelo, cantidad, variaciones, material, subtotal } = req.body;

  if (!pedidoId || !modelo || !cantidad || !subtotal || !material) {
    return res.status(400).json({ error: "Todos los campos son obligatorios." });
  }

  const query = `
    INSERT INTO items (pedido_id, modelo, cantidad, variaciones, material, subtotal)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.query(query, [pedidoId, modelo, cantidad, variaciones, material, subtotal], (err) => {
    if (err) {
      console.error("Error al agregar el ítem:", err);
      return res.status(500).json({ error: "Error al agregar el ítem." });
    }

    // Actualizar el total del pedido
    const updateTotalQuery = `
      UPDATE pedidos
      SET total = (SELECT SUM(subtotal) FROM items WHERE pedido_id = ?)
      WHERE id = ?
    `;

    db.query(updateTotalQuery, [pedidoId, pedidoId], (err) => {
      if (err) {
        console.error("Error al actualizar el total del pedido:", err);
        return res.status(500).json({ error: "Error al actualizar el total del pedido." });
      }

      res.json({ message: "Ítem agregado y total actualizado correctamente." });
    });
  });
});

// Actualizar un ítem
app.put("/api/items/:id", (req, res) => {
  const { id } = req.params;
  const { cantidad, variaciones, material } = req.body;

  if (!cantidad && !variaciones && !material) {
    return res.status(400).json({ error: "Debe proporcionar cantidad, variaciones o material para actualizar." });
  }

  const updates = [];
  const values = [];

  if (cantidad) {
    updates.push("cantidad = ?");
    values.push(cantidad);
  }
  if (variaciones) {
    updates.push("variaciones = ?");
    values.push(variaciones);
  }
  if (material) {
    updates.push("material = ?");
    values.push(material);
  }

  values.push(id);

  const query = `UPDATE items SET ${updates.join(", ")} WHERE id = ?`;

  db.query(query, values, (err, result) => {
    if (err) {
      console.error("Error al actualizar el ítem:", err);
      return res.status(500).json({ error: "Error al actualizar el ítem." });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Ítem no encontrado." });
    }

    res.json({ message: "Ítem actualizado correctamente." });
  });
});

// ================== Iniciar el servidor ==================
app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
