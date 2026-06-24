/**
 * INKCONTROL PRO - Core de Negocio y Lógica de Gestión Interna
 * Arquitectura de Datos Segura en LocalStorage (Sin Servidor / Uso Privado)
 */

// --- DATOS DE MUESTRA E INICIALIZACIÓN DEESTRUCTURAS ---
const DEFAULT_GASTOS_FIJOS = [
    { id: "fijo-1", concepto: "Alquiler del Local / Estudio", importe: 850 },
    { id: "fijo-2", concepto: "Autónomo, Gestoría y Seguros RC", importe: 420 },
    { id: "fijo-3", concepto: "Suministros (Luz, Agua, Internet, Residuos)", importe: 180 }
];

const DEFAULT_MATERIALES = [
    { id: "mat-1", nombre: "Agujas / Cartuchos (Caja de 20)", precioPack: 45, unidadesPack: 20, usoEstimado: 3, costeUso: 6.75 },
    { id: "mat-2", nombre: "Tintas Homologadas (Set básico)", precioPack: 120, unidadesPack: 50, usoEstimado: 1, costeUso: 2.40 },
    { id: "mat-3", nombre: "Grip, Campos, Film y Desinfectantes", precioPack: 35, unidadesPack: 30, usoEstimado: 1, costeUso: 1.17 }
];

const DEFAULT_TATUADORES = [
    { id: "tat-1", nombre: "Tatuador Residente (A Comisión)", tipo: "comision", comision: 40, fijo: 0 },
    { id: "tat-2", font: "Propio / Dueño del Estudio", tipo: "comision", comision: 0, fijo: 0 }
];

const DEFAULT_TRABAJOS = [
    { 
        id: "job-1", 
        cliente: "Carlos Mendoza (Brazo Completo - Línea)", 
        tatuadorId: "tat-1", 
        horas: 4, 
        materialesUsados: ["mat-1", "mat-2", "mat-3"], 
        precioCobrado: 450, 
        metodoPago: "tarjeta", 
        consentimiento: true,
        fecha: new Date().toISOString()
    }
];

const DEFAULT_OBJETIVOS = [
    { id: "obj-1", nombre: "Colchón de Seguridad (3 meses de gastos fijos)", meta: 4350 },
    { id: "obj-2", nombre: "Inversión: Autoclave Clase B Médico", meta: 1200 }
];

// Estado global de la aplicación cargado desde LocalStorage
let appState = {
    gastosFijos: JSON.parse(localStorage.getItem("ic_gastos_fijos")) || DEFAULT_GASTOS_FIJOS,
    materiales: JSON.parse(localStorage.getItem("ic_materiales")) || DEFAULT_MATERIALES,
    tatuadores: JSON.parse(localStorage.getItem("ic_tatuadores")) || DEFAULT_TATUADORES,
    trabajos: JSON.parse(localStorage.getItem("ic_trabajos")) || DEFAULT_TRABAJOS,
    objetivos: JSON.parse(localStorage.getItem("ic_objetivos")) || DEFAULT_OBJETIVOS,
    horasOperativasMes: parseInt(localStorage.getItem("ic_horas_mes")) || 120
};

let mainChart = null;

// --- INICIALIZADOR DE LA APLICACIÓN ---
document.addEventListener("DOMContentLoaded", () => {
    initNavigation();
    initConfigUI();
    renderAll();
    
    // Escuchador para restaurar la base de datos limpia
    document.getElementById("reset-data-btn").addEventListener("click", () => {
        if(confirm("¿Seguro que deseas reiniciar el sistema? Se borrarán todos los registros reales.")) {
            localStorage.clear();
            location.reload();
        }
    });
});

