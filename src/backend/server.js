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
// ==========================================
// ** CRUD DE PEDIDOS Y ÍTEMS **
// ==========================================

// ** Obtener todos los pedidos con ítems relacionados **
app.get("/api/pedidos", async (req, res) => {
  try {
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

    const formattedPedidos = pedidos.map((pedido) => ({
      id: pedido.id,
      nombre: `Pedido #${pedido.id}`,
      fecha: pedido.fecha,
      total: pedido.total,
      estado: pedido.estado,
      items: pedido.items || [],
    }));

    res.json(formattedPedidos);
  } catch (err) {
    console.error("Error al obtener pedidos:", err.message);
    res.status(500).json({ error: "Error al obtener pedidos." });
  }
});

// ** Crear un nuevo pedido y agregar ítem **
app.post("/api/pedidos-con-item", async (req, res) => {
  const { total, estado, modelo, cantidad, variaciones, material, subtotal } = req.body;

  if (!total || !estado || !modelo || !cantidad || !material || !subtotal) {
    return res.status(400).json({
      error: "Todos los campos son obligatorios para crear el pedido y el ítem.",
    });
  }

  try {
    const { data: pedido, error: pedidoError } = await supabase
      .from("pedidos")
      .insert([{ total, estado }])
      .select("id");

    if (pedidoError) throw pedidoError;
    const pedidoId = pedido[0].id;

    const { data: item, error: itemError } = await supabase
      .from("items")
      .insert([
        {
          pedido_id: pedidoId,
          modelo,
          cantidad,
          variaciones,
          material,
          subtotal,
        },
      ]);

    if (itemError) throw itemError;

    const { error: totalError } = await supabase.rpc("update_pedido_total", {
      pedido_id_param: pedidoId,
    });

    if (totalError) throw totalError;

    res.status(201).json({
      message: "Pedido y primer ítem creados correctamente.",
      pedidoId,
      item,
    });
  } catch (err) {
    console.error("Error al crear el pedido y el ítem:", err.message);
    res.status(500).json({ error: "Error al crear el pedido y el ítem." });
  }
});

// ** Actualizar un ítem y recalcular el total **
app.put("/api/items/:id", async (req, res) => {
  const { id } = req.params;
  const { cantidad, material, variaciones } = req.body;

  if (!cantidad && !material && !variaciones) {
    return res.status(400).json({
      error: "Debe proporcionar cantidad, material o variaciones para actualizar.",
    });
  }

  try {
    const { data, error } = await supabase
      .from("items")
      .update({
        ...(cantidad && { cantidad }),
        ...(material && { material }),
        ...(variaciones && { variaciones }),
      })
      .eq("id", id)
      .select("pedido_id, modelo, cantidad");

    if (error) throw error;
    if (!data || data.length === 0) {
      return res.status(404).json({ error: "Ítem no encontrado." });
    }

    const pedidoId = data[0].pedido_id;
    const modelo = data[0].modelo;
    const nuevaCantidad = data[0].cantidad;

    const modelosPrecios = {
      "Modelo 1 enconchado": 2.0,
      "Modelo 2 Filo fino": 2.0,
      "Modelo Ovalado": 2.0,
      "Modelo Navidad #1 arbol": 2.25,
      "Modelo Navidad #2 Hojas": 2.5,
      "Servilletas": 1.0,
    };

    const nuevoSubtotal = modelosPrecios[modelo] * nuevaCantidad;

    const { error: subtotalError } = await supabase
      .from("items")
      .update({ subtotal: nuevoSubtotal })
      .eq("id", id);

    if (subtotalError) throw subtotalError;

    const { error: totalError } = await supabase.rpc("update_pedido_total", {
      pedido_id_param: pedidoId,
    });

    if (totalError) throw totalError;

    res.json({ message: "Ítem actualizado correctamente." });
  } catch (err) {
    console.error("Error al actualizar el ítem:", err.message);
    res.status(500).json({ error: "Error al actualizar el ítem." });
  }
});

// ** Agregar un ítem a un pedido existente **
app.post("/api/items", async (req, res) => {
  const { pedidoId, modelo, cantidad, variaciones, material } = req.body;

  // Validación de campos requeridos
  if (!pedidoId || !modelo || !cantidad || !material) {
    return res.status(400).json({
      error: "Todos los campos son obligatorios para crear un ítem.",
    });
  }

  try {
    // Definir precios según el modelo
    const modelosPrecios = {
      "Modelo 1 enconchado": 2.0,
      "Modelo 2 Filo fino": 2.0,
      "Modelo Ovalado": 2.0,
      "Modelo Navidad #1 arbol": 2.25,
      "Modelo Navidad #2 Hojas": 2.5,
      "Servilletas": 1.0,
    };

    // Calcular subtotal
    const subtotal = modelosPrecios[modelo] * cantidad;

    // Insertar el ítem
    const { data, error } = await supabase
      .from("items")
      .insert([
        {
          pedido_id: pedidoId,
          modelo,
          cantidad,
          variaciones: variaciones || "",
          material,
          subtotal,
        },
      ])
      .select("id");

    if (error) throw error;
    if (!data || data.length === 0) {
      return res.status(500).json({ error: "Error al insertar el ítem." });
    }

    // Actualizar el total del pedido
    const { error: totalError } = await supabase.rpc("update_pedido_total", {
      pedido_id_param: pedidoId,
    });

    if (totalError) throw totalError;

    res.status(201).json({
      message: "Ítem agregado correctamente.",
      itemId: data[0].id,
    });
  } catch (err) {
    console.error("Error al agregar el ítem:", err.message);
    res.status(500).json({ error: "Error al agregar el ítem." });
  }
});


// ** Eliminar un pedido y sus ítems asociados **
app.delete("/api/pedidos/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const { data: deletedPedido, error } = await supabase
      .from("pedidos")
      .delete()
      .eq("id", id)
      .select("id");

    if (error) throw error;

    if (!deletedPedido.length) {
      return res.status(404).json({ error: "Pedido no encontrado." });
    }

    res.json({ message: `Pedido #${id} eliminado correctamente.` });
  } catch (err) {
    console.error("Error al eliminar el pedido:", err.message);
    res.status(500).json({ error: "Error al eliminar el pedido." });
  }
});

// ** Iniciar el servidor **
app.listen(PORT, () => {
  console.log(`Servidor funcionando en el puerto ${PORT}`);
});
