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
  connectionString: "postgresql://postgres.zbvnhrrrrdfrwjnxyuz:AkSkqm30JncAT2Ze@aws-0-us-west-1.pooler.supabase.com:6543/postgres",
  ssl: { rejectUnauthorized: false }, // Permite conexiones SSL sin verificar certificados
});

// Prueba inicial de conexión
pool.query("SELECT NOW()", (err, res) => {
  if (err) {
    console.error("Error al conectar a la base de datos:", err);
  } else {
    console.log("Conexión exitosa a la base de datos:", res.rows);
  }
});

// Obtener todos los pedidos

app.get("/", (req, res) => {
  res.send("Servidor funcionando correctamente en Render 🚀");
});


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

app.get("/test-db", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT NOW() AS current_time");
    res.json({ message: "Conexión exitosa", currentTime: rows[0].current_time });
  } catch (err) {
    console.error("Error al conectar a la base de datos:", err.message, err.stack);
    res.status(500).json({ error: "No se pudo conectar a la base de datos." });
  }
});

// ================== Iniciar el servidor ==================
app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
