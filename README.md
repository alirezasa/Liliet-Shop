# Liliet Pet — lilietpet.com

Static, responsive website for the Liliet Pet production & distribution group.
Languages: **Persian (default, RTL)**, English and Turkish. Hosted on GitHub Pages (`CNAME` → lilietpet.com).

## Structure

```
index.html                 page markup (all sections)
assets/css/style.css       theme (catalog colours: mint #A8D3BF, teal #7CB6B8, orange #F1763A)
assets/js/i18n.js          all interface texts in fa / en / tr
assets/js/products.js      product data (generated – do not edit by hand)
assets/js/app.js           language switch, filters, search, product window, WhatsApp ordering, catalog code
assets/js/catalog-crypto.js  encrypts / decrypts the catalog with the access code (AES-256-GCM + PBKDF2)
assets/catalog/            encrypted catalog: catalog.json (header) + catalog.bin (encrypted PDF)
assets/img/products/       product photos cropped from the catalog
assets/img/brand/          logo, hero and social-share image
assets/img/categories/     category images (from pic/)
tools/build_catalog.py     rebuilds products.js and the images from the catalog PDF
tools/catalog-lock.html    admin page: lock the catalog with a new access code
```

## Catalog download code

Visitors must enter a 4-digit code to download the digital catalog. The PDF is only
published encrypted with that code, so it cannot be downloaded without it, and the code
itself is not stored anywhere on the site.

To change the code (or publish a new catalog):

1. Open `https://lilietpet.com/tools/catalog-lock.html`.
2. Pick the catalog PDF, type the new code twice and press «ساخت فایل‌ها».
3. Download `catalog.json` and `catalog.bin` and upload both to `assets/catalog/` on GitHub
   (the page has a direct link), replacing the old files.
4. After the site updates, check the new code in step 3 of the same page.

Never upload the plain catalog PDF to the repository — it would be downloadable without the code.

## Updating products

Products, sizes and colour codes come from the catalog PDF (prices are not shown on the site).
Edit the `PRODUCTS` list in `tools/build_catalog.py`, then run it with the catalog file kept outside the repository:

```bash
python3 tools/build_catalog.py ~/Downloads/Liliet07.10.pdf   # needs poppler-utils (pdfimages), Pillow and numpy
```

Interface texts (menus, feature descriptions, model names …) are in `assets/js/i18n.js`.

## Preview locally

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

Useful links: `?lang=en`, `?lang=tr`, and `#product/<id>/<colour-index>` opens a product directly
(e.g. `#product/leather-space-backpack/1`).