function saveState() {
    localStorage.setItem("ic_gastos_fijos", JSON.stringify(appState.gastosFijos));
    localStorage.setItem("ic_materiales", JSON.stringify(appState.materiales));
    localStorage.setItem("ic_tatuadores", JSON.stringify(appState.tatuadores));
    localStorage.setItem("ic_trabajos", JSON.stringify(appState.trabajos));
    localStorage.setItem("ic_objetivos", JSON.stringify(appState.objetivos));
    localStorage.setItem("ic_horas_mes", appState.horasOperativasMes.toString());
    renderAll();
}

// --- NAVEGACIÓN ENTRE PESTAÑAS (ESTILO PWA) ---
function initNavigation() {
    document.querySelectorAll(".bottom-nav .tab-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const targetTab = e.currentTarget.getAttribute("data-tab");
            
            document.querySelectorAll(".bottom-nav .tab-btn").forEach(b => b.classList.remove("active"));
            document.querySelectorAll(".tab-content").forEach(tc => tc.classList.remove("active"));
            
            e.currentTarget.classList.add("active");
            document.getElementById(targetTab).classList.add("active");
        });
    });
}

function initConfigUI() {
    document.getElementById("config-horas-mes").value = appState.horasOperativasMes;
}

function guardarConfiguracion() {
    const val = parseInt(document.getElementById("config-horas-mes").value);
    if(val && val > 0) {
        appState.horasOperativasMes = val;
        saveState();
        alert("Capacidad operativa actualizada correctamente.");
    }
}

// --- RENDERIZADO GENERAL DEL SISTEMA ---
function renderAll() {
    calcularKPIs();
    renderGastosFijos();
    renderMateriales();
    renderTatuadores();
    renderTrabajos();
    renderObjetivos();
    actualizarSelectsTrabajo();
    actualizarGrafico();
}

// --- MÓDULO MATEMÁTICO: RECAUDACIÓN Y FINANZAS ---
function calcularKPIs() {
    let ingresosTotales = 0;
    let costesMaterialesTotales = 0;
    let manoObraTotal = 0;

    // Calcular costos desde las sesiones reales ejecutadas
    appState.trabajos.forEach(job => {
        ingresosTotales += job.precioCobrado;
        
        // Sumar costo exacto de insumos
        job.materialesUsados.forEach(matId => {
            const mat = appState.materiales.find(m => m.id === matId);
            if(mat) costesMaterialesTotales += mat.costeUso;
        });

        // Calcular costo de mano de obra del artista
        const tat = appState.tatuadores.find(t => t.id === job.tatuadorId);
        if(tat) {
            if(tat.tipo === "comision") {
                manoObraTotal += (job.precioCobrado * tat.comision) / 100;
            } else if(tat.tipo === "fijo") {
                // Si es fijo, se calcula un coste estimado imputado por hora para reflejar el desgaste
                manoObraTotal += (tat.fijo / appState.horasOperativasMes) * job.horas;
            }
        }
    });

    // Sumar gastos estructurales fijos mensuales
    let gastosFijosMensuales = appState.gastosFijos.reduce((sum, g) => sum + g.importe, 0);
    let gastosTotalesOperativos = costesMaterialesTotales + gastosFijosMensuales;

    let netoReal = ingresosTotales - gastosTotalesOperativos - manoObraTotal;
    let margenROI = ingresosTotales > 0 ? (netoReal / ingresosTotales) * 100 : 0;

    // Pintar en pantalla
    document.getElementById("kpi-ingresos").innerText = `${ingresosTotales.toFixed(2)}€`;
    document.getElementById("kpi-gastos").innerText = `${gastosTotalesOperativos.toFixed(2)}€`;
    document.getElementById("kpi-neto").innerText = `${netoReal.toFixed(2)}€`;
    document.getElementById("kpi-roi").innerText = `${margenROI.toFixed(1)}%`;

    calcularImpuestosProyeccion(ingresosTotales, gastosTotalesOperativos, netoReal);
}

