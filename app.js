// ==========================================
// 1. CONFIGURACIÓN DE SUPABASE
// ==========================================
const SUPABASE_URL = "https://rvgvpzcosqzwidfgnrwv.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2Z3ZwemNvc3F6d2lkZmducnd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2MTEzNTUsImV4cCI6MjEwODE4NzM1NX0.kaZgAD1yAh0XTviRrOwVkEkl9UqQyVHay9ORy1f91-8";

// Usamos el objeto global 'supabase' del CDN y lo llamamos 'db' para evitar conflictos
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
});

// ==========================================
// 2. ESTADO GLOBAL Y ELEMENTOS DEL DOM
// ==========================================
const estado = {
  preguntas: [],
  ciudadId: null,
  respuestas: {},
  vistaActual: 'ciudad'
};

const DOM = {
  pasoCiudad: document.getElementById("paso-ciudad"),
  pasoPreguntas: document.getElementById("paso-preguntas"),
  pasoResultados: document.getElementById("paso-resultados"),
  selectDepto: document.getElementById("select-departamento"),
  selectCiudad: document.getElementById("select-ciudad"),
  btnEmpezar: document.getElementById("btn-empezar"),
  contenedorPreguntas: document.getElementById("contenedor-preguntas"),
  btnEnviar: document.getElementById("btn-enviar"),
  msgEnvio: document.getElementById("mensaje-envio"),
  selectPreguntaRes: document.getElementById("select-pregunta-resultado"),
  tablaResultados: document.getElementById("tabla-resultados"),
  tabs: document.querySelectorAll(".tab")
};

// ==========================================
// 3. INICIALIZACIÓN
// ==========================================
async function iniciarApp() {
  console.log("🚀 Iniciando Ideota...");
  try {
    await cargarDepartamentos();
    await cargarPreguntas();
    configurarEventos();
    console.log("✅ App lista.");
  } catch (error) {
    console.error("❌ Error crítico al iniciar:", error);
  }
}

// ==========================================
// 4. FUNCIONES DE CARGA DE DATOS
// ==========================================
async function cargarDepartamentos() {
  console.log("📡 Cargando departamentos...");
  const { data, error } = await db.from("departamento").select("id, nombre").order("nombre");
  
  if (error) {
    console.error("Error cargando departamentos:", error);
    DOM.selectDepto.innerHTML = '<option value="">Error al cargar</option>';
    return;
  }
  
  let html = '<option value="">Selecciona un departamento</option>';
  data.forEach(dep => {
    html += `<option value="${dep.id}">${dep.nombre}</option>`;
  });
  DOM.selectDepto.innerHTML = html;
}

async function cargarPreguntas() {
  console.log("📡 Cargando preguntas...");
  const { data, error } = await db.from("pregunta").select("id, texto, tipo").eq("activa", true).order("id");
  
  if (error) {
    console.error("Error cargando preguntas:", error);
    return;
  }
  
  estado.preguntas = data;
  
  let html = '';
  data.forEach(p => {
    html += `<option value="${p.id}">${p.texto}</option>`;
  });
  DOM.selectPreguntaRes.innerHTML = html;
}

// ==========================================
// 5. EVENTOS (CLICS Y SELECTORES)
// ==========================================
function configurarEventos() {
  DOM.selectDepto.addEventListener("change", async (e) => {
    const depId = e.target.value;
    if (!depId) {
      DOM.selectCiudad.disabled = true;
      DOM.selectCiudad.innerHTML = '<option value="">Primero elige un departamento</option>';
      DOM.btnEmpezar.disabled = true;
      return;
    }

    DOM.selectCiudad.innerHTML = '<option value="">Cargando...</option>';
    DOM.selectCiudad.disabled = true;

    const { data, error } = await db.from("ciudad").select("id, nombre").eq("departamento_id", depId).order("nombre");
    
    if (error) {
      console.error("Error cargando ciudades:", error);
      return;
    }

    let html = '<option value="">Selecciona una ciudad</option>';
    data.forEach(ciudad => {
      html += `<option value="${ciudad.id}">${ciudad.nombre}</option>`;
    });
    DOM.selectCiudad.innerHTML = html;
    DOM.selectCiudad.disabled = false;
  });

  DOM.selectCiudad.addEventListener("change", (e) => {
    estado.ciudadId = e.target.value;
    DOM.btnEmpezar.disabled = !estado.ciudadId;
  });

  DOM.btnEmpezar.addEventListener("click", () => {
    if (!estado.ciudadId) return;
    DOM.pasoCiudad.classList.add("hidden");
    DOM.pasoPreguntas.classList.remove("hidden");
    renderizarPreguntas();
  });

  DOM.btnEnviar.addEventListener("click", enviarRespuestas);

  DOM.tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      DOM.tabs.forEach(t => t.classList.remove("activo"));
      tab.classList.add("activo");
      estado.vistaActual = tab.dataset.vista;
      cargarResultados();
    });
  });

  DOM.selectPreguntaRes.addEventListener("change", cargarResultados);
}

