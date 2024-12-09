import React, { useState, useEffect } from "react";
import { toPng } from "html-to-image";
import "./Dashboard.css";

const API_URL = "https://lina-xc64.onrender.com";

const Dashboard = () => {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await fetch(`${API_URL}/api/pedidos`);
      const data = await response.json();

      const formattedOrders = data.map((order) => {
        const dateObj = new Date(order.fecha);
        const optionsDate = { month: "2-digit", day: "2-digit", year: "numeric" };
        const formattedDate = new Intl.DateTimeFormat("en-US", optionsDate).format(dateObj);

        const totalCalculated = order.items?.reduce(
          (sum, item) => sum + (item.subtotal || 0),
          0
        );

        return {
          ...order,
          formattedDate,
          totalCalculated: totalCalculated || 0,
        };
      });

      setOrders((prevOrders) =>
        formattedOrders.map((order) => {
          const prevOrder = prevOrders.find((o) => o.id === order.id);
          return { ...order, expanded: prevOrder ? prevOrder.expanded : false };
        })
      );
    } catch (error) {
      console.error("Error al cargar los pedidos:", error);
    }
  };

  const toggleExpand = (id) => {
    setOrders((prevOrders) =>
      prevOrders.map((order) =>
        order.id === id ? { ...order, expanded: !order.expanded } : order
      )
    );
  };

  // Actualizar campos desde el Dashboard
const handleEditField = async (itemId, field, currentValue, label) => {
  const newValue = prompt(`Introduce el nuevo ${label}:`, currentValue);

  if (!newValue || newValue.trim() === "") {
    alert(`${label} no puede estar vacío.`);
    return;
  }

  try {
    const response = await fetch(`${API_URL}/api/items/${itemId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: newValue.trim() }),
    });

    if (response.ok) {
      alert(`${label} actualizado correctamente.`);
      fetchOrders(); // Refrescar pedidos
    } else {
      const errorData = await response.json();
      alert(`Error al actualizar: ${errorData.error}`);
    }
  } catch (error) {
    console.error(`Error al actualizar el ${label}:`, error);
    alert(`No se pudo actualizar el ${label}.`);
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
      {orders.length === 0 ? (
        <p>No hay pedidos disponibles.</p>
      ) : (
        orders.map((order) => (
          <div key={order.id} className="order-container">
            <div className="order-header">
              <h3>
                Pedido #{order.id}{" "}
                <span className="order-status">
                  {getEmojiForStatus(order.estado)}
                </span>
              </h3>
              <div className="actions">
                <button
                  onClick={() => handleDownloadTable(order.id)}
                  style={{ marginRight: "10px" }}
                >
                  Descargar
                </button>
                <button onClick={() => toggleExpand(order.id)}>
                  {order.expanded ? "Minimizar" : "Maximizar"}
                </button>
              </div>
            </div>
            {order.expanded && (
              <div className="order-details scrollable-table">
                <p>
                  <strong>Fecha:</strong> {order.formattedDate}
                </p>
                <p>
                  <strong>Total:</strong> ${order.totalCalculated?.toFixed(2)}
                </p>
                <p>
                  <strong>Estado:</strong> {order.estado}
                </p>
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
                        <td
                          onDoubleClick={() =>
                            handleEditField(
                              item.id,
                              "material",
                              item.material,
                              "material"
                            )
                          }
                        >
                          {item.material || "Sin material"}
                        </td>
                        <td
                          onDoubleClick={() =>
                            handleEditField(
                              item.id,
                              "cantidad",
                              item.cantidad,
                              "cantidad"
                            )
                          }
                        >
                          {item.cantidad}
                        </td>
                        <td
                          onDoubleClick={() =>
                            handleEditField(
                              item.id,
                              "variaciones",
                              item.variaciones,
                              "variaciones"
                            )
                          }
                        >
                          {item.variaciones || "Sin variaciones"}
                        </td>
                        <td>${item.subtotal?.toFixed(2) || "0.00"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
};

export default Dashboard;