// --- MÓDULO FISCAL (SIMULACIÓN ESPAÑA HACIENDA) ---
function calcularImpuestosProyeccion(ingresos, gastos, neto) {
    // 1. IVA (Modelo 303 aproximado): Suponemos que todo se cobra al 21% de IVA incluido
    // Base Imponible = Ingresos / 1.21
    const baseImponible = ingresos / 1.21;
    const ivaDevengado = ingresos - baseImponible;

    // 2. IRPF Estimado Progresivo Anualizado sobre el Neto de Caja
    // Escala simplificada de rendimiento neto:
    let irpfEstimado = 0;
    if (neto > 0) {
        if(neto <= 12450) irpfEstimado = neto * 0.19;
        else if(neto <= 20200) irpfEstimado = (12450 * 0.19) + ((neto - 12450) * 0.24);
        else irpfEstimado = (12450 * 0.19) + ((20200 - 12450) * 0.24) + ((neto - 20200) * 0.30);
    }

    const cajaLimpia = neto - irpfEstimado;

    document.getElementById("tax-bruto").innerText = `${ingresos.toFixed(2)}€`;
    document.getElementById("tax-iva").innerText = `${ivaDevengado.toFixed(2)}€`;
    document.getElementById("tax-irpf").innerText = `${irpfEstimado.toFixed(2)}€`;
    document.getElementById("tax-limpio").innerText = `${cajaLimpia.toFixed(2)}€`;
}

// --- ARBITRAJE DE PRECIOS: TARIFICADOR INTELIGENTE ---
function recalcularPrecioSugerido() {
    const horas = parseFloat(document.getElementById("job-horas").value) || 0;
    const tatuadorId = document.getElementById("job-tatuador").value;
    
    // 1. Calcular Costo Fijo de Estructura por Hora Amortizada
    const totalGastosFijos = appState.gastosFijos.reduce((sum, g) => sum + g.importe, 0);
    const costoFijoPorHora = totalGastosFijos / appState.horasOperativasMes;
    const costeAmortizacionEstructura = costoFijoPorHora * horas;

    // 2. Calcular Costo de Materiales seleccionados en el checklist
    let costeMateriales = 0;
    document.querySelectorAll(".material-checkbox-input:checked").forEach(checkbox => {
        const mat = appState.materiales.find(m => m.id === checkbox.value);
        if(mat) costeMateriales += mat.costeUso;
    });

    // 3. Evaluar Margen del Tatuador y Cobertura de Costes Mínimos
    const tat = appState.tatuadores.find(t => t.id === tatuadorId);
    let factorComision = 0;
    if(tat && tat.tipo === "comision") {
        factorComision = tat.comision / 100;
    }

    // Fórmula del Precio Mínimo de Equilibrio de Seguridad Financiera:
    // Precio Sugerido = (Coste Estructura + Coste Insumos) / (1 - %Comisión Artista - 20% Margen de Beneficio Estudio)
    let precioSugerido = (costeAmortizacionEstructura + costeMateriales) / (1 - factorComision - 0.20);
    
    // Si la división es inválida, usar cálculo base corregido
    if(precioSugerido <= 0 || isNaN(precioSugerido)) {
        precioSugerido = (costeAmortizacionEstructura + costeMateriales) * 1.5;
    }

    document.getElementById("suggested-price-display").innerText = `${precioSugerido.toFixed(2)}€`;
    document.getElementById("suggested-price-breakdown").innerText = 
        `Insumos: ${costeMateriales.toFixed(2)}€ | Amortización Local: ${costeAmortizacionEstructura.toFixed(2)}€`;
}

function aplicarPrecioSugerido() {
    const txt = document.getElementById("suggested-price-display").innerText;
    document.getElementById("job-precio").value = parseFloat(txt) || 0;
}

