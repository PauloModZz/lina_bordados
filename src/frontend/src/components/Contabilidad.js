import React, { useState, useEffect } from "react";
import jsPDF from "jspdf";
import "jspdf-autotable";
import "./Contabilidad.css";

// URL base de la API
const API_URL = "https://lina-xc64.onrender.com";

const Contabilidad = () => {
  const [orders, setOrders] = useState([]);
  const [totalAmount, setTotalAmount] = useState(0);

  // Cargar todos los pedidos desde la API
  const fetchOrders = async () => {
    try {
      const response = await fetch(`${API_URL}/api/pedidos`);
      const data = await response.json();
      setOrders(data);

      // Calcular el monto total sumando los subtotales de todos los ítems
      const total = data.reduce((sum, order) => {
        const orderTotal = order.items.reduce((itemSum, item) => itemSum + item.subtotal, 0);
        return sum + orderTotal;
      }, 0);

      setTotalAmount(total);
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

  // Función para generar y descargar el PDF
  const generatePDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("AlburqTex", 105, 20, null, null, "center"); // Título centrado

    let yOffset = 30; // Posición inicial para las tablas

    orders.forEach((order) => {
      doc.setFontSize(14);
      doc.text(`Pedido #${order.id} - Estado: ${order.estado}`, 14, yOffset);

      const itemsData = order.items.map((item) => [
        item.modelo,
        item.cantidad,
        item.variaciones || "-",
        `$${item.subtotal.toFixed(2)}`,
      ]);

      const orderTotal = order.items.reduce((sum, item) => sum + item.subtotal, 0);

      doc.autoTable({
        startY: yOffset + 5,
        head: [["Modelo", "Cantidad", "Variaciones", "Subtotal"]],
        body: itemsData,
        theme: "grid", // Tema de la tabla
        styles: {
          fillColor: [220, 220, 220], // Fondo en escala de grises
          textColor: 0, // Texto en negro
          fontStyle: "bold", // Texto en negrita
        },
        headStyles: {
          fillColor: [160, 160, 160], // Fondo del encabezado más oscuro
          textColor: 0, // Texto en negro
          fontStyle: "bold", // Texto en negrita
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245], // Fondo alternado en gris claro
        },
      });

      // Mostrar total del pedido debajo de la tabla
      yOffset = doc.previousAutoTable.finalY + 5;
      doc.setFontSize(12);
      doc.text(`Total del Pedido: $${orderTotal.toFixed(2)}`, 14, yOffset);

      // Ajustar posición para la siguiente tabla
      yOffset += 10;
    });

    // Agregar un resumen al final del documento
    doc.setFontSize(14);
    doc.text(`Resumen General`, 14, yOffset + 10);
    doc.text(`Total de Pedidos: ${orders.length}`, 14, yOffset + 20);
    doc.text(`Monto Total General: $${totalAmount.toFixed(2)}`, 14, yOffset + 30);

    // Descargar el PDF
    doc.save("informe_contabilidad.pdf");
  };

  return (
    <div className="contabilidad">
      <h2>Contabilidad</h2>
      <p>
        <strong>Total de Pedidos:</strong> {orders.length}
      </p>
      <p>
        <strong>Monto Total General:</strong> ${totalAmount.toFixed(2)}
      </p>
      <button onClick={generatePDF}>Descargar Informe en PDF</button>
    </div>
  );
};

export default Contabilidad;
