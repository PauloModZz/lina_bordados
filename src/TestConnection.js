import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zbvvnhrrrdffwjvnxyuz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpidnZuaHJycmRmZndqdm54eXV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM0NzU4NjIsImV4cCI6MjA0OTA1MTg2Mn0.2QvAtFoyn83RQq4I47OV11rLzeIYEFYmAJQ8sE_FOp8'; 

const supabase = createClient(supabaseUrl, supabaseKey);

// Prueba la conexión
(async () => {
  const { data, error } = await supabase.from('pedidos').select('*');
  if (error) {
    console.error('Error al consultar la base de datos:', error);
  } else {
    console.log('Pedidos:', data);
  }
})();
