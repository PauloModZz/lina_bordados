import React, { useState, useEffect } from "react";
import { toPng } from "html-to-image"; // Importar html-to-image
import "./Dashboard.css";

const Dashboard = () => {
  const [orders, setOrders] = useState([]); // Pedidos inicializados vacíos
  const [expandedOrders, setExpandedOrders] = useState([]); // Control de expansión

  // Función para cargar pedidos desde la API
  const fetchOrders = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/pedidos"); // URL de la API
      const data = await response.json();

      // Formatear la fecha para cada pedido
      const formattedOrders = data.map((order) => {
        const dateObj = new Date(order.fecha); // Convertir a objeto Date
        const optionsDate = { month: "2-digit", day: "2-digit", year: "numeric" };

        const formattedDate = new Intl.DateTimeFormat("en-US", optionsDate).format(dateObj);

        // Calcular el total dinámicamente sumando subtotales de los ítems
        const totalCalculated = order.items.reduce((sum, item) => sum + item.subtotal, 0);

        return {
          ...order,
          formattedDate,
          totalCalculated, // Total calculado dinámicamente
        };
      });

      setOrders(formattedOrders); // Actualizamos los pedidos con la fecha formateada
    } catch (error) {
      console.error("Error al cargar los pedidos:", error);
    }
  };

  // useEffect para cargar los pedidos al montar el componente y actualizarlos periódicamente
  useEffect(() => {
    fetchOrders(); // Cargar pedidos al montar

    // Configurar intervalo para actualizaciones automáticas
    const interval = setInterval(() => {
      fetchOrders();
    }, 5000); // Actualizar cada 5 segundos

    // Limpiar el intervalo al desmontar el componente
    return () => clearInterval(interval);
  }, []);

  // Función para alternar la expansión/minimización
  const toggleExpand = (id) => {
    setExpandedOrders((prevState) =>
      prevState.includes(id)
        ? prevState.filter((orderId) => orderId !== id)
        : [...prevState, id]
    );
  };

  // Manejar la edición de la cantidad en un ítem
  const handleEditQuantity = async (itemId, newQuantity) => {
    try {
      const response = await fetch(`http://localhost:5000/api/items/${itemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cantidad: newQuantity }),
      });

      if (response.ok) {
        alert("Cantidad actualizada correctamente.");
        fetchOrders(); // Recargar los pedidos después de la actualización
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error}`);
      }
    } catch (error) {
      console.error("Error al actualizar la cantidad:", error);
      alert("No se pudo actualizar la cantidad.");
    }
  };

  // Manejar la edición del material
  const handleEditMaterial = async (itemId, currentMaterial) => {
    const newMaterial = prompt("Introduce el nuevo material:", currentMaterial);
    if (!newMaterial) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/items/${itemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ material: newMaterial }),
      });

      if (response.ok) {
        alert("Material actualizado correctamente.");
        fetchOrders(); // Recargar los pedidos después de la actualización
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error}`);
      }
    } catch (error) {
      console.error("Error al actualizar el material:", error);
      alert("No se pudo actualizar el material.");
    }
  };

  // Manejar la edición de las variaciones en un ítem
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
      const response = await fetch(`http://localhost:5000/api/items/${itemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variaciones: formattedVariations }),
      });

      if (response.ok) {
        alert("Variaciones actualizadas correctamente.");
        fetchOrders(); // Recargar los pedidos después de la actualización
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error}`);
      }
    } catch (error) {
      console.error("Error al actualizar las variaciones:", error);
      alert("No se pudo actualizar las variaciones.");
    }
  };

  // Función para descargar la tabla como imagen
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

  // Función para obtener el símbolo/emoji según el estado
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
              <p>
                <strong>Fecha:</strong> {order.formattedDate}
              </p>
              <p>
                <strong>Total:</strong> ${order.totalCalculated.toFixed(2)}
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
                        onDoubleClick={() => handleEditMaterial(item.id, item.material)}
                      >
                        {item.material || "Sin material"}
                      </td>
                      <td
                        onDoubleClick={(e) => {
                          const newQuantity = prompt(
                            "Introduce la nueva cantidad:",
                            item.cantidad
                          );
                          if (
                            newQuantity &&
                            !isNaN(newQuantity) &&
                            parseInt(newQuantity, 10) > 0
                          ) {
                            handleEditQuantity(item.id, parseInt(newQuantity, 10));
                          } else if (newQuantity) {
                            alert("Por favor introduce un número válido.");
                          }
                        }}
                      >
                        {item.cantidad}
                      </td>
                      <td
                        onDoubleClick={() => handleEditVariations(item.id, item.variaciones)}
                      >
                        {item.variaciones}
                      </td>
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
