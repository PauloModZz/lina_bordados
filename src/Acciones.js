import React, { useState, useEffect } from "react";
import "./Acciones.css";

const Acciones = ({ onActionApply }) => {
  const [pedidos, setPedidos] = useState([]); // Lista de pedidos disponibles
  const [selectedPedido, setSelectedPedido] = useState(""); // Pedido seleccionado

  // Obtener los pedidos desde la API
  const fetchPedidos = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/pedidos");
      const data = await response.json();
      setPedidos(data);
    } catch (error) {
      console.error("Error al cargar los pedidos:", error);
    }
  };

  // useEffect para cargar los pedidos periódicamente
  useEffect(() => {
    fetchPedidos(); // Carga inicial

    // Configura un intervalo para actualizar los pedidos cada 5 segundos
    const interval = setInterval(() => {
      fetchPedidos();
    }, 5000);

    // Limpia el intervalo al desmontar el componente
    return () => clearInterval(interval);
  }, []);

  // Manejar acciones de cambio de estado
  const handleAction = async (action) => {
    if (!selectedPedido) {
      alert("Por favor selecciona un pedido para aplicar esta acción.");
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:5000/api/pedidos/${selectedPedido}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ estado: action }),
        }
      );

      if (response.ok) {
        alert(`Pedido #${selectedPedido} marcado como ${action}.`);
        fetchPedidos(); // Actualiza la lista después de aplicar la acción
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error}`);
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

    if (!window.confirm(`¿Estás seguro de que deseas eliminar el pedido #${selectedPedido}?`)) {
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:5000/api/pedidos/${selectedPedido}`,
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
              {pedido.nombre}
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
        <button onClick={() => handleAction("Pagado")}>Marcar como Pagado</button>
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
