import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { createClient } from "@supabase/supabase-js";

const app = express();
const PORT = 5000;

// Configuración de Supabase
const SUPABASE_URL = "https://zbvvnhrrrdffwjvnxyuz.supabase.co";
const SUPABASE_KEY = "TU_SUPABASE_KEY";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Endpoints optimizados

// Obtener todos los pedidos con ítems
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

// Agregar un ítem a un pedido
app.post("/api/items", async (req, res) => {
  const { pedidoId, modelo, cantidad, variaciones, material, subtotal } = req.body;

  if (!pedidoId || !modelo || !cantidad || !material || !subtotal) {
    return res.status(400).json({
      error: "Todos los campos son obligatorios para crear un ítem.",
    });
  }

  try {
    const { data, error } = await supabase
      .from("items")
      .insert([{ pedido_id: pedidoId, modelo, cantidad, variaciones, material, subtotal }])
      .select("id");

    if (error) throw error;

    const { error: totalError } = await supabase.rpc("update_pedido_total", {
      pedido_id_param: pedidoId,
    });

    if (totalError) throw totalError;

    res.status(201).json({ message: "Ítem creado correctamente.", data });
  } catch (err) {
    console.error("Error al crear el ítem:", err.message);
    res.status(500).json({ error: "Error al crear el ítem." });
  }
});

// Actualizar estado del pedido o ítem
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
      .select();

    if (error) throw error;

    res.json({ message: `Pedido #${id} actualizado a estado ${estado}` });
  } catch (err) {
    console.error("Error al actualizar el pedido:", err.message);
    res.status(500).json({ error: "Error al actualizar el pedido." });
  }
});

// Actualizar ítem y recalcular total
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
      .select("pedido_id, cantidad, modelo");

    if (error) throw error;
    if (!data || data.length === 0) {
      return res.status(404).json({ error: "Ítem no encontrado." });
    }

    const pedidoId = data[0].pedido_id;
    const modelo = data[0].modelo;

    const modelosPrecios = {
      "Modelo 1 enconchado": 2.0,
      "Modelo 2 Filo fino": 2.0,
      "Modelo Ovalado": 2.0,
      "Modelo Navidad #1 arbol": 2.25,
      "Modelo Navidad #2 Hojas": 2.5,
      "Servilletas": 1.0,
    };

    const nuevoSubtotal = modelosPrecios[modelo] * cantidad;

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

// Eliminar un pedido
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

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Base de datos funcionando en el puerto: ${PORT}`);
});