// --- AUDITORÍA DE RIESGOS INTEGRADA (SIMULACIÓN DE IA) ---
function ejecutarAuditoriaIA() {
    const container = document.getElementById("ai-dynamic-insights");
    
    // Verificar si hay alguna sesión que no tenga el consentimiento firmado
    const infraccionesSanitarias = appState.trabajos.filter(j => !j.consentimiento).length;
    
    // Analizar la caja real de billetes en efectivo frente a digitalizaciones
    const efectivoTotal = appState.trabajos.filter(j => j.metodoPago === "efectivo").reduce((s, j) => s + j.precioCobrado, 0);
    
    let alertHtml = "";
    
    if(infraccionesSanitarias > 0) {
        alertHtml += `
            <div class="ai-message" style="border-color:var(--color-expense); background:#2d1a1a; margin-bottom:12px;">
                <div class="ai-avatar" style="background:var(--color-expense);"><i class="fa-solid fa-triangle-exclamation"></i></div>
                <div class="ai-text">
                    <h4 style="color:#fca5a5;">ALERTA CRÍTICA: Alerta Sanitaria Activa</h4>
                    <p>Detectamos <strong>${infraccionesSanitarias} sesión(es)</strong> registradas sin la firma del documento de Consentimiento Informado Obligatorio. En caso de inspección sanitaria de la Comunidad Autónoma, te expones a un cierre preventivo o multa grave de hasta 3,000€.</p>
                </div>
            </div>`;
    }

    if(efectivoTotal > 1000) {
        alertHtml += `
            <div class="ai-message" style="border-color:var(--accent-gold); background:#2e2617;">
                <div class="ai-avatar" style="background:var(--accent-gold); color:#000;"><i class="fa-solid fa-scale-balanced"></i></div>
                <div class="ai-text">
                    <h4 style="color:#fde047;">RECOMENDACIÓN: Alerta de Patrón Fiscal</h4>
                    <p>Tienes más de 1,000€ acumulados en cobros en efectivo (${efectivoTotal}€). Recuerda que la normativa legal vigente limita los pagos en efectivo para evitar inspecciones aleatorias del Modelo 130/303. Intenta incentivar el uso de Bizum o TPV.</p>
                </div>
            </div>`;
    }

    if(alertHtml === "") {
        alertHtml = `
            <div class="ai-message">
                <div class="ai-avatar"><i class="fa-solid fa-circle-check"></i></div>
                <div class="ai-text">
                    <h4>Auditoría Completada con Éxito</h4>
                    <p>Felicidades. El 100% de tus sesiones cuentan con protección legal sanitaria firmada y los flujos analizados se mantienen dentro del umbral de riesgo fiscal bajo.</p>
                </div>
            </div>`;
    }

    container.innerHTML = alertHtml;
}

