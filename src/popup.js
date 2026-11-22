let perfilActual = { url: "", nombre: "", cargo: "" };

document.addEventListener("DOMContentLoaded", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab.url || !tab.url.includes("linkedin.com/in/")) {
    document.getElementById("nombre").textContent = "Abre un perfil de LinkedIn";
    document.getElementById("guardar").disabled = true;
    return;
  }

  // Limpiar parámetros de la URL para usarla como clave única
  const urlLimpia = tab.url.split("?")[0].replace(/\/$/, "");
  perfilActual.url = urlLimpia;

  // Extraer nombre y titular visibles en la pestaña
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      const h1 = document.querySelector("h1");
      const titular = document.querySelector(".text-body-medium");
      return {
        nombre: h1 ? h1.innerText.trim() : document.title.split("|")[0].trim(),
        cargo: titular ? titular.innerText.trim() : ""
      };
    }
  });

  perfilActual.nombre = result.nombre;
  perfilActual.cargo = result.cargo;

  document.getElementById("nombre").textContent = perfilActual.nombre;
  document.getElementById("cargo").textContent = perfilActual.cargo;

  // Cargar nota previa si ya existía
  const data = await chrome.storage.local.get(urlLimpia);
  if (data[urlLimpia]) {
    document.getElementById("etiqueta").value = data[urlLimpia].etiqueta || "";
    document.getElementById("nota").value = data[urlLimpia].nota || "";
  }
});

document.getElementById("guardar").addEventListener("click", async () => {
  if (!perfilActual.url) return;
  const registro = {
    url: perfilActual.url,
    nombre: perfilActual.nombre,
    cargo: perfilActual.cargo,
    etiqueta: document.getElementById("etiqueta").value.trim(),
    nota: document.getElementById("nota").value.trim(),
    fechaGuardado: new Date().toISOString().split("T")[0]
  };
  await chrome.storage.local.set({ [perfilActual.url]: registro });
  const estado = document.getElementById("estado");
  estado.textContent = "Guardado";
  setTimeout(() => (estado.textContent = ""), 2000);
});

document.getElementById("exportJson").addEventListener("click", async () => {
  const all = await chrome.storage.local.get(null);
  const lista = Object.values(all);
  descargar(JSON.stringify(lista, null, 2), "notas_linkedin.json", "application/json");
});

document.getElementById("exportCsv").addEventListener("click", async () => {
  const all = await chrome.storage.local.get(null);
  const lista = Object.values(all);
  const cabeceras = ["nombre", "cargo", "etiqueta", "nota", "url", "fechaGuardado"];
  const filas = [
    cabeceras.join(";"),
    ...lista.map(item =>
      cabeceras.map(c => `"${(item[c] || "").replace(/"/g, '""').replace(/\n/g, " ")}"`).join(";")
    )
  ];
  // BOM \uFEFF para que Excel abra bien las tildes y eñes
  descargar("\uFEFF" + filas.join("\n"), "notas_linkedin.csv", "text/csv;charset=utf-8;");
});

function descargar(contenido, nombreArchivo, tipo) {
  const blob = new Blob([contenido], { type: tipo });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombreArchivo;
  a.click();
  URL.revokeObjectURL(url);
}
