const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { Pool } = require("pg");

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Configuración de conexión a la base de datos PostgreSQL (usa tus datos de Supabase)
const pool = new Pool({
  host: "aws-0-us-west-1.pooler.supabase.com",
  user: "postgres.zbvnhrrrrdfrwjnxyuz",
  password: "q9Pqk989wxLtInx1",
  database: "postgres",
  port: 6543,
  ssl: { rejectUnauthorized: false },
});

// ================== Rutas para manejo de pedidos ==================

// Actualizar estado de un pedido
app.put("/api/pedidos/:id", async (req, res) => {
  const { id } = req.params;
  const { estado } = req.body;

  if (!estado) {
    return res.status(400).json({ error: "El estado es obligatorio." });
  }

  const query = `
    UPDATE pedidos
    SET estado = $1
    WHERE id = $2
    RETURNING id
  `;

  try {
    const { rows } = await pool.query(query, [estado, id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "Pedido no encontrado." });
    }

    res.json({ message: `Pedido #${id} actualizado a estado ${estado}` });
  } catch (err) {
    console.error("Error al actualizar el pedido:", err);
    res.status(500).json({ error: "Error al actualizar el pedido." });
  }
});

// Actualizar un ítem
app.put("/api/items/:id", async (req, res) => {
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

  if (cantidad) {
    updates.push(`cantidad = $${updates.length + 1}`);
    values.push(cantidad);
  }

  if (variaciones) {
    updates.push(`variaciones = $${updates.length + 1}`);
    values.push(variaciones);
  }

  if (material) {
    updates.push(`material = $${updates.length + 1}`);
    values.push(material);
  }

  const query = `
    UPDATE items
    SET ${updates.join(", ")}
    WHERE id = $${updates.length + 1}
    RETURNING id
  `;

  values.push(id);

  try {
    const { rows } = await pool.query(query, values);

    if (rows.length === 0) {
      return res.status(404).json({ error: "Ítem no encontrado." });
    }

    res.json({ message: "Ítem actualizado correctamente." });
  } catch (err) {
    console.error("Error al actualizar el ítem:", err);
    res.status(500).json({ error: "Error al actualizar el ítem." });
  }
});
// Actualizar el ítem
app.put("/api/items/:id", async (req, res) => {
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
  
    if (cantidad) {
      updates.push(`cantidad = $${updates.length + 1}`);
      values.push(cantidad);
    }
  
    if (variaciones) {
      updates.push(`variaciones = $${updates.length + 1}`);
      values.push(variaciones);
    }
  
    if (material) {
      updates.push(`material = $${updates.length + 1}`);
      values.push(material);
    }
  
    const query = `
      UPDATE items
      SET ${updates.join(", ")}
      WHERE id = $${updates.length + 1}
      RETURNING pedido_id, modelo
    `;
  
    values.push(id);
  
    try {
      // Actualizamos el ítem y obtenemos datos adicionales
      const { rows } = await pool.query(query, values);
  
      if (rows.length === 0) {
        return res.status(404).json({ error: "Ítem no encontrado." });
      }
  
      const { pedido_id, modelo } = rows[0];
  
      // Recalcular el subtotal del ítem si se cambió la cantidad
      if (cantidad) {
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
          SET subtotal = $1
          WHERE id = $2
        `;
  
        await pool.query(updateSubtotalQuery, [nuevoSubtotal, id]);
  
        // Recalcular el total del pedido
        const updatePedidoQuery = `
          UPDATE pedidos
          SET total = (
            SELECT COALESCE(SUM(subtotal), 0) FROM items WHERE pedido_id = $1
          )
          WHERE id = $1
        `;
        await pool.query(updatePedidoQuery, [pedido_id]);
  
        res.json({
          message: "Ítem y total del pedido actualizados correctamente.",
        });
      } else {
        res.json({ message: "Ítem actualizado correctamente." });
      }
    } catch (err) {
      console.error("Error al actualizar el ítem:", err);
      res.status(500).json({ error: "Error al actualizar el ítem." });
    }
  });
  
  // Eliminar un pedido por ID
  app.delete("/api/pedidos/:id", async (req, res) => {
    const { id } = req.params;
  
    const query = `
      DELETE FROM pedidos
      WHERE id = $1
      RETURNING id
    `;
  
    try {
      const { rows } = await pool.query(query, [id]);
  
      if (rows.length === 0) {
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