// ==========================================
// 6. RENDERIZAR Y ENVIAR PREGUNTAS
// ==========================================
function renderizarPreguntas() {
  let html = '';
  estado.respuestas = {}; 

  // Función para agrupar y asignar color/ícono según palabras clave
  const obtenerCategoria = (texto) => {
    const t = texto.toLowerCase();
    if (t.includes('clima') || t.includes('calor') || t.includes('frío') || t.includes('zonas verdes') || t.includes('caminando')) 
      return { clase: 'cat-clima', icono: '🌤️' };
    if (t.includes('transporte') || t.includes('tarifas') || t.includes('bicicleta') || t.includes('peatones') || t.includes('desplazarse')) 
      return { clase: 'cat-transporte', icono: '🚌' };
    if (t.includes('animada') || t.includes('cultura') || t.includes('ocio') || t.includes('orgullo') || t.includes('ideal para vivir') || t.includes('recomendarías')) 
      return { clase: 'cat-vibra', icono: '✨' };
    return { clase: 'cat-calidad', icono: '🏙️' }; 
  };

  estado.preguntas.forEach(p => {
    const cat = obtenerCategoria(p.texto);
    
    // Todas nuestras preguntas nuevas son de escala 1-5
    const opciones = p.tipo === 'si_no' 
      ? [{v: 1, t: 'Sí'}, {v: 0, t: 'No'}]
      : [1, 2, 3, 4, 5].map(n => ({v: n, t: n.toString()}));

    html += `
      <div class="pregunta ${cat.clase}" data-id="${p.id}">
        <p><span class="icono-pregunta">${cat.icono}</span> ${p.texto}</p>
        <div class="opciones">
          ${opciones.map(o => `<div class="opcion" data-valor="${o.v}">${o.t}</div>`).join('')}
        </div>
      </div>
    `;
  });

  DOM.contenedorPreguntas.innerHTML = html;

  DOM.contenedorPreguntas.querySelectorAll('.pregunta').forEach(bloque => {
    const pId = bloque.dataset.id;
    bloque.querySelectorAll('.opcion').forEach(opcion => {
      opcion.addEventListener('click', () => {
        bloque.querySelectorAll('.opcion').forEach(o => o.classList.remove('seleccionada'));
        opcion.classList.add('seleccionada');
        estado.respuestas[pId] = parseInt(opcion.dataset.valor);
      });
    });
  });
}

async function enviarRespuestas() {
  const faltantes = estado.preguntas.filter(p => !(p.id in estado.respuestas));
  if (faltantes.length > 0) {
    DOM.msgEnvio.textContent = `Te faltan ${faltantes.length} preguntas.`;
    DOM.msgEnvio.classList.add("error");
    return;
  }

  DOM.btnEnviar.disabled = true;
  DOM.msgEnvio.textContent = "Enviando...";
  DOM.msgEnvio.classList.remove("error");

  const filas = estado.preguntas.map(p => ({
    pregunta_id: parseInt(p.id),
    ciudad_id: parseInt(estado.ciudadId),
    valor: estado.respuestas[p.id]
  }));

  const { error } = await db.from("respuesta").insert(filas);

  if (error) {
    console.error("Error al insertar:", error);
    DOM.msgEnvio.textContent = "Error al enviar. Revisa la consola.";
    DOM.msgEnvio.classList.add("error");
    DOM.btnEnviar.disabled = false;
    return;
  }

  DOM.msgEnvio.textContent = "¡Enviado con éxito!";
  setTimeout(() => {
    DOM.pasoPreguntas.classList.add("hidden");
    DOM.pasoResultados.classList.remove("hidden");
    cargarResultados();
  }, 1000);
}

// ==========================================
// 7. CARGAR RESULTADOS (PROMEDIOS)
// ==========================================
async function cargarResultados() {
  const preguntaId = DOM.selectPreguntaRes.value;
  if (!preguntaId) return;

  DOM.tablaResultados.innerHTML = "<p>Cargando resultados...</p>";

  const funcionRPC = estado.vistaActual === 'ciudad' ? 'promedio_por_ciudad' : 'promedio_por_departamento';
  
  const { data, error } = await db.rpc(funcionRPC, { p_pregunta_id: parseInt(preguntaId) });

  if (error) {
    console.error("Error en RPC:", error);
    DOM.tablaResultados.innerHTML = "<p>Error al cargar promedios.</p>";
    return;
  }

  if (!data || data.length === 0) {
    DOM.tablaResultados.innerHTML = "<p>Aún no hay respuestas para esta pregunta.</p>";
    return;
  }

  let html = '<table><thead><tr>';
  if (estado.vistaActual === 'ciudad') {
    html += '<th>Ciudad</th><th>Departamento</th><th>Promedio</th><th>Votos</th>';
  } else {
    html += '<th>Departamento</th><th>Promedio</th><th>Votos</th>';
  }
  html += '</tr></thead><tbody>';

  data.forEach(row => {
    html += '<tr>';
    if (estado.vistaActual === 'ciudad') {
      html += `<td>${row.ciudad}</td><td>${row.departamento}</td><td><b class="promedio">${row.promedio}</b></td><td>${row.votos}</td>`;
    } else {
      html += `<td>${row.departamento}</td><td><b class="promedio">${row.promedio}</b></td><td>${row.votos}</td>`;
    }
    html += '</tr>';
  });
  
  html += '</tbody></table>';
  DOM.tablaResultados.innerHTML = html;
}

// ==========================================
// 8. ARRANCAR
// ==========================================
iniciarApp();
