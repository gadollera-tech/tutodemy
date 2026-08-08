(() => {
  "use strict";

  const regions = [
    { id: "NCR", name: "National Capital Region", short: "Metro Manila", lat: 14.60, lon: 121.00 },
    { id: "CAR", name: "Cordillera Administrative Region", short: "CAR", lat: 16.55, lon: 120.85 },
    { id: "I", name: "Ilocos Region", short: "Region I", lat: 17.20, lon: 120.55 },
    { id: "II", name: "Cagayan Valley", short: "Region II", lat: 17.25, lon: 121.75 },
    { id: "III", name: "Central Luzon", short: "Region III", lat: 15.35, lon: 120.75 },
    { id: "IVA", name: "CALABARZON", short: "Region IV-A", lat: 14.10, lon: 121.30 },
    { id: "MIMAROPA", name: "MIMAROPA", short: "MIMAROPA", lat: 12.30, lon: 120.20 },
    { id: "V", name: "Bicol Region", short: "Region V", lat: 13.15, lon: 123.45 },
    { id: "VI", name: "Western Visayas", short: "Region VI", lat: 11.15, lon: 122.45 },
    { id: "NIR", name: "Negros Island Region", short: "NIR", lat: 10.05, lon: 123.00 },
    { id: "VII", name: "Central Visayas", short: "Region VII", lat: 9.95, lon: 123.85 },
    { id: "VIII", name: "Eastern Visayas", short: "Region VIII", lat: 11.45, lon: 125.05 },
    { id: "IX", name: "Zamboanga Peninsula", short: "Region IX", lat: 7.80, lon: 122.55 },
    { id: "X", name: "Northern Mindanao", short: "Region X", lat: 8.25, lon: 124.70 },
    { id: "XI", name: "Davao Region", short: "Region XI", lat: 7.10, lon: 125.75 },
    { id: "XII", name: "SOCCSKSARGEN", short: "Region XII", lat: 6.50, lon: 124.80 },
    { id: "XIII", name: "Caraga", short: "Caraga", lat: 8.85, lon: 125.85 },
    { id: "BARMM", name: "Bangsamoro Autonomous Region", short: "BARMM", lat: 7.10, lon: 124.05 }
  ];

  const provinceGroups = {
    NCR: ["Metro Manila", "Manila", "NCR", "National Capital Region", "Caloocan", "Las Piñas", "Makati", "Malabon", "Mandaluyong", "Marikina", "Muntinlupa", "Navotas", "Parañaque", "Pasay", "Pasig", "Pateros", "Quezon City", "San Juan", "Taguig", "Valenzuela"],
    CAR: ["Abra", "Apayao", "Benguet", "Ifugao", "Kalinga", "Mountain Province", "Baguio"],
    I: ["Ilocos Norte", "Ilocos Sur", "La Union", "Pangasinan"],
    II: ["Batanes", "Cagayan", "Isabela", "Nueva Vizcaya", "Quirino"],
    III: ["Aurora", "Bataan", "Bulacan", "Nueva Ecija", "Pampanga", "Tarlac", "Zambales"],
    IVA: ["Batangas", "Cavite", "Laguna", "Quezon", "Rizal"],
    MIMAROPA: ["Marinduque", "Occidental Mindoro", "Oriental Mindoro", "Palawan", "Romblon"],
    V: ["Albay", "Camarines Norte", "Camarines Sur", "Catanduanes", "Masbate", "Sorsogon"],
    VI: ["Aklan", "Antique", "Capiz", "Guimaras", "Iloilo"],
    NIR: ["Negros Occidental", "Negros Oriental", "Siquijor"],
    VII: ["Bohol", "Cebu"],
    VIII: ["Biliran", "Eastern Samar", "Leyte", "Northern Samar", "Samar", "Western Samar", "Southern Leyte"],
    IX: ["Zamboanga del Norte", "Zamboanga del Sur", "Zamboanga Sibugay"],
    X: ["Bukidnon", "Camiguin", "Lanao del Norte", "Misamis Occidental", "Misamis Oriental"],
    XI: ["Davao de Oro", "Compostela Valley", "Davao del Norte", "Davao del Sur", "Davao Occidental", "Davao Oriental"],
    XII: ["Cotabato", "North Cotabato", "Sarangani", "South Cotabato", "Sultan Kudarat"],
    XIII: ["Agusan del Norte", "Agusan del Sur", "Dinagat Islands", "Surigao del Norte", "Surigao del Sur"],
    BARMM: ["Basilan", "Lanao del Sur", "Maguindanao", "Maguindanao del Norte", "Maguindanao del Sur", "Sulu", "Tawi-Tawi"]
  };

  const normalize = value => String(value || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

  const provinceToRegion = new Map();
  Object.entries(provinceGroups).forEach(([region, provinces]) => {
    provinces.forEach(province => provinceToRegion.set(normalize(province), region));
  });

  const provinceOptions = [...new Set(Object.values(provinceGroups).flat())]
    .filter(name => !["NCR", "National Capital Region", "Manila", "Baguio", "Compostela Valley", "Maguindanao", "North Cotabato", "Western Samar"].includes(name))
    .sort((a, b) => a.localeCompare(b));
  provinceOptions.unshift("Metro Manila");

  function regionForProvince(province) {
    const key = normalize(province);
    if (!key) return null;
    if (provinceToRegion.has(key)) return provinceToRegion.get(key);
    for (const [known, region] of provinceToRegion.entries()) {
      if (key.includes(known) || known.includes(key)) return region;
    }
    return null;
  }

  function populateProvinceSelect(select, selected = "") {
    if (!select) return;
    const current = selected || select.value || "";
    select.innerHTML = '<option value="">Select province (optional)</option>' + provinceOptions
      .map(name => `<option value="${name.replace(/"/g, '&quot;')}">${name}</option>`).join("");
    select.value = current;
  }

  window.TutoPH = { regions, provinceGroups, provinceOptions, normalize, regionForProvince, populateProvinceSelect };
})();
