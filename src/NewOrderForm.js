import React, { useState, useEffect } from "react";
import "./NewOrderForm.css";

const NewOrderForm = () => {
  const [formData, setFormData] = useState({
    model: "",
    quantity: 1,
    colors: {},
    material: "",
    customMaterial: "",
    pedidoId: "",
    nuevoPedido: false,
  });

  const [pedidos, setPedidos] = useState([]);

  const models = [
    { name: "Modelo 1 enconchado", price: 2, requiredColors: ["Filo"] },
    { name: "Modelo 2 Filo fino", price: 2, requiredColors: ["Filo"] },
    { name: "Modelo Ovalado", price: 2, requiredColors: ["Filo"] },
    { name: "Modelo Navidad #1 arbol", price: 2.25, requiredColors: ["Filo", "Arbol"] },
    { name: "Modelo Navidad #2 Hojas", price: 2.5, requiredColors: ["Filo", "Hoja", "Rosa"] },
    { name: "Servilletas", price: 1, requiredColors: ["Filo"] },
  ];

  const materials = ["Yute", "Yute Blanco", "Lino", "Sublimada (de playa)", "Otro"];

  const fetchPedidos = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/pedidos");
      const data = await response.json();
      setPedidos(data);
    } catch (error) {
      console.error("Error al cargar los pedidos:", error);
    }
  };

  useEffect(() => {
    fetchPedidos();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const fieldValue = type === "checkbox" ? checked : value;
    setFormData({ ...formData, [name]: fieldValue });
  };

  const handleColorChange = (key, value) => {
    setFormData((prev) => ({
      ...prev,
      colors: { ...prev.colors, [key]: value },
    }));
  };

  const formatColors = (colors) => {
    return Object.entries(colors)
      .map(([key, value]) => `${key}: ${value}`)
      .join(", ");
  };

  const getRequiredColors = () => {
    const selectedModel = models.find((model) => model.name === formData.model);
    return selectedModel ? selectedModel.requiredColors : [];
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.model || !formData.material) {
      alert("Por favor selecciona un modelo y un material.");
      return;
    }

    const selectedModel = models.find((model) => model.name === formData.model);
    const subtotal = selectedModel.price * formData.quantity;
    const materialToSave =
      formData.material === "Otro" ? formData.customMaterial : formData.material;

    // Verificar que se hayan especificado todos los colores requeridos
    const requiredColors = getRequiredColors();
    for (const key of requiredColors) {
      if (!formData.colors[key]) {
        alert(`Por favor especifica el color para ${key}.`);
        return;
      }
    }

    const formattedVariations = formatColors(formData.colors);

    // Procesar pedido
    if (formData.nuevoPedido) {
      try {
        const pedidoResponse = await fetch("http://localhost:5000/api/pedidos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            total: subtotal,
            estado: "Pendiente",
          }),
        });

        if (pedidoResponse.ok) {
          const pedido = await pedidoResponse.json();

          await fetch("http://localhost:5000/api/items", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              pedidoId: pedido.id,
              modelo: formData.model,
              cantidad: formData.quantity,
              variaciones: formattedVariations,
              material: materialToSave,
              subtotal,
            }),
          });

          alert("Pedido creado con el ítem agregado.");
          fetchPedidos();
        } else {
          const errorData = await pedidoResponse.json();
          alert(`Error: ${errorData.error}`);
        }
      } catch (error) {
        console.error("Error al crear el nuevo pedido:", error);
        alert("Error al crear el nuevo pedido.");
      }
    } else {
      if (!formData.pedidoId) {
        alert("Por favor selecciona un pedido.");
        return;
      }

      try {
        await fetch("http://localhost:5000/api/items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pedidoId: formData.pedidoId,
            modelo: formData.model,
            cantidad: formData.quantity,
            variaciones: formattedVariations,
            material: materialToSave,
            subtotal,
          }),
        });

        alert("Ítem agregado al pedido existente.");
        fetchPedidos();
      } catch (error) {
        console.error("Error al agregar el ítem:", error);
        alert("Error al agregar el ítem.");
      }
    }

    setFormData({
      model: "",
      quantity: 1,
      colors: {},
      material: "",
      customMaterial: "",
      pedidoId: "",
      nuevoPedido: false,
    });
  };

  return (
    <div className="new-order-form">
      <h2>Agregar Ítem o Crear Pedido</h2>
      <form onSubmit={handleSubmit}>
        <div className="inline-checkbox">
          <label>Crear un nuevo pedido</label>
          <input
            type="checkbox"
            name="nuevoPedido"
            checked={formData.nuevoPedido}
            onChange={handleChange}
          />
        </div>

        {!formData.nuevoPedido && (
          <label>
            Pedido:
            <select
              name="pedidoId"
              value={formData.pedidoId}
              onChange={handleChange}
              disabled={pedidos.length === 0}
            >
              <option value="">Selecciona un pedido</option>
              {pedidos.map((pedido) => (
                <option key={pedido.id} value={pedido.id}>
                  Pedido #{pedido.id}
                </option>
              ))}
            </select>
            {pedidos.length === 0 && <p>No hay pedidos activos.</p>}
          </label>
        )}

        <label>
          Modelo:
          <select name="model" value={formData.model} onChange={handleChange}>
            <option value="">Selecciona un modelo</option>
            {models.map((model, index) => (
              <option key={index} value={model.name}>
                {model.name} (${model.price.toFixed(2)})
              </option>
            ))}
          </select>
        </label>

        <label>
          Material:
          <select
            name="material"
            value={formData.material}
            onChange={handleChange}
          >
            <option value="">Selecciona un material</option>
            {materials.map((material, index) => (
              <option key={index} value={material}>
                {material}
              </option>
            ))}
          </select>
        </label>

        {formData.material === "Otro" && (
          <label>
            Ingresa el material personalizado:
            <input
              type="text"
              name="customMaterial"
              value={formData.customMaterial}
              onChange={handleChange}
            />
          </label>
        )}

        <label>
          Cantidad:
          <input
            type="number"
            name="quantity"
            value={formData.quantity}
            min="1"
            onChange={handleChange}
          />
        </label>

        {getRequiredColors().length > 0 && (
          <div>
            <p>Especifica los colores requeridos:</p>
            {getRequiredColors().map((key, index) => (
              <label key={index}>
                {key}:
                <input
                  type="text"
                  value={formData.colors[key] || ""}
                  onChange={(e) => handleColorChange(key, e.target.value)}
                />
              </label>
            ))}
          </div>
        )}

        <button type="submit">
          {formData.nuevoPedido ? "Crear Pedido y Agregar Ítem" : "Agregar Ítem"}
        </button>
      </form>
    </div>
  );
};

export default NewOrderForm;
