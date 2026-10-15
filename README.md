# Liliet Pet — lilietpet.com

Static, responsive website for the Liliet Pet production & distribution group.
Languages: **Persian (default, RTL)**, English and Turkish. Hosted on GitHub Pages (`CNAME` → lilietpet.com).

## Structure

```
index.html                 page markup (all sections)
assets/css/style.css       theme (catalog colours: mint #A8D3BF, teal #7CB6B8, orange #F1763A)
assets/js/i18n.js          all interface texts in fa / en / tr
assets/js/products.js      product data (generated – do not edit by hand)
assets/js/app.js           language switch, filters, search, product window, WhatsApp ordering
assets/img/products/       product photos cropped from the catalog
assets/img/brand/          logo, hero and social-share image
assets/img/categories/     category images (from pic/)
tools/build_catalog.py     rebuilds products.js and the images from Liliet05.pdf
Liliet05.pdf               current catalog (download button)
CA.pdf                     English / Turkish catalog
```

## Updating products

Products, prices, sizes and colour codes come from `Liliet05.pdf`.
Edit the `PRODUCTS` list in `tools/build_catalog.py`, then run:

```bash
python3 tools/build_catalog.py   # needs poppler-utils (pdfimages), Pillow and numpy
```

Interface texts (menus, feature descriptions, model names …) are in `assets/js/i18n.js`.

## Preview locally

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

Useful links: `?lang=en`, `?lang=tr`, and `#product/<id>/<colour-index>` opens a product directly
(e.g. `#product/leather-space-backpack/1`).
