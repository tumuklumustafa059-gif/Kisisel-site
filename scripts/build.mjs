// Siteyi _site klasörüne derler. Hiçbir paket gerektirmez.
// Çalıştırmak için:  node scripts/build.mjs
//
// Yaptıkları:
//  1. dosyalar/ klasöründeki her dosyayı bulur ve "Dosyalar" bölümünün listesini üretir.
//  2. {{SITE_URL}}, {{YIL}}, {{GUNCELLEME_TARIH}} gibi yer tutucuları doldurur.
//  3. sitemap.xml ve robots.txt üretir, sayfadaki yerel bağlantıları kontrol eder.

import { readFile, writeFile, mkdir, cp, readdir, stat, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CIKTI = path.join(KOK, "_site");
const ayarlar = JSON.parse(await readFile(path.join(KOK, "ayarlar.json"), "utf8"));
const SITE = String(ayarlar.site_adresi || "").replace(/\/+$/, "");

// Klasör adı -> sitede görünen başlık. Listede olmayan klasörler de çalışır,
// adları otomatik düzeltilir (ör. "yarisma-belgeleri" -> "Yarisma belgeleri").
const KATEGORILER = {
  cv: "CV",
  projeler: "Projeler",
  raporlar: "Raporlar",
  sunumlar: "Sunumlar",
  sertifikalar: "Sertifikalar",
  fotograflar: "Fotoğraflar",
  diger: "Diğer",
};
const SIRA = Object.keys(KATEGORILER);
// Siteye kopyalanmayacak dosya ve klasörler
const HARIC = new Set(["_site", "scripts", ".github", ".git", "node_modules", "README.md", "ayarlar.json", ".gitignore", "package.json", ".DS_Store"]);
const GORSEL = new Set(["png", "jpg", "jpeg", "webp", "gif", "avif", "svg"]);

const kacir = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const boyutYaz = (b) =>
  b < 1024 ? `${b} B` : b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1048576).toLocaleString("tr-TR", { maximumFractionDigits: 1 })} MB`;
const ayYaz = (d) => d.toLocaleDateString("tr-TR", { month: "long", year: "numeric", timeZone: "Europe/Istanbul" });
const gunYaz = (d) => d.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Istanbul" });
const buyukHarf = (s) => s.charAt(0).toLocaleUpperCase("tr") + s.slice(1);
const guzelAd = (ad) => buyukHarf(ad.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim());
const kategoriAdi = (k) => KATEGORILER[k] ?? guzelAd(k);
const urlYolu = (goreli) => goreli.split("/").map(encodeURIComponent).join("/");

// Dosyanın git'e eklendiği/son değiştiği tarih. Geçmiş yoksa ya da sığ (shallow)
// kopyaysa tarih yanlış olacağından hiç göstermeyiz.
const git = (args) => execFileSync("git", args, { cwd: KOK, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
let gitKullanilabilir = false;
try { gitKullanilabilir = git(["rev-parse", "--is-shallow-repository"]) === "false"; } catch { /* git yok */ }

function gitTarihi(goreliYol) {
  if (!gitKullanilabilir) return null;
  try {
    const cikti = execFileSync("git", ["log", "-1", "--format=%cI", "--", goreliYol], {
      cwd: KOK, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return cikti ? new Date(cikti) : null;
  } catch {
    return null;
  }
}

async function dosyalariTopla() {
  const klasor = path.join(KOK, "dosyalar");
  if (!existsSync(klasor)) return [];
  const aciklamaYolu = path.join(klasor, "aciklamalar.json");
  let aciklamalar = {};
  if (existsSync(aciklamaYolu)) {
    try {
      aciklamalar = JSON.parse(await readFile(aciklamaYolu, "utf8"));
    } catch (h) {
      console.warn(`UYARI: dosyalar/aciklamalar.json okunamadı (${h.message}). Açıklamalar atlandı.`);
    }
  }
  const liste = [];
  async function gez(dizin) {
    for (const g of await readdir(dizin, { withFileTypes: true })) {
      if (g.name.startsWith(".")) continue;
      const tam = path.join(dizin, g.name);
      if (g.isDirectory()) { await gez(tam); continue; }
      const goreli = path.relative(klasor, tam).split(path.sep).join("/");
      if (goreli === "aciklamalar.json") continue;
      const kategori = goreli.includes("/") ? goreli.split("/")[0] : "diger";
      const st = await stat(tam);
      const nokta = g.name.lastIndexOf(".");
      const uzanti = nokta > 0 ? g.name.slice(nokta + 1).toLowerCase() : "";
      const ek = aciklamalar[goreli] || {};
      let tarih = ek.tarih ? new Date(ek.tarih) : gitTarihi(path.posix.join("dosyalar", goreli));
      if (tarih && isNaN(tarih)) tarih = null;
      liste.push({
        goreli, kategori, uzanti, boyut: st.size, tarih,
        baslik: ek.baslik || guzelAd(g.name),
        aciklama: ek.aciklama || "",
        sira: Number.isFinite(ek.sira) ? ek.sira : 1000,
      });
    }
  }
  await gez(klasor);
  return liste;
}

function dosyaHtml(d) {
  const href = "dosyalar/" + urlYolu(d.goreli);
  const tur = d.uzanti ? d.uzanti.toUpperCase().slice(0, 4) : "DOSYA";
  const simge = GORSEL.has(d.uzanti)
    ? `<span class="tur"><img src="${href}" alt="" width="48" height="48" loading="lazy" decoding="async"></span>`
    : `<span class="tur" aria-hidden="true">${kacir(tur)}</span>`;
  const meta = [d.uzanti ? d.uzanti.toUpperCase() : null, boyutYaz(d.boyut), d.tarih ? ayYaz(d.tarih) : null].filter(Boolean).join(", ");
  const ara = [d.baslik, d.aciklama, d.goreli, kategoriAdi(d.kategori), d.uzanti].join(" ");
  return `<li class="dosya" data-ara="${kacir(ara)}">${simge}<div class="dosya-bilgi"><a href="${href}" target="_blank" rel="noopener">${kacir(d.baslik)}</a>${
    d.aciklama ? `<span class="dosya-aciklama">${kacir(d.aciklama)}</span>` : ""
  }<span class="dosya-meta">${kacir(meta)}</span></div><a class="indir" href="${href}" download aria-label="İndir: ${kacir(d.baslik)}">İndir</a></li>`;
}

function dosyalarBolumu(liste) {
  if (liste.length === 0) return `<p id="dosya-yok">Henüz dosya yok.</p>`;
  const gruplar = new Map();
  for (const d of liste) {
    if (!gruplar.has(d.kategori)) gruplar.set(d.kategori, []);
    gruplar.get(d.kategori).push(d);
  }
  const sirali = [...gruplar.keys()].sort((a, b) => {
    const ia = SIRA.indexOf(a), ib = SIRA.indexOf(b);
    if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    return kategoriAdi(a).localeCompare(kategoriAdi(b), "tr");
  });
  let html = "";
  if (liste.length > 5) {
    html += `<div class="dosya-ara"><label for="dosya-ara">Dosyalarda ara</label><input id="dosya-ara" type="search" placeholder="ör. rapor, anten, sertifika" autocomplete="off"></div>`;
  }
  for (const k of sirali) {
    const dosyalar = gruplar.get(k).sort((a, b) =>
      a.sira - b.sira || (b.tarih?.getTime() ?? 0) - (a.tarih?.getTime() ?? 0) || a.baslik.localeCompare(b.baslik, "tr"));
    const id = "grup-" + k.replace(/[^a-z0-9-]/gi, "-");
    html += `<div class="dosya-grubu"><h3 id="${id}">${kacir(kategoriAdi(k))}</h3><ul class="dosya-listesi" aria-labelledby="${id}">${dosyalar.map(dosyaHtml).join("")}</ul></div>`;
  }
  html += `<p id="dosya-yok" hidden>Aramana uyan dosya yok.</p>`;
  return html;
}

function yerTutuculariDoldur(html, degerler) {
  return html.replace(/\{\{([A-Z_]+)\}\}/g, (tum, ad) => (ad in degerler ? degerler[ad] : tum));
}

// Girintileri ve yorumları atar; <script> ve <pre> içine dokunmaz.
function kucult(html) {
  const korunan = [];
  html = html.replace(/<(script|pre)[\s\S]*?<\/\1>/gi, (m) => { korunan.push(m); return `\u0000${korunan.length - 1}\u0000`; });
  html = html
    .replace(/<!--(?!\s*\[if)[\s\S]*?-->/g, "")
    .replace(/<style>([\s\S]*?)<\/style>/g, (m, css) =>
      "<style>" + css.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s*\n\s*/g, "").replace(/\s*([{};,>])\s*/g, "$1").replace(/;}/g, "}") + "</style>")
    .replace(/\n\s+/g, "\n")
    .replace(/\n{2,}/g, "\n");
  return html.replace(/\u0000(\d+)\u0000/g, (m, i) => korunan[Number(i)]);
}

function yerelBaglantilariKontrolEt(html, dosyaAdi) {
  const eksik = [];
  for (const [, url] of html.matchAll(/(?:href|src)="([^"#][^"]*)"/g)) {
    if (/^(https?:|mailto:|tel:|data:|\/\/)/.test(url) || url.startsWith(SITE)) continue;
    const yol = decodeURIComponent(url.split(/[?#]/)[0]);
    if (!existsSync(path.join(CIKTI, yol))) eksik.push(yol);
  }
  for (const e of new Set(eksik)) console.warn(`UYARI: ${dosyaAdi} içinde bağlantı verilen "${e}" bulunamadı.`);
  return eksik.length;
}

// ---- Derleme ----
if (!SITE.startsWith("http")) {
  console.error('HATA: ayarlar.json içindeki "site_adresi" https:// ile başlamalı.');
  process.exit(1);
}
await rm(CIKTI, { recursive: true, force: true });
await mkdir(CIKTI, { recursive: true });
for (const g of await readdir(KOK, { withFileTypes: true })) {
  if (HARIC.has(g.name) || g.name.startsWith(".")) continue;
  await cp(path.join(KOK, g.name), path.join(CIKTI, g.name), {
    recursive: true,
    filter: (kaynak) => !path.basename(kaynak).startsWith(".") && path.basename(kaynak) !== "aciklamalar.json",
  });
}

const simdi = new Date();
const degerler = {
  SITE_URL: SITE,
  YIL: String(simdi.getFullYear()),
  GUNCELLEME_TARIH: gunYaz(simdi),
  GUNCELLEME_ISO: simdi.toISOString().slice(0, 10),
};

const dosyalar = await dosyalariTopla();
let sayfa = await readFile(path.join(KOK, "index.html"), "utf8");
sayfa = sayfa.replace("<!-- DOSYALAR -->", dosyalarBolumu(dosyalar));
sayfa = kucult(yerTutuculariDoldur(sayfa, degerler));
await writeFile(path.join(CIKTI, "index.html"), sayfa);

if (existsSync(path.join(KOK, "404.html"))) {
  const bulunamadi = kucult(yerTutuculariDoldur(await readFile(path.join(KOK, "404.html"), "utf8"), degerler));
  await writeFile(path.join(CIKTI, "404.html"), bulunamadi);
}

await writeFile(
  path.join(CIKTI, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${SITE}/</loc><lastmod>${degerler.GUNCELLEME_ISO}</lastmod></url>\n</urlset>\n`
);
await writeFile(path.join(CIKTI, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);

const eksik = yerelBaglantilariKontrolEt(sayfa, "index.html");
const kategoriSayisi = new Set(dosyalar.map((d) => d.kategori)).size;
console.log(`Site derlendi: _site/ (${dosyalar.length} dosya, ${kategoriSayisi} kategori${eksik ? `, ${eksik} eksik bağlantı` : ""})`);
