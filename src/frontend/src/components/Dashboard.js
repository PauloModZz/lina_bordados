import React, { useState, useEffect } from "react";
import { toPng } from "html-to-image"; // Importar html-to-image
import "./Dashboard.css";

// URL del servidor en Render
const API_URL = "https://lina-xc64.onrender.com";

const Dashboard = () => {
  const [orders, setOrders] = useState([]); 
  const [expandedOrders, setExpandedOrders] = useState([]); 

  // Función para cargar pedidos desde la API
  const fetchOrders = async () => {
    try {
      const response = await fetch(`${API_URL}/api/pedidos`);
      const data = await response.json();

      // Formatear la fecha para cada pedido
      const formattedOrders = data.map((order) => {
        const dateObj = new Date(order.fecha); 
        const optionsDate = { month: "2-digit", day: "2-digit", year: "numeric" };
        const formattedDate = new Intl.DateTimeFormat("en-US", optionsDate).format(dateObj);
        const totalCalculated = order.items.reduce((sum, item) => sum + item.subtotal, 0);

        return {
          ...order,
          formattedDate,
          totalCalculated, 
        };
      });

      setOrders(formattedOrders); 
    } catch (error) {
      console.error("Error al cargar los pedidos:", error);
    }
  };

  useEffect(() => {
    fetchOrders(); 
    const interval = setInterval(() => {
      fetchOrders();
    }, 5000); 
    return () => clearInterval(interval);
  }, []);

  const toggleExpand = (id) => {
    setExpandedOrders((prevState) =>
      prevState.includes(id)
        ? prevState.filter((orderId) => orderId !== id)
        : [...prevState, id]
    );
  };

  const handleEditQuantity = async (itemId, newQuantity) => {
    try {
      const response = await fetch(`${API_URL}/api/items/${itemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cantidad: newQuantity }),
      });

      if (response.ok) {
        alert("Cantidad actualizada correctamente.");
        fetchOrders(); 
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error}`);
      }
    } catch (error) {
      console.error("Error al actualizar la cantidad:", error);
      alert("No se pudo actualizar la cantidad.");
    }
  };

  const handleEditMaterial = async (itemId, currentMaterial) => {
    const newMaterial = prompt("Introduce el nuevo material:", currentMaterial);
    if (!newMaterial) return;

    try {
      const response = await fetch(`${API_URL}/api/items/${itemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ material: newMaterial }),
      });

      if (response.ok) {
        alert("Material actualizado correctamente.");
        fetchOrders(); 
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error}`);
      }
    } catch (error) {
      console.error("Error al actualizar el material:", error);
      alert("No se pudo actualizar el material.");
    }
  };

  const handleEditVariations = async (itemId, currentVariations) => {
    const variationsArray = currentVariations.split(", ").map((variation) => {
      const [label, color] = variation.split(": ");
      return { label, color };
    });

    const newVariations = variationsArray.map((variation) => {
      const newColor = prompt(`Introduce el color para ${variation.label}:`, variation.color);
      return `${variation.label}: ${newColor || variation.color}`;
    });

    const formattedVariations = newVariations.join(", ");

    try {
      const response = await fetch(`${API_URL}/api/items/${itemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variaciones: formattedVariations }),
      });

      if (response.ok) {
        alert("Variaciones actualizadas correctamente.");
        fetchOrders(); 
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error}`);
      }
    } catch (error) {
      console.error("Error al actualizar las variaciones:", error);
      alert("No se pudo actualizar las variaciones.");
    }
  };

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

  const getEmojiForStatus = (estado) => {
    switch (estado) {
      case "Pendiente":
        return "❌";
      case "Hecho":
        return "✅";
      case "Entregado":
        return "✅🚚";
      case "Pagado":
        return "✅🚚💲";
      default:
        return "";
    }
  };

  return (
    <div className="dashboard">
      <h2>Pedidos</h2>
      {orders.map((order) => (
        <div key={order.id} className="order-container">
          <div className="order-header">
            <h3>
              Pedido #{order.id} <span className="order-status">{getEmojiForStatus(order.estado)}</span>
            </h3>
            <div className="actions">
              <button onClick={() => handleDownloadTable(order.id)} style={{ marginRight: "10px" }}>
                Descargar
              </button>
              <button onClick={() => toggleExpand(order.id)}>
                {expandedOrders.includes(order.id) ? "Minimizar" : "Maximizar"}
              </button>
            </div>
          </div>
          {expandedOrders.includes(order.id) && (
            <div className="order-details scrollable-table">
              <p><strong>Fecha:</strong> {order.formattedDate}</p>
              <p><strong>Total:</strong> ${order.totalCalculated.toFixed(2)}</p>
              <p><strong>Estado:</strong> {order.estado}</p>
              <table id={`table-${order.id}`}>
                <thead>
                  <tr>
                    <th>Modelo</th>
                    <th>Material</th>
                    <th>Cantidad</th>
                    <th>Variaciones</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.modelo}</td>
                      <td onDoubleClick={() => handleEditMaterial(item.id, item.material)}>{item.material || "Sin material"}</td>
                      <td onDoubleClick={() => handleEditQuantity(item.id, parseInt(prompt("Nueva cantidad:", item.cantidad), 10))}>{item.cantidad}</td>
                      <td onDoubleClick={() => handleEditVariations(item.id, item.variaciones)}>{item.variaciones}</td>
                      <td>${item.subtotal.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default Dashboard;
