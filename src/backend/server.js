//-------------------------------------------------------------------------------
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { createClient } from "@supabase/supabase-js";

const app = express();
const PORT = 5000;

// Configuración de Supabase
const SUPABASE_URL = "https://zbvvnhrrrdffwjvnxyuz.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpidnZuaHJycmRmZndqdm54eXV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM0NzU4NjIsImV4cCI6MjA0OTA1MTg2Mn0.2QvAtFoyn83RQq4I47OV11rLzeIYEFYmAJQ8sE_FOp8";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Middleware
app.use(cors());
app.use(bodyParser.json());
//-------------------------------------------------------------------------------
// Crear un nuevo pedido
app.get("/api/pedidos", async (req, res) => {
  try {
    // Selecciona pedidos e incluye los ítems relacionados
    const { data: pedidos, error } = await supabase
      .from("pedidos")
      .select(`
        id, 
        fecha, 
        total, 
        estado,
        items (
          id, modelo, cantidad, variaciones, material, subtotal
        )
      `);

    if (error) throw error;

    // Formatea la respuesta para añadir un nombre a cada pedido
    const formattedPedidos = pedidos.map((pedido) => ({
      id: pedido.id,
      nombre: `Pedido #${pedido.id}`,
      fecha: pedido.fecha,
      total: pedido.total,
      estado: pedido.estado,
      items: pedido.items || [], // Asegúrate de que los ítems existan
    }));

    res.json(formattedPedidos);
  } catch (err) {
    console.error("Error al obtener pedidos:", err.message);
    res.status(500).json({ error: "Error al obtener pedidos." });
  }
});
// Crear un nuevo pedido
app.post("/api/pedidos", async (req, res) => {
  const { total, estado } = req.body;

  if (!total || !estado) {
    return res.status(400).json({ error: "Total y estado son obligatorios." });
  }

  try {
    const { data, error } = await supabase.from("pedidos").insert([{ total, estado }]);
    if (error) throw error;

    res.status(201).json({ message: "Pedido creado exitosamente", data });
  } catch (err) {
    console.error("Error al crear el pedido:", err.message);
    res.status(500).json({ error: "Error al crear el pedido." });
  }
});
// Obtener un pedido por ID
app.get("/api/pedidos/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const { data: pedidos, error } = await supabase
      .from("pedidos")
      .select(
        `
        id, fecha, total, estado,
        items (
          id, modelo, cantidad, variaciones, material, subtotal
        )
        `
      )
      .eq("id", id);

    if (error) throw error;

    if (pedidos.length === 0) {
      return res.status(404).json({ error: "Pedido no encontrado." });
    }

    const pedido = pedidos[0];
    res.json({
      id: pedido.id,
      nombre: `Pedido #${pedido.id}`,
      fecha: pedido.fecha,
      total: pedido.total,
      estado: pedido.estado,
      items: pedido.items || [],
    });
  } catch (err) {
    console.error("Error al obtener el pedido:", err);
    res.status(500).json({ error: "Error al obtener el pedido." });
  }
});

// Agregar un ítem a un pedido
app.post("/api/items", async (req, res) => {
  const { pedidoId, modelo, cantidad, variaciones, material, subtotal } = req.body;

  if (!pedidoId || !modelo || !cantidad || !subtotal || !material) {
    return res.status(400).json({ error: "Todos los campos son obligatorios, incluido el material." });
  }

  try {
    const { data, error } = await supabase
      .from("items")
      .insert({
        pedido_id: pedidoId,
        modelo,
        cantidad,
        variaciones,
        material,
        subtotal,
      });

    if (error) throw error;

    // Actualizar el total del pedido
    const { error: updateError } = await supabase.rpc("update_pedido_total", {
      pedido_id: pedidoId,
    });

    if (updateError) throw updateError;

    res.json({ message: "Ítem agregado correctamente." });
  } catch (err) {
    console.error("Error al agregar el ítem:", err);
    res.status(500).json({ error: "Error al agregar el ítem." });
  }
});

// Actualizar el estado de un pedido
app.put("/api/pedidos/:id", async (req, res) => {
  const { id } = req.params;
  const { estado } = req.body;

  if (!estado) {
    return res.status(400).json({ error: "El estado es obligatorio." });
  }

  try {
    const { data, error } = await supabase
      .from("pedidos")
      .update({ estado })
      .eq("id", id);

    if (error) throw error;

    if (data.length === 0) {
      return res.status(404).json({ error: "Pedido no encontrado." });
    }

    res.json({ message: `Pedido #${id} actualizado a estado ${estado}` });
  } catch (err) {
    console.error("Error al actualizar el pedido:", err);
    res.status(500).json({ error: "Error al actualizar el pedido." });
  }
});

// Actualizar el ítem
app.put("/api/items/:id", async (req, res) => {
  const { id } = req.params;
  const { cantidad, variaciones, material } = req.body;

  if (!cantidad && !variaciones && !material) {
    return res.status(400).json({
      error: "Debe proporcionar cantidad, variaciones o material para actualizar.",
    });
  }

  try {
    // Actualizar el ítem
    const { data: updatedItem, error: updateError } = await supabase
      .from("items")
      .update({
        cantidad,
        variaciones,
        material,
      })
      .eq("id", id)
      .select("pedido_id, modelo");

    if (updateError) throw updateError;
    if (updatedItem.length === 0) {
      return res.status(404).json({ error: "Ítem no encontrado." });
    }

    const { pedido_id, modelo } = updatedItem[0];

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

      // Actualizar subtotal
      const { error: subtotalError } = await supabase
        .from("items")
        .update({ subtotal: nuevoSubtotal })
        .eq("id", id);

      if (subtotalError) throw subtotalError;

      // Recalcular el total del pedido
      const { error: totalError } = await supabase.rpc("update_pedido_total", {
        pedido_id,
      });

      if (totalError) throw totalError;

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

  try {
    const { data: deletedPedido, error } = await supabase
      .from("pedidos")
      .delete()
      .eq("id", id)
      .select("id");

    if (error) throw error;

    if (deletedPedido.length === 0) {
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
  console.log(`Base de datos funcionando en el puerto: ${PORT}`);
});
