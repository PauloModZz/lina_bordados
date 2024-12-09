import React, { useState, useEffect } from "react";
import Dashboard from "./Dashboard";
import NewOrderForm from "./NewOrderForm";
import Acciones from "./Acciones";
import Contabilidad from "./Contabilidad";
import "./GridLayout.css";
import DetallesAdicionales from "./DetallesAdicionales";

// URL base de la API
const API_URL = "https://lina-xc64.onrender.com";

const GridLayout = () => {
  const [orders, setOrders] = useState([]);

  // Función para cargar pedidos desde la API
  const fetchOrders = async () => {
    try {
      const response = await fetch(`${API_URL}/api/pedidos`);
      const data = await response.json();
      setOrders(data);
    } catch (error) {
      console.error("Error al cargar los pedidos:", error);
    }
  };

  // useEffect para cargar pedidos al montar el componente
  useEffect(() => {
    fetchOrders();
  }, []);

  // Función para manejar acciones desde el componente Acciones
  const handleActionApply = async (pedidoId, action) => {
    try {
      const response = await fetch(`${API_URL}/api/pedidos/${pedidoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: action }),
      });

      if (response.ok) {
        alert(`Pedido #${pedidoId} marcado como ${action}`);
        fetchOrders(); // Actualizar los pedidos después de aplicar la acción
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error}`);
      }
    } catch (error) {
      console.error("Error al aplicar acción:", error);
      alert("No se pudo aplicar la acción.");
    }
  };

  return (
    <div className="parent">
      {/* Div 1: Dashboard */}
      <div className="div1">
        <Dashboard orders={orders} />
      </div>

      {/* Div 2: New Order Form */}
      <div className="div2">
        <NewOrderForm />
      </div>

      {/* Div 3: Acciones */}
      <div className="div3">
        <Acciones orders={orders} onActionApply={handleActionApply} />
      </div>

      {/* Div 4: Contabilidad */}
      <div className="div4">
        <Contabilidad />
      </div>

      {/* Div 5: Detalles Adicionales */}
      <div className="div5">
        <DetallesAdicionales />
      </div>
    </div>
  );
};

export default GridLayout;