// --- INTERFAZ DINÁMICA: GASTOS FIJOS ---
function renderGastosFijos() {
    const tbody = document.getElementById("tabla-gastos-fijos");
    tbody.innerHTML = appState.gastosFijos.map(g => `
        <tr>
            <td><strong>${g.concepto}</strong></td>
            <td>${g.importe.toFixed(2)}€/mes</td>
            <td>
                <button class="btn btn-danger btn-sm" onclick="eliminarGastoFijo('${g.id}')"><i class="fa-solid fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

function openModalGastoFijo() { openModal('modal-gasto-fijo'); }

function guardarGastoFijo() {
    const concepto = document.getElementById("fijo-concepto").value;
    const importe = parseFloat(document.getElementById("fijo-importe").value);
    
    if(concepto && importe > 0) {
        appState.gastosFijos.push({ id: "fijo-" + Date.now(), concepto, importe });
        saveState();
        closeModal('modal-gasto-fijo');
        // Resetear inputs
        document.getElementById("fijo-concepto").value = "";
        document.getElementById("fijo-importe").value = "";
    }
}

function eliminarGastoFijo(id) {
    appState.gastosFijos = appState.gastosFijos.filter(g => g.id !== id);
    saveState();
}

// --- INTERFAZ DINÁMICA: INVENTARIO DE MATERIALES ---
function renderMateriales() {
    const tbody = document.getElementById("tabla-materiales");
    tbody.innerHTML = appState.materiales.map(m => `
        <tr>
            <td><strong>${m.nombre}</strong></td>
            <td>${m.precioPack.toFixed(2)}€</td>
            <td>${m.unidadesPack} uds</td>
            <td>${m.usoEstimado}</td>
            <td style="color:var(--accent-gold); font-weight:600;">${m.costeUso.toFixed(2)}€</td>
            <td>
                <button class="btn btn-danger btn-sm" onclick="eliminarMaterial('${m.id}')"><i class="fa-solid fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

function openModalMaterial() { openModal('modal-material'); }

function guardarMaterial() {
    const nombre = document.getElementById("mat-nombre").value;
    const precioPack = parseFloat(document.getElementById("mat-precio-pack").value);
    const unidadesPack = parseInt(document.getElementById("mat-unidades-pack").value);
    const usoEstimado = parseFloat(document.getElementById("mat-uso-estimado").value) || 1;

    if(nombre && precioPack > 0 && unidadesPack > 0) {
        const costeUso = (precioPack / unidadesPack) * usoEstimado;
        appState.materiales.push({ id: "mat-" + Date.now(), nombre, precioPack, unidadesPack, usoEstimado, costeUso });
        saveState();
        closeModal('modal-material');
    }
}

function eliminarMaterial(id) {
    appState.materiales = appState.materiales.filter(m => m.id !== id);
    saveState();
}

// --- INTERFAZ DINÁMICA: FICHA DE TATUADORES ---
function renderTatuadores() {
    const tbody = document.getElementById("tabla-tatuadores");
    tbody.innerHTML = appState.tatuadores.map(t => `
        <tr>
            <td><strong>${t.nombre || t.font}</strong></td>
            <td>${t.tipo === "comision" ? `Comisión del ${t.comision}%` : `Sueldo Fijo de ${t.fijo}€/mes`}</td>
            <td>
                <button class="btn btn-danger btn-sm" onclick="eliminarTatuador('${t.id}')"><i class="fa-solid fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

function toggleComisionInput() {
    const tipo = document.getElementById("tat-tipo").value;
    document.getElementById("group-comision").style.display = tipo === "comision" ? "block" : "none";
    document.getElementById("group-fijo").style.display = tipo === "fijo" ? "block" : "none";
}

function openModalTatuador() { openModal('modal-tatuador'); }

function guardarTatuador() {
    const nombre = document.getElementById("tat-nombre").value;
    const tipo = document.getElementById("tat-tipo").value;
    const comision = parseFloat(document.getElementById("tat-comision").value) || 0;
    const fijo = parseFloat(document.getElementById("tat-fijo").value) || 0;

    if(nombre) {
        appState.tatuadores.push({ id: "tat-" + Date.now(), nombre, tipo, comision, fijo });
        saveState();
        closeModal('modal-tatuador');
    }
}

function eliminarTatuador(id) {
    appState.tatuadores = appState.tatuadores.filter(t => t.id !== id);
    saveState();
}

// --- INTERFAZ DINÁMICA: SESIONES DE TRABAJO ---
function actualizarSelectsTrabajo() {
    const select = document.getElementById("job-tatuador");
    select.innerHTML = appState.tatuadores.map(t => `<option value="${t.id}">${t.nombre || t.font}</option>`).join('');
    
    const checklist = document.getElementById("job-materiales-list");
    checklist.innerHTML = appState.materiales.map(m => `
        <label class="material-check-item">
            <input type="checkbox" class="material-checkbox-input" value="${m.id}" checked onchange="recalcularPrecioSugerido()">
            ${m.nombre} (${m.costeUso.toFixed(2)}€)
        </label>
    `).join('');
}

function renderTrabajos() {
    const tbody = document.getElementById("tabla-trabajos");
    tbody.innerHTML = appState.trabajos.map(j => {
        const tat = appState.tatuadores.find(t => t.id === j.tatuadorId);
        
        let costMat = 0;
        j.materialesUsados.forEach(mId => { const m = appState.materiales.find(mat => mat.id === mId); if(m) costMat += m.costeUso; });
        
        let mObra = 0;
        if(tat && tat.tipo === "comision") mObra = (j.precioCobrado * tat.comision) / 100;
        else if(tat && tat.tipo === "fijo") mObra = (tat.fijo / appState.horasOperativasMes) * j.horas;

        const margen = j.precioCobrado - costMat - mObra;

        return `
            <tr>
                <td><strong>${j.cliente}</strong><br><small style="color:var(--text-muted);">${j.metodoPago.toUpperCase()}</small></td>
                <td>${tat ? (tat.nombre || tat.font) : 'N/A'}<br>${j.consentimiento ? '<span style="color:var(--color-income); font-size:0.7rem;"><i class="fa-solid fa-shield"></i> Firmado</span>' : '<span style="color:var(--color-expense); font-size:0.7rem;"><i class="fa-solid fa-circle-xmark"></i> Faltante</span>'}</td>
                <td style="font-weight:bold;">${j.precioCobrado}€</td>
                <td style="color:var(--text-muted);">${costMat.toFixed(1)}€</td>
                <td style="color:var(--text-muted);">${mObra.toFixed(1)}€</td>
                <td style="color:var(--color-income); font-weight:bold;">${margen.toFixed(1)}€</td>
                <td>
                    <button class="btn btn-danger btn-sm" onclick="eliminarTrabajo('${j.id}')"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `;
    }).join('');
}

function openModalTrabajo() {
    actualizarSelectsTrabajo();
    openModal('modal-trabajo');
    recalcularPrecioSugerido();
}

function guardarTrabajo() {
    const cliente = document.getElementById("job-cliente").value;
    const tatuadorId = document.getElementById("job-tatuador").value;
    const horas = parseFloat(document.getElementById("job-horas").value) || 0;
    const precioCobrado = parseFloat(document.getElementById("job-precio").value) || 0;
    const metodoPago = document.getElementById("job-metodo-pago").value;
    const consentimiento = document.getElementById("job-consentimiento").checked;

    const materialesUsados = [];
    document.querySelectorAll(".material-checkbox-input:checked").forEach(cb => materialesUsados.push(cb.value));

    if(cliente && precioCobrado > 0 && horas > 0) {
        appState.trabajos.push({
            id: "job-" + Date.now(),
            cliente, tatuadorId, horas, precioCobrado, metodoPago, consentimiento, materialesUsados,
            fecha: new Date().toISOString()
        });
        saveState();
        closeModal('modal-trabajo');
        // Resetear formulario
        document.getElementById("job-cliente").value = "";
    } else {
        alert("Por favor rellena los datos mínimos obligatorios.");
    }
}

function eliminarTrabajo(id) {
    appState.trabajos = appState.trabajos.filter(j => j.id !== id);
    saveState();
}

// --- INTERFAZ DINÁMICA: SIMULADOR DE RETORNO (ROI) ---
function actualizarPrecioROI() {
    const concepto = document.getElementById("roi-concepto").value;
    if(concepto !== "custom") {
        document.getElementById("roi-costo").value = concepto;
    }
}

function calcularSimulacionROI() {
    const costo = parseFloat(document.getElementById("roi-costo").value) || 0;
    const ticket = parseFloat(document.getElementById("roi-ticket").value) || 0;
    const display = document.getElementById("roi-result-display");

    if (costo <= 0 || ticket <= 0) {
        alert("Ingresa valores mayores a 0 para el cálculo.");
        return;
    }

    // Calcular cuánto nos queda neto en una sesión estándar para pagar la inversión
    const totalGastosFijos = appState.gastosFijos.reduce((sum, g) => sum + g.importe, 0);
    const costeAmortizadoHora = totalGastosFijos / appState.horasOperativasMes;
    // Suponemos sesión promedio de 3 horas y uso estándar de materiales
    const costeImputadoSesion = (costeAmortizadoHora * 3) + 10; 

    const beneficioLimpioEstudioPorTicket = (ticket - costeImputadoSesion) * 0.5; // Suponiendo un margen conservador libre del 50%
    const sesionesNecesarias = Math.ceil(costo / Math.max(beneficioLimpioEstudioPorTicket, 1));

    display.style.display = "block";
    display.innerHTML = `
        <h4 style="color:var(--accent-gold); margin-bottom:8px;"><i class="fa-solid fa-circle-nodes"></i> Viabilidad del Capital</h4>
        <p style="font-size:0.85rem; line-height:1.4; margin-bottom:10px;">
            Para amortizar una inversión de <strong>${costo.toFixed(2)}€</strong> con un ticket medio de ${ticket}€, necesitas realizar aproximadamente:
        </p>
        <div style="font-size:1.8rem; font-weight:700; text-align:center; color:#fff; margin-bottom:10px;">
            ${sesionesNecesarias} <span style="font-size:0.9rem; color:var(--text-muted);">Sesiones</span>
        </div>
        <p style="font-size:0.75rem; color:var(--text-muted);">
            *Cálculo ponderado restando insumos estandarizados y amortización del local por hora.
        </p>
    `;
}

// --- INTERFAZ DINÁMICA: OBJETIVOS CORPORATIVOS ---
function renderObjetivos() {
    const container = document.getElementById("lista-objetivos");
    const ingresosTotales = appState.trabajos.reduce((s, j) => s + j.precioCobrado, 0);

    container.innerHTML = appState.objetivos.map(o => {
        let pct = (ingresosTotales / o.meta) * 100;
        if(pct > 100) pct = 100;
        
        return `
            <div style="margin-bottom:15px;">
                <div class="goal-info">
                    <span><strong>${o.nombre}</strong></span>
                    <span style="color:var(--text-muted);">${ingresosTotales.toFixed(0)}€ / ${o.meta}€ (${pct.toFixed(0)}%)</span>
                </div>
                <div class="progress-bar-bg">
                    <div class="progress-bar-fill" style="width: ${pct}%"></div>
                </div>
            </div>
        `;
    }).join('');
}

function openModalObjetivo() { openModal('modal-objetivo'); }

function guardarObjetivo() {
    const nombre = document.getElementById("obj-nombre").value;
    const meta = parseFloat(document.getElementById("obj-meta").value);

    if(nombre && meta > 0) {
        appState.objetivos.push({ id: "obj-" + Date.now(), nombre, meta });
        saveState();
        closeModal('modal-objetivo');
        document.getElementById("obj-nombre").value = "";
        document.getElementById("obj-meta").value = "";
    }
}

// --- VENTANAS MODALES ACCIONES ---
function openModal(id) { document.getElementById(id).classList.add("active"); }
function closeModal(id) { document.getElementById(id).classList.remove("active"); }

// --- CONTROL GRÁFICO (CHART.JS) ---
function actualizarGrafico() {
    const ctx = document.getElementById('mainDashboardChart');
    if (!ctx) return;

    // Agrupar los ingresos de las últimas sesiones por método de pago para analítica rápida de caja
    const metodos = { efectivo: 0, tarjeta: 0, bizum: 0 };
    appState.trabajos.forEach(j => { if(metodos[j.metodoPago] !== undefined) metodos[j.metodoPago] += j.precioCobrado; });

    if (mainChart) {
        mainChart.destroy();
    }

    mainChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Efectivo (Caja)', 'Tarjeta (TPV)', 'Bizum'],
            datasets: [{
                label: 'Flujo de Caja Real (€)',
                data: [metodos.efectivo, sampledTarjeta = metodos.tarjeta, metodos.bizum],
                backgroundColor: ['#10b981', '#3b82f6', '#d4af37'],
                borderWidth: 0,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { grid: { color: '#222f4c' }, ticks: { color: '#9ca3af' } },
                x: { grid: { display: false }, ticks: { color: '#9ca3af' } }
            }
        }
    });
}