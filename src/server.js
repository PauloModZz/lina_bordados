const express = require("express");
const mysql = require("mysql");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Conexión inicial para verificar o crear la base de datos
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "q9Pqk989wxLtInx1", // Cambiar según tu configuración
});

db.connect((err) => {
  if (err) {
    console.error("Error conectando al servidor MySQL:", err);
    return;
  }
  console.log("Conectado al servidor MySQL.");

  // Crear la base de datos si no existe
  db.query("CREATE DATABASE IF NOT EXISTS bordados", (err) => {
    if (err) {
      console.error("Error al crear la base de datos bordados:", err);
      return;
    }
    console.log("Base de datos 'bordados' verificada o creada exitosamente.");

    // Cambiar al uso de la base de datos bordados
    db.changeUser({ database: "bordados" }, (err) => {
      if (err) {
        console.error("Error al cambiar a la base de datos 'bordados':", err);
        return;
      }

      console.log("Conectado a la base de datos 'bordados'.");

      // Crear la tabla pedidos
      const createPedidosTable = `
        CREATE TABLE IF NOT EXISTS pedidos (
          id INT AUTO_INCREMENT PRIMARY KEY,
          fecha DATE DEFAULT (CURDATE()),
          total DECIMAL(10, 2) NOT NULL,
          estado ENUM('Pendiente', 'Hecho', 'Entregado', 'Pagado') DEFAULT 'Pendiente'
        );
      `;
      db.query(createPedidosTable, (err) => {
        if (err) {
          console.error("Error al crear la tabla pedidos:", err);
          return;
        }
        console.log("Tabla 'pedidos' verificada o creada exitosamente.");

        // Crear la tabla items
        const createItemsTable = `
          CREATE TABLE IF NOT EXISTS items (
            id INT AUTO_INCREMENT PRIMARY KEY,
            pedido_id INT NOT NULL,
            modelo VARCHAR(255) NOT NULL,
            cantidad INT NOT NULL,
            variaciones TEXT,
            subtotal DECIMAL(10, 2) NOT NULL,
            FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE
          );
        `;
        db.query(createItemsTable, (err) => {
          if (err) {
            console.error("Error al crear la tabla items:", err);
            return;
          }
          console.log("Tabla 'items' verificada o creada exitosamente.");
        });
      });
    });
  });
});

// ================== Rutas para manejo de pedidos ==================

// Obtener todos los pedidos
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
          material: row.material, // Incluir el campo material
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
