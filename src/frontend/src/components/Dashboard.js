import React, { useState, useEffect } from "react";
import { toPng } from "html-to-image";
import "./Dashboard.css";

const API_URL = "https://lina-xc64.onrender.com";

const Dashboard = () => {
  const [orders, setOrders] = useState([]);

  // Cargar pedidos
  const fetchOrders = async () => {
    try {
      const response = await fetch(`${API_URL}/api/pedidos`);
      const data = await response.json();

      const formattedOrders = data
        .map((order) => {
          const dateObj = new Date(order.fecha);
          const optionsDate = { month: "2-digit", day: "2-digit", year: "numeric" };
          const formattedDate = new Intl.DateTimeFormat("en-US", optionsDate).format(dateObj);
          const totalCalculated = order.items.reduce((sum, item) => sum + item.subtotal, 0);

          return {
            ...order,
            formattedDate,
            totalCalculated,
          };
        })
        .sort((a, b) => a.id - b.id);

      setOrders(formattedOrders);
    } catch (error) {
      console.error("Error al cargar los pedidos:", error);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
  }, []);

  // Función para actualizar el pedido después de editar
  const updateOrderTotal = async (pedidoId) => {
    try {
      const response = await fetch(`${API_URL}/api/pedidos/${pedidoId}`);
      const updatedOrder = await response.json();

      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order.id === updatedOrder.id ? updatedOrder : order
        )
      );
    } catch (error) {
      console.error("Error al actualizar el pedido:", error);
    }
  };

  // Editar cantidad
  const handleEditQuantity = async (itemId, currentQuantity, pedidoId) => {
    const newQuantity = parseInt(prompt("Introduce la nueva cantidad:", currentQuantity), 10);
    if (isNaN(newQuantity) || newQuantity <= 0) {
      alert("La cantidad debe ser un número válido mayor a 0.");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/items/${itemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cantidad: newQuantity }),
      });

      if (response.ok) {
        alert("Cantidad actualizada correctamente.");
        await updateOrderTotal(pedidoId);
      } else {
        const errorData = await response.json();
        alert(`Error al actualizar: ${errorData.error}`);
      }
    } catch (error) {
      console.error("Error al actualizar la cantidad:", error);
      alert("No se pudo actualizar la cantidad.");
    }
  };

  // Editar material
  const handleEditMaterial = async (itemId, currentMaterial, pedidoId) => {
    const newMaterial = prompt("Introduce el nuevo material:", currentMaterial);
    if (!newMaterial || newMaterial.trim() === "") {
      alert("El material no puede estar vacío.");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/items/${itemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ material: newMaterial.trim() }),
      });

      if (response.ok) {
        alert("Material actualizado correctamente.");
        await updateOrderTotal(pedidoId);
      } else {
        const errorData = await response.json();
        alert(`Error al actualizar: ${errorData.error}`);
      }
    } catch (error) {
      console.error("Error al actualizar el material:", error);
      alert("No se pudo actualizar el material.");
    }
  };

  // Descargar tabla
  const handleDownloadTable = (orderId) => {
    const tableElement = document.getElementById(`table-${orderId}`);
    if (tableElement) {
      toPng(tableElement)
        .then((dataUrl) => {
          const link = document.createElement("a");
          link.download = `pedido_${orderId}.png`;
          link.href = dataUrl;
          link.click();
        })
        .catch((error) => {
          console.error("Error al descargar la tabla:", error);
        });
    }
  };

  return (
    <div className="dashboard">
      <h2>Pedidos</h2>
      {orders.map((order) => (
        <div key={order.id} className="order-container">
          <div className="order-header">
            <h3>Pedido #{order.id}</h3>
            <div className="actions">
              <button onClick={() => handleDownloadTable(order.id)} style={{ marginRight: "10px" }}>
                Descargar
              </button>
              <button onClick={() => updateOrderTotal(order.id)}>
                Actualizar Total
              </button>
            </div>
          </div>
          <div className="order-details">
            <p><strong>Fecha:</strong> {order.formattedDate}</p>
            <p><strong>Total:</strong> ${order.totalCalculated.toFixed(2)}</p>
            <table id={`table-${order.id}`}>
              <thead>
                <tr>
                  <th>Modelo</th>
                  <th>Material</th>
                  <th>Cantidad</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.modelo}</td>
                    <td
                      onDoubleClick={() => handleEditMaterial(item.id, item.material, order.id)}
                    >
                      {item.material}
                    </td>
                    <td
                      onDoubleClick={() => handleEditQuantity(item.id, item.cantidad, order.id)}
                    >
                      {item.cantidad}
                    </td>
                    <td>${item.subtotal.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Dashboard;
