import React, { useState, useEffect } from "react";
import "./Acciones.css";

const API_URL = "https://lina-xc64.onrender.com";

const Acciones = ({ onActionApply }) => {
  const [pedidos, setPedidos] = useState([]); // Lista de pedidos disponibles
  const [selectedPedido, setSelectedPedido] = useState(""); // Pedido seleccionado

  // Obtener los pedidos desde la API
  const fetchPedidos = async () => {
    try {
      const response = await fetch(`${API_URL}/api/pedidos`);
      const data = await response.json();

      // Ordenar pedidos por ID para mantener el orden consistente
      const sortedPedidos = data.sort((a, b) => a.id - b.id);
      setPedidos(sortedPedidos);
    } catch (error) {
      console.error("Error al cargar los pedidos:", error);
    }
  };

  // useEffect para cargar los pedidos periódicamente
  useEffect(() => {
    fetchPedidos(); // Carga inicial

    const interval = setInterval(() => {
      fetchPedidos(); // Actualiza los pedidos cada 3 segundos
    }, 3000);

    return () => clearInterval(interval); // Limpia el intervalo al desmontar el componente
  }, []);

  // Manejar acciones de cambio de estado
  const handleAction = async (action) => {
    if (!selectedPedido) {
      alert("Por favor selecciona un pedido para aplicar esta acción.");
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/api/pedidos/${selectedPedido}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ estado: action }),
        }
      );

      if (response.ok) {
        const responseData = await response.json();
        if (responseData.message) {
          alert(responseData.message);
        } else {
          alert(`Pedido #${selectedPedido} marcado como ${action}.`);
        }
        fetchPedidos(); // Actualiza la lista después de aplicar la acción
      } else {
        const errorData = await response.json();
        alert(
          `Error: ${
            errorData.error || "Error desconocido al actualizar el pedido."
          }`
        );
      }
    } catch (error) {
      console.error("Error al aplicar la acción:", error);
      alert("No se pudo completar la acción.");
    }
  };

  // Manejar eliminación de un pedido
  const handleDelete = async () => {
    if (!selectedPedido) {
      alert("Por favor selecciona un pedido para eliminar.");
      return;
    }

    if (
      !window.confirm(
        `¿Estás seguro de que deseas eliminar el pedido #${selectedPedido}?`
      )
    ) {
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/api/pedidos/${selectedPedido}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        alert(`Pedido #${selectedPedido} eliminado correctamente.`);
        fetchPedidos(); // Actualiza la lista después de eliminar
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error}`);
      }
    } catch (error) {
      console.error("Error al eliminar el pedido:", error);
      alert("No se pudo eliminar el pedido.");
    }
  };

  return (
    <div className="acciones">
      <h2>Acciones</h2>

      {/* Seleccionar Pedido */}
      <div>
        <select
          value={selectedPedido}
          onChange={(e) => setSelectedPedido(e.target.value)}
        >
          <option value="">Selecciona un Pedido</option>
          {pedidos.map((pedido) => (
            <option key={pedido.id} value={pedido.id}>
              Pedido #{pedido.id}
            </option>
          ))}
        </select>
      </div>

      {/* Botones de Acciones */}
      <div className="action-buttons">
        <button onClick={() => handleAction("Hecho")}>Marcar como Hecho</button>
        <button onClick={() => handleAction("Entregado")}>
          Marcar como Entregado
        </button>
        <button onClick={() => handleAction("Pagado")}>
          Marcar como Pagado
        </button>
        <button
          onClick={handleDelete}
          style={{
            backgroundColor: "#ff6666", // Rojo más claro
            color: "white",
          }}
        >
          Eliminar Pedido
        </button>
      </div>
    </div>
  );
};

export default Acciones;
