const mysql = require("mysql");

// Configuración de la conexión a la base de datos
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "admin", // Cambia esto si usas otra contraseña
  database: "bordados", // Asegúrate de que es tu base de datos
});

db.connect((err) => {
  if (err) {
    console.error("Error conectando al servidor MySQL:", err);
    return;
  }
  console.log("Conectado a la base de datos.");

  // Desactivar restricciones de claves foráneas
  db.query("SET FOREIGN_KEY_CHECKS = 0", (err) => {
    if (err) {
      console.error("Error desactivando claves foráneas:", err);
      return db.end();
    }

    // Vaciar la tabla `items`
    db.query("TRUNCATE TABLE items", (err) => {
      if (err) {
        console.error("Error vaciando la tabla 'items':", err);
        return db.end();
      }
      console.log("Datos eliminados de la tabla 'items'.");

      // Vaciar la tabla `pedidos`
      db.query("TRUNCATE TABLE pedidos", (err) => {
        if (err) {
          console.error("Error vaciando la tabla 'pedidos':", err);
          return db.end();
        }
        console.log("Datos eliminados de la tabla 'pedidos'.");

        // Reactivar restricciones de claves foráneas
        db.query("SET FOREIGN_KEY_CHECKS = 1", (err) => {
          if (err) {
            console.error("Error reactivando claves foráneas:", err);
            return db.end();
          }
          console.log("Restricciones de claves foráneas reactivadas.");
          db.end(); // Cerrar la conexión
        });
      });
    });
  });
});
