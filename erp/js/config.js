/* =====================================================================
   CONFIGURACIÓN DE CONEXIÓN CON SUPABASE
   Son datos públicos (la "anon key" está pensada para ir en el navegador).
   La seguridad la dan el login y las reglas de la base (Row Level Security).
   ¡Nunca pongas acá la "service_role key" ni la contraseña de la base!
   ===================================================================== */
window.SINAN_CONFIG = {
  supabaseUrl: 'PEGAR_ACA_PROJECT_URL',
  supabaseAnonKey: 'PEGAR_ACA_ANON_KEY'
};
