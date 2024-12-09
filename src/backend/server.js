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
    // Inserta el ítem
    const { data, error: insertError } = await supabase
      .from("items")
      .insert({
        pedido_id: pedidoId,
        modelo,
        cantidad,
        variaciones,
        material,
        subtotal,
      });

    console.log("Insert Response:", data, insertError);

    if (insertError) throw insertError;

    // Actualiza el total del pedido
    const { error: updateError } = await supabase.rpc("update_pedido_total", {
      pedido_id: pedidoId,
    });

    console.log("Update Total Response:", updateError);

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
      .eq("id", id)
      .select(); // Esto asegura que data contenga las filas actualizadas.

    if (error) throw error;

    res.json({ message: `Pedido #${id} actualizado a estado ${estado}` });
  } catch (err) {
    console.error("Error al actualizar el pedido:", err);
    res.status(500).json({ error: "Error al actualizar el pedido." });
  }
});



// Actualizar el ítem
app.put("/api/pedidos/:id", async (req, res) => {
  const { id } = req.params; // ID del pedido a actualizar
  const { estado } = req.body; // Estado nuevo para el pedido

  if (!estado) {
    return res.status(400).json({ error: "El estado es obligatorio." });
  }

  try {
    console.log(`Actualizando el estado del pedido con ID: ${id} a estado: ${estado}`);

    // Actualizar el pedido en Supabase
    const { data, error } = await supabase
      .from("pedidos")
      .update({ estado })
      .eq("id", id)
      .select(); // Usamos .select() para asegurarnos de recibir los datos actualizados

    console.log("Respuesta de Supabase:", data);

    if (error) {
      console.error("Error de Supabase:", error);
      throw error;
    }

    res.json({ message: `Pedido #${id} actualizado a estado ${estado}` });
  } catch (err) {
    console.error("Error al actualizar el pedido:", err.message);
    res.status(500).json({ error: "Error al actualizar el pedido." });
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
// Crear un nuevo pedido y agregar un ítem
app.post("/api/pedidos-completo", async (req, res) => {
  const { total, estado, modelo, cantidad, variaciones, material, subtotal } = req.body;

  // Validar que los datos obligatorios estén presentes
  if (!total || !estado || !modelo || !cantidad || !subtotal || !material) {
    return res.status(400).json({
      error: "Todos los campos son obligatorios, incluido el modelo, cantidad, y material.",
    });
  }

  try {
    // Crear el pedido
    const { data: pedido, error: pedidoError } = await supabase
      .from("pedidos")
      .insert([{ total, estado }])
      .select("id");

    if (pedidoError) throw pedidoError;
    const pedidoId = pedido[0].id;

    // Crear el ítem asociado al pedido
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

    // Actualizar el total del pedido
    const { error: totalError } = await supabase.rpc("update_pedido_total", {
      pedido_id: pedidoId,
    });

    if (totalError) throw totalError;

    res.status(201).json({
      message: "Pedido y ítem creados correctamente.",
      pedidoId,
      item,
    });
  } catch (err) {
    console.error("Error al crear el pedido y el ítem:", err);
    res.status(500).json({ error: "Error al crear el pedido y el ítem." });
  }
});

// Crear un nuevo pedido con el primer ítem
app.post("/api/pedidos-con-item", async (req, res) => {
  const { total, estado, modelo, cantidad, variaciones, material, subtotal } = req.body;

  // Validar que los datos obligatorios estén presentes
  if (!total || !estado || !modelo || !cantidad || !subtotal || !material) {
    return res.status(400).json({
      error: "Todos los campos son obligatorios, incluido el modelo, cantidad, y material.",
    });
  }

  try {
    // Crear el pedido
    const { data: pedido, error: pedidoError } = await supabase
      .from("pedidos")
      .insert([{ total, estado }])
      .select("id"); // Seleccionar el ID del nuevo pedido

    if (pedidoError) throw pedidoError;
    const pedidoId = pedido[0].id;

    // Crear el ítem asociado al pedido
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

    res.status(201).json({
      message: "Pedido y primer ítem creados correctamente.",
      pedidoId,
      item,
    });
  } catch (err) {
    console.error("Error al crear el pedido y el ítem:", err);
    res.status(500).json({ error: "Error al crear el pedido y el ítem." });
  }
});
// Actualizar ítem por ID
app.put("/api/items/:id", async (req, res) => {
  const { id } = req.params;  // ID del ítem a actualizar
  const { cantidad, material, variaciones } = req.body;

  // Verifica que al menos uno de los campos esté presente
  if (!cantidad && !material && !variaciones) {
    return res.status(400).json({
      error: "Debe proporcionar cantidad, material o variaciones para actualizar.",
    });
  }

  try {
    // Actualiza el ítem según los campos proporcionados
    const { data, error } = await supabase
      .from("items")
      .update({
        ...(cantidad && { cantidad }),
        ...(material && { material }),
        ...(variaciones && { variaciones }),
      })
      .eq("id", id)
      .select();

    if (error) throw error;

    if (!data || data.length === 0) {
      return res.status(404).json({ error: "Ítem no encontrado." });
    }

    // Actualiza el total del pedido después de modificar el ítem
    const { error: totalError } = await supabase.rpc("update_pedido_total", {
      pedido_id: data[0].pedido_id,
    });

    if (totalError) throw totalError;

    res.json({ message: "Ítem actualizado correctamente.", data });
  } catch (err) {
    console.error("Error al actualizar el ítem:", err.message);
    res.status(500).json({ error: "Error al actualizar el ítem." });
  }
});



// ================== Iniciar el servidor ==================
app.listen(PORT, () => {
  console.log(`Base de datos funcionando en el puerto: ${PORT}`);
});
