import React, { useState, useEffect } from "react";
import "./DetallesAdicionales.css";

const DetallesAdicionales = () => {
  const [summary, setSummary] = useState({
    totalPendientes: 0,
    totalEntregados: 0,
    totalHechos: 0,
    totalPagados: 0,
    totalBordados: 0,
    bordadosHechos: 0,
  });

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/pedidos");
        const pedidos = await response.json();

        const totalPendientes = pedidos.filter((p) => p.estado === "Pendiente").length;
        const totalEntregados = pedidos.filter((p) => p.estado === "Entregado").length;
        const totalHechos = pedidos.filter((p) => p.estado === "Hecho").length;
        const totalPagados = pedidos.filter((p) => p.estado === "Pagado").length;

        let totalBordados = 0;
        let bordadosHechos = 0;

        pedidos.forEach((pedido) => {
          pedido.items.forEach((item) => {
            totalBordados += item.cantidad;
            if (pedido.estado === "Hecho") {
              bordadosHechos += item.cantidad;
            }
          });
        });

        setSummary({
          totalPendientes,
          totalEntregados,
          totalHechos,
          totalPagados,
          totalBordados,
          bordadosHechos,
        });
      } catch (error) {
        console.error("Error al cargar el resumen:", error);
      }
    };

    // Llamar a la función inmediatamente y luego establecer un intervalo
    fetchSummary();
    const interval = setInterval(fetchSummary, 5000); // Actualizar cada 5 segundos

    return () => clearInterval(interval); // Limpiar el intervalo al desmontar
  }, []);

  return (
    <div className="detalles-adicionales">
      <h2>Detalles Adicionales</h2>
      <div className="summary">
        <p><strong>Pedidos Pendientes:</strong> {summary.totalPendientes}</p>
        <p><strong>Pedidos Entregados:</strong> {summary.totalEntregados}</p>
        <p><strong>Pedidos Hechos:</strong> {summary.totalHechos}</p>
        <p><strong>Pedidos Pagados:</strong> {summary.totalPagados}</p>
        <p><strong>Total de Bordados:</strong> {summary.totalBordados}</p>
        <p><strong>Total de Bordados Hechos:</strong> {summary.bordadosHechos}</p>
      </div>
    </div>
  );
};

export default DetallesAdicionales;
