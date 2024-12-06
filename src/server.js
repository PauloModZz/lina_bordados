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
  password: "admin", // Cambiar según tu configuración
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
          material: row.material, // Incluir el campo material
          subtotal: row.subtotal,
        });
      }

      return acc;
    }, {});

    res.json(Object.values(pedidos));
  });
});

// Obtener un pedido por ID
app.get("/api/pedidos/:id", (req, res) => {
  const { id } = req.params;

  const query = `
    SELECT p.id AS pedido_id, p.fecha, p.total, p.estado,
           i.id AS item_id, i.modelo, i.cantidad, i.variaciones, i.subtotal
    FROM pedidos p
    LEFT JOIN items i ON p.id = i.pedido_id
    WHERE p.id = ?
  `;

  db.query(query, [id], (err, results) => {
    if (err) {
      console.error("Error al obtener el pedido:", err);
      return res.status(500).json({ error: "Error al obtener el pedido." });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: "Pedido no encontrado." });
    }

    const pedido = results.reduce(
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
  });
});

// Crear un nuevo pedido
app.post("/api/pedidos", (req, res) => {
  const { total, estado } = req.body;

  if (!total || !estado) {
    return res.status(400).json({ error: "Total y estado son obligatorios." });
  }

  const query = `
    INSERT INTO pedidos (total, estado)
    VALUES (?, ?)
  `;

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
    return res.status(400).json({ error: "Todos los campos son obligatorios, incluido el material." });
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
    res.json({ message: "Ítem agregado correctamente." });
  });
});

// Actualizar estado de un pedido
app.put("/api/pedidos/:id", (req, res) => {
  const { id } = req.params;
  const { estado } = req.body;

  if (!estado) {
    return res.status(400).json({ error: "El estado es obligatorio." });
  }

  const query = `
    UPDATE pedidos
    SET estado = ?
    WHERE id = ?
  `;

  db.query(query, [estado, id], (err, result) => {
    if (err) {
      console.error("Error al actualizar el pedido:", err);
      return res.status(500).json({ error: "Error al actualizar el pedido." });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Pedido no encontrado." });
    }

    res.json({ message: `Pedido #${id} actualizado a estado ${estado}` });
  });
});

app.put("/api/items/:id", (req, res) => {
  const { id } = req.params;
  const { cantidad, variaciones, material } = req.body;

  // Verifica que al menos uno de los campos a actualizar esté presente
  if (!cantidad && !variaciones && !material) {
    return res.status(400).json({
      error: "Debe proporcionar cantidad, variaciones o material para actualizar.",
    });
  }

  const updates = [];
  const values = [];

  // Si se proporciona cantidad, agrégala al conjunto de actualizaciones
  if (cantidad) {
    updates.push("cantidad = ?");
    values.push(cantidad);
  }

  // Si se proporciona variaciones, agrégala al conjunto de actualizaciones
  if (variaciones) {
    updates.push("variaciones = ?");
    values.push(variaciones);
  }

  // Si se proporciona material, agrégalo al conjunto de actualizaciones
  if (material) {
    updates.push("material = ?");
    values.push(material);
  }

  const query = `
    UPDATE items
    SET ${updates.join(", ")}
    WHERE id = ?
  `;

  values.push(id);

  // Actualizamos el ítem
  db.query(query, values, (err, result) => {
    if (err) {
      console.error("Error al actualizar el ítem:", err);
      return res.status(500).json({ error: "Error al actualizar el ítem." });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Ítem no encontrado." });
    }

    // Recalcular el subtotal del ítem si se cambió la cantidad
    if (cantidad) {
      const getItemQuery = `SELECT pedido_id, modelo FROM items WHERE id = ?`;
      db.query(getItemQuery, [id], (err, itemResults) => {
        if (err || itemResults.length === 0) {
          return res.status(500).json({
            error: "Error al obtener el ítem después de la actualización.",
          });
        }

        const { pedido_id, modelo } = itemResults[0];

        // Define los precios por modelo
        const modelPrices = {
          "Modelo 1 enconchado": 2,
          "Modelo 2 Filo fino": 2,
          "Modelo Ovalado": 2,
          "Modelo Navidad #1 arbol": 2.25,
          "Modelo Navidad #2 Hojas": 2.5,
          "Servilletas": 1,
        };

        const precio = modelPrices[modelo] || 0;
        const nuevoSubtotal = cantidad * precio;

        const updateSubtotalQuery = `
          UPDATE items
          SET subtotal = ?
          WHERE id = ?
        `;

        db.query(updateSubtotalQuery, [nuevoSubtotal, id], (err) => {
          if (err) {
            console.error("Error al actualizar el subtotal del ítem:", err);
            return res.status(500).json({
              error: "Error al actualizar el subtotal del ítem.",
            });
          }

          // Recalcular el total del pedido
          const updatePedidoQuery = `
            UPDATE pedidos
            SET total = (SELECT SUM(subtotal) FROM items WHERE pedido_id = ?)
            WHERE id = ?
          `;
          db.query(updatePedidoQuery, [pedido_id, pedido_id], (err) => {
            if (err) {
              console.error("Error al actualizar el total del pedido:", err);
              return res.status(500).json({
                error: "Error al actualizar el total del pedido.",
              });
            }

            res.json({
              message: "Ítem y total del pedido actualizados correctamente.",
            });
          });
        });
      });
    } else {
      res.json({ message: "Ítem actualizado correctamente." });
    }
  });
});


// Eliminar un pedido por ID
app.delete("/api/pedidos/:id", (req, res) => {
  const { id } = req.params;

  const query = `
    DELETE FROM pedidos
    WHERE id = ?
  `;

  db.query(query, [id], (err, result) => {
    if (err) {
      console.error("Error al eliminar el pedido:", err);
      return res.status(500).json({ error: "Error al eliminar el pedido." });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Pedido no encontrado." });
    }

    res.json({ message: `Pedido #${id} eliminado correctamente.` });
  });
});

// ================== Iniciar el servidor ==================
app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
