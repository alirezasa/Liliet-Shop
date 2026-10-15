#!/usr/bin/env python3
"""Build the website product data and images from the Liliet catalog PDF.

Usage (from the repository root):
    python3 tools/build_catalog.py

Requirements: poppler-utils (pdfimages), Python 3 with Pillow and numpy.

The catalog (Liliet05.pdf) is an image-only PDF: one JPEG per page. Every
product colour/design sits inside a dashed frame with a grey code label on its
bottom edge. This script finds those frames, crops the photo inside each one
(without the label), and writes:
    assets/img/products/<product-id>/<code>.webp
    assets/js/products.js  (product, model, colour and price data)
Brand images (logo, hero, category tiles) are produced as well.
"""
import json
import os
import shutil
import subprocess
import sys
import tempfile

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CATALOG = os.path.join(ROOT, "Liliet05.pdf")
OLD_CATALOG = os.path.join(ROOT, "CA.pdf")  # same artwork, 600 dpi (logo/cover)
OUT_IMG = os.path.join(ROOT, "assets", "img")
OUT_JS = os.path.join(ROOT, "assets", "js", "products.js")

# --------------------------------------------------------------------------
# Vocabulary
# --------------------------------------------------------------------------
COLORS = {
    "blue": ("آبی", "Blue", "Mavi"),
    "lightblue": ("آبی روشن", "Light Blue", "Açık Mavi"),
    "royal": ("آبی کاربنی", "Royal Blue", "Saks Mavisi"),
    "pink": ("صورتی", "Pink", "Pembe"),
    "magenta": ("سرخابی", "Magenta", "Fuşya"),
    "coffee": ("نسکافه‌ای", "Coffee", "Kahve"),
    "orange": ("نارنجی", "Orange", "Turuncu"),
    "honey": ("عسلی", "Honey", "Bal Rengi"),
    "lightgray": ("طوسی روشن", "Light Gray", "Açık Gri"),
    "darkgray": ("طوسی تیره", "Dark Gray", "Koyu Gri"),
    "gray": ("طوسی", "Gray", "Gri"),
    "lilac": ("یاسی", "Lilac", "Lila"),
    "army": ("سبز ارتشی", "Army Green", "Haki Yeşil"),
    "matcha": ("سبز ماچا", "Matcha Green", "Matcha Yeşili"),
    "green": ("سبز", "Green", "Yeşil"),
    "mint": ("سبز نعنایی", "Mint", "Mint Yeşili"),
    "olive": ("زیتونی", "Olive", "Zeytin Yeşili"),
    "navy": ("سرمه‌ای", "Navy", "Lacivert"),
    "burgundy": ("زرشکی", "Burgundy", "Bordo"),
    "red": ("قرمز", "Red", "Kırmızı"),
    "black": ("مشکی", "Black", "Siyah"),
    "cream": ("کرم", "Cream", "Krem"),
    "yellow": ("زرد", "Yellow", "Sarı"),
    "beige": ("بژ", "Beige", "Bej"),
    "brown": ("قهوه‌ای", "Brown", "Kahverengi"),
    "camel": ("شتری", "Camel", "Taba"),
    "purple": ("بنفش", "Purple", "Mor"),
    "plum": ("بادمجانی", "Plum", "Mürdüm"),
    "white": ("سفید", "White", "Beyaz"),
    "turquoise": ("فیروزه‌ای", "Turquoise", "Turkuaz"),
    "charcoal": ("ذغالی", "Charcoal", "Antrasit"),
    "copper": ("مسی", "Copper", "Bakır"),
    "redblack": ("قرمز و مشکی", "Red & Black", "Kırmızı-Siyah"),
    "blackred": ("مشکی و قرمز", "Black & Red", "Siyah-Kırmızı"),
    "navywhite": ("سرمه‌ای و سفید", "Navy & White", "Lacivert-Beyaz"),
    "burgundybeige": ("زرشکی و کرم", "Burgundy & Cream", "Bordo-Krem"),
    "brownbeige": ("قهوه‌ای و کرم", "Brown & Cream", "Kahve-Krem"),
    "greencream": ("سبز و کرم", "Green & Cream", "Yeşil-Krem"),
    "lightbluegray": ("آبی روشن و طوسی", "Light Blue & Gray", "Açık Mavi-Gri"),
    "pinkgray": ("صورتی و طوسی", "Pink & Gray", "Pembe-Gri"),
    "lilacpink": ("یاسی صورتی", "Lilac Pink", "Lila Pembe"),
}
STRIPED = ("خط‌دار", "Striped", "Çizgili")

# --------------------------------------------------------------------------
# Products. Each variant: (page, box, codes, colour-key | None, extra)
#   page  - catalog page number (1-based, as printed order in the PDF)
#   box   - index of the auto-detected frame on that page, or [x1,y1,x2,y2]
#   codes - dict model-key -> colour code shown in the catalog
# --------------------------------------------------------------------------
def T(fa, en, tr):
    return {"fa": fa, "en": en, "tr": tr}


PRODUCTS = [
    # ---------------------------------------------------------------- carriers
    dict(
        id="trolley", cat="carriers",
        name=T("ترولی حمل حیوانات", "Pet Trolley Carrier", "Tekerlekli Evcil Hayvan Taşıma Çantası"),
        models=[("large", "1069", "52×37×56 cm", 8500000), ("small", "1068", "42×37×56 cm", 7500000)],
        features=["leather", "solidBase", "wheels", "pocket"],
        variants=[
            (3, 0, {"large": "6901", "small": "6801"}, "lightbluegray"),
            (3, 1, {"large": "6902", "small": "6802"}, "pinkgray"),
            (3, 3, {"large": "6903", "small": "6803"}, "greencream"),
            (3, 2, {"large": "6904", "small": "6804"}, "redblack"),
            (4, 0, {"large": "6905", "small": "6805"}, "burgundybeige"),
            (4, 1, {"large": "6906", "small": "6806"}, "brownbeige"),
            (4, 3, {"large": "6907", "small": "6807"}, "blackred"),
            (4, 2, {"large": "6908", "small": "6808"}, "navywhite"),
        ],
    ),
    dict(
        id="lion-bag", cat="carriers",
        name=T("کیف حمل مدل سر شیر", "Lion Head Carrier Bag", "Aslan Başlı Taşıma Çantası"),
        models=[("code", "1008", "13×40×41 cm", 1150000)],
        features=["leather", "fixedBase", "leashNeck"],
        variants=[
            (5, 3, {"code": "0081"}, "lightblue"), (5, 2, {"code": "0082"}, "pink"),
            (5, 1, {"code": "0083"}, "magenta"), (5, 0, {"code": "0084"}, "beige"),
            (5, 7, {"code": "0085"}, "orange"), (5, 6, {"code": "0086"}, "brown"),
            (5, 5, {"code": "0087"}, "lightgray"), (5, 4, {"code": "0088"}, "gray"),
            (6, 3, {"code": "0089"}, "lilac"), (6, 2, {"code": "0810"}, "olive"),
            (6, 1, {"code": "0811"}, "mint"), (6, 0, {"code": "0812"}, "navy"),
            (6, 6, {"code": "0813"}, "burgundy"), (6, 5, {"code": "0814"}, "red"),
            (6, 4, {"code": "0815"}, "black"),
        ],
    ),
    dict(
        id="leather-space-backpack", cat="carriers",
        name=T("کوله حمل فضایی چرمی پارک‌دار و ساده", "Leather Space Capsule Backpack",
               "Deri Astronot Kapsül Sırt Çantası"),
        models=[("standard", "1034", "40×35×33 cm", 2300000),
                ("expandable", "1036", "40×35×33 – 78 cm", 2700000)],
        features=["leather", "solidBase", "leash", "window"],
        variants=[
            (7, 0, {"standard": "3401", "expandable": "3601"}, "blue"),
            (7, 1, {"standard": "3402", "expandable": "3602"}, "pink"),
            (7, 2, {"standard": "3403", "expandable": "3603"}, "magenta"),
            (8, 0, {"standard": "3404", "expandable": "3604"}, "coffee"),
            (8, 1, {"standard": "3405", "expandable": "3605"}, "orange"),
            (8, 2, {"standard": "3406", "expandable": "3606"}, "honey"),
            (9, [63, 265, 783, 515], {"standard": "3407", "expandable": "3607"}, "lightgray"),
            (9, 0, {"standard": "3408", "expandable": "3608"}, "darkgray"),
            (9, 1, {"standard": "3409", "expandable": "3609"}, "lilac"),
            (10, 0, {"standard": "3410", "expandable": "3610"}, "army"),
            (10, 1, {"standard": "3411", "expandable": "3611"}, "matcha"),
            (10, 2, {"standard": "3412", "expandable": "3612"}, "navy"),
            (11, 0, {"standard": "3413", "expandable": "3613"}, "burgundy"),
            (11, 1, {"standard": "3414", "expandable": "3614"}, "red"),
            (11, 2, {"standard": "3415", "expandable": "3615"}, "black"),
        ],
    ),
    dict(
        id="patterned-space-backpack", cat="carriers",
        name=T("کوله حمل فضایی برزنتی طرح‌دار پارک‌دار و ساده", "Patterned Canvas Space Backpack",
               "Desenli Kanvas Astronot Sırt Çantası"),
        models=[("standard", "1044", "40×35×33 cm", 2200000),
                ("expandable", "1045", "40×35×33 – 78 cm", 2500000)],
        features=["canvas", "solidBase", "leash", "window"],
        variants=[
            (12, 0, {"standard": "4401", "expandable": "4501"}, None),
            (12, 1, {"standard": "4402", "expandable": "4502"}, None),
            (13, 0, {"standard": "4403", "expandable": "4503"}, None),
            (13, 1, {"standard": "4404", "expandable": "4504"}, None),
            (13, 2, {"standard": "4405", "expandable": "4505"}, None),
            (14, 0, {"standard": "4406", "expandable": "4506"}, None),
            (14, 1, {"standard": "4407", "expandable": "4507"}, None),
            (14, 2, {"standard": "4408", "expandable": "4508"}, None),
        ],
    ),
    dict(
        id="luxury-ear-backpack", cat="carriers",
        name=T("کوله حمل فضایی چرمی لاکچری طرح گوش‌دار", "Luxury Leather Cat-Ear Backpack",
               "Lüks Deri Kulaklı Sırt Çantası"),
        models=[("standard", "1007", "42×33×26 cm", 2300000)],
        features=["leather", "solidBase", "leash", "window"],
        variants=[
            (15, 1, {"standard": "0071"}, "blue"), (15, 0, {"standard": "0072"}, "pink"),
            (15, 2, {"standard": "0073"}, "magenta"), (15, 4, {"standard": "0074"}, "camel"),
            (15, 3, {"standard": "0075"}, "orange"), (16, 0, {"standard": "0076"}, "honey"),
            (16, [589, 265, 969, 514], {"standard": "0077"}, "lightgray"),
            (16, 1, {"standard": "0078"}, "darkgray"), (16, 3, {"standard": "0079"}, "lilac"),
            (16, 2, {"standard": "0710"}, "olive"), (17, 1, {"standard": "0711"}, "green"),
            (17, [616, 262, 996, 513], {"standard": "0712"}, "navy"),
            (17, 2, {"standard": "0713"}, "burgundy"), (17, 4, {"standard": "0714"}, "red"),
            (17, 3, {"standard": "0715"}, "black"),
        ],
    ),
    dict(
        id="canvas-space-backpack", cat="carriers",
        name=T("کوله حمل فضایی برزنتی نرمال پارک‌دار و ساده", "Classic Canvas Space Backpack",
               "Klasik Kanvas Astronot Sırt Çantası"),
        models=[("standard", "1064", "40×35×33 cm", 1750000),
                ("expandable", "1063", "40×35×33 – 78 cm", 1950000)],
        features=["canvas", "solidBase", "leash", "window"],
        variants=[
            (18, 0, {"standard": "6401", "expandable": "6301"}, "lightblue"),
            (18, 1, {"standard": "6402", "expandable": "6302"}, "navy"),
            (18, 2, {"standard": "6403", "expandable": "6303"}, "royal"),
            (19, 0, {"standard": "6404", "expandable": "6304"}, "cream"),
            (19, 1, {"standard": "6405", "expandable": "6305"}, "yellow"),
            (19, 2, {"standard": "6406", "expandable": "6306"}, "lilac"),
            (20, 0, {"standard": "6407", "expandable": "6307"}, "lightgray"),
            (20, 1, {"standard": "6408", "expandable": "6308"}, "red"),
            (20, 2, {"standard": "6409", "expandable": "6309"}, "burgundy"),
            (21, 0, {"standard": "6410", "expandable": "6310"}, "pink"),
            (21, 1, {"standard": "6411", "expandable": "6311"}, "black"),
            (21, 2, {"standard": "6412", "expandable": "6312"}, "red", "striped"),
            (22, 0, {"standard": "6413", "expandable": "6313"}, "purple", "striped"),
            (22, 1, {"standard": "6414", "expandable": "6314"}, "royal", "striped"),
            (22, 2, {"standard": "6415", "expandable": "6315"}, "gray", "striped"),
            (23, 0, {"standard": "6416", "expandable": "6316"}, "copper", "striped"),
            (23, 1, {"standard": "6417", "expandable": "6317"}, "beige", "striped"),
            (23, 2, {"standard": "6418", "expandable": "6318"}, "charcoal", "striped"),
        ],
    ),
    dict(
        id="bird-backpack", cat="carriers",
        name=T("کوله حمل فضایی برزنتی نرمال پرنده", "Canvas Pet & Bird Backpack",
               "Kanvas Evcil Hayvan & Kuş Sırt Çantası"),
        models=[("standard", "1065", "42×35×33 cm", 1750000)],
        features=["canvas", "solidBase", "leash", "window", "perch"],
        variants=[
            (24, 1, {"standard": "6501"}, "lightblue"), (24, 0, {"standard": "6502"}, "navy"),
            (24, 3, {"standard": "6503"}, "royal"), (24, 2, {"standard": "6504"}, "beige"),
            (24, 5, {"standard": "6505"}, "yellow"), (24, 4, {"standard": "6506"}, "purple"),
            (25, 1, {"standard": "6507"}, "lightgray"), (25, 0, {"standard": "6508"}, "red"),
            (25, 3, {"standard": "6509"}, "burgundy"), (25, 2, {"standard": "6510"}, "pink"),
            (25, 5, {"standard": "6511"}, "black"), (25, 4, {"standard": "6512"}, "burgundy", "striped"),
            (26, 1, {"standard": "6513"}, "purple", "striped"), (26, 0, {"standard": "6514"}, "royal", "striped"),
            (26, 2, {"standard": "6515"}, "gray", "striped"),
            (26, [33, 904, 391, 1152], {"standard": "6516"}, "copper", "striped"),
            (26, [611, 904, 969, 1152], {"standard": "6517"}, "brown", "striped"),
        ],
    ),
    dict(
        id="ear-window-backpack", cat="carriers",
        name=T("کوله حمل فضایی برزنتی نرمال با طلق گوش‌دار", "Canvas Backpack with Cat-Ear Window",
               "Kulaklı Şeffaf Pencereli Kanvas Sırt Çantası"),
        models=[("standard", "1066", "42×35×33 cm", 1700000)],
        features=["canvas", "solidBase", "leash", "window"],
        variants=[
            (27, 1, {"standard": "6601"}, "lightblue"), (27, 0, {"standard": "6602"}, "navy"),
            (27, 3, {"standard": "6603"}, "royal"), (27, 2, {"standard": "6604"}, "beige"),
            (27, 5, {"standard": "6605"}, "yellow"), (27, 4, {"standard": "6606"}, "purple"),
            (28, 1, {"standard": "6607"}, "lightgray"), (28, 0, {"standard": "6608"}, "red"),
            (28, 3, {"standard": "6609"}, "burgundy"), (28, 2, {"standard": "6610"}, "pink"),
            (28, 4, {"standard": "6611"}, "black"),
            (29, 1, {"standard": "6613"}, "purple"), (29, 0, {"standard": "6614"}, "blue"),
            (29, 3, {"standard": "6616"}, "brown"), (29, 2, {"standard": "6618"}, "charcoal"),
            (29, 4, {"standard": "6619"}, "orange"),
        ],
    ),
    dict(
        id="front-carrier", cat="carriers",
        name=T("آغوشی سگ و گربه طرح‌دار", "Patterned Dog & Cat Front Carrier",
               "Desenli Kedi & Köpek Kanguru Çantası"),
        models=[("large", "1014", "43×25 cm", 1000000), ("small", "1013", "36×22 cm", 900000)],
        features=["ultraSoft", "velcroLock", "strongStraps", "leash"],
        variants=[
            (30, 2, {"large": "1401", "small": "1301"}, None),
            (30, 1, {"large": "1402", "small": "1302"}, None),
            (30, 0, {"large": "1403", "small": "1303"}, None),
            (30, 5, {"large": "1404", "small": "1304"}, None),
            (30, 4, {"large": "1405", "small": "1305"}, None),
            (30, 3, {"large": "1406", "small": "1306"}, None),
            (30, 8, {"large": "1407", "small": "1307"}, None),
            (30, 7, {"large": "1408", "small": "1308"}, None),
            (30, 6, {"large": "1409", "small": "1309"}, None),
        ],
    ),
    # -------------------------------------------------------------------- beds
    dict(
        id="u-bed", cat="beds",
        name=T("جای خواب تشکی مدل U", "U-Shaped Cushion Bed", "U Model Minderli Yatak"),
        models=[("large", "1048", "16×81×65 cm", 2250000), ("medium", "1047", "16×75×55 cm", 1900000),
                ("small", "1046", "14×60×45 cm", 1450000)],
        features=["reversible", "washable", "nonSlip", "dogCat"],
        variants=[
            (32, 1, {"large": "4801", "medium": None, "small": "4601"}, None),
            (32, 0, {"large": "4802", "medium": "4702", "small": "4602"}, None),
            (32, 2, {"large": "4804", "medium": "4704", "small": "4604"}, None),
            (32, 4, {"large": "4805", "medium": "4705", "small": "4605"}, None),
            (32, 3, {"large": "4806", "medium": "4706", "small": "4606"}, None),
            (31, 0, {"large": "4807", "medium": "4707", "small": "4607"}, None),
            (31, 1, {"large": "4808", "medium": "4708", "small": "4608"}, None),
            (31, 2, {"large": "4809", "medium": "4709", "small": "4609"}, None),
            (31, 3, {"large": "4810", "medium": "4710", "small": "4610"}, None),
        ],
    ),
    dict(
        id="teepee-bed", cat="beds",
        name=T("جای خواب مدل سرخ‌پوستی طرح‌دار", "Patterned Teepee Bed", "Desenli Çadır (Tipi) Yatak"),
        models=[("standard", "1067", "45×48×48 cm", 1700000)],
        features=["nonSlipWaterproof", "smallBreeds"],
        variants=[
            (33, 0, {"standard": "6701"}, None), (33, 1, {"standard": "6703"}, None),
            (33, 2, {"standard": "6706"}, None), (34, 0, {"standard": "6708"}, None),
            (34, 1, {"standard": "6709"}, None),
        ],
    ),
    dict(
        id="three-way-bed", cat="beds",
        name=T("جای خواب سه‌حالته طرح‌دار", "Patterned 3-in-1 Cave Bed", "Desenli 3 Fonksiyonlu Yatak"),
        models=[("medium", "1017", "45×48×48 cm", 1980000), ("small", "1071", "38×38×38 cm", 1400000)],
        features=["nonSlipWaterproof", "smallBreeds"],
        variants=[
            (35, 0, {"medium": "1701", "small": "7101"}, None),
            (35, 1, {"medium": "1702", "small": "7102"}, None),
            (35, 2, {"medium": "1703", "small": "7103"}, None),
            (35, [31, 895, 537, 1145], {"medium": "1704", "small": "7104"}, None),
            (36, 1, {"medium": "1705", "small": "7105"}, None),
            (36, 0, {"medium": "1706", "small": "7106"}, None),
            (36, 2, {"medium": "1707", "small": "7107"}, None),
            (36, [63, 872, 516, 1118], {"medium": "1708", "small": "7108"}, None),
            (36, 3, {"medium": "1709", "small": "7109"}, None),
        ],
    ),
    dict(
        id="cabin-bed", cat="beds",
        name=T("جای خواب مدل کلبه", "Cabin House Bed", "Kulübe Model Yatak"),
        models=[("large", "1038", "55×63×63 cm", 2950000), ("small", "1037", "45×55×55 cm", 1950000)],
        features=["washable", "nonSlip", "dogCat"],
        variants=[
            (37, 0, {"large": "801", "small": "701"}, None),
            (37, 1, {"large": "802", "small": "702"}, None),
            (37, 2, {"large": "803", "small": "703"}, None),
            (37, 3, {"large": "804", "small": "704"}, None),
            (38, 1, {"large": "805", "small": "705"}, None),
            (38, 0, {"large": "806", "small": "706"}, None),
            (38, 2, {"large": "807", "small": "707"}, None),
            (38, 4, {"large": "808", "small": "708"}, None),
            (38, 3, {"large": "809", "small": "709"}, None),
        ],
    ),
    dict(
        id="angel-bed", cat="beds",
        name=T("جای خواب سه‌حالته آنجل", "Angel Plush 3-in-1 Bed", "Angel Peluş 3 Fonksiyonlu Yatak"),
        models=[("standard", "1000", "48×48×48 cm", 2565000)],
        features=["nonSlipWaterproof", "smallBreeds"],
        variants=[
            (39, 0, {"standard": "1001"}, "yellow"),
            (39, [33, 577, 540, 824], {"standard": "1002"}, "pink"),
            (39, [458, 899, 967, 1150], {"standard": "1003"}, "lightblue"),
            (41, 0, {"standard": "1004"}, "plum"),
            (41, [61, 462, 566, 712], {"standard": "1005"}, "lightgray"),
            (41, [487, 682, 992, 932], {"standard": "1006"}, "gray"),
            (41, 1, {"standard": "1007"}, "mint"),
            (40, 0, {"standard": "1008"}, "purple"),
            (40, 1, {"standard": "1009"}, "red"),
            (40, 2, {"standard": "1010"}, "charcoal"),
            (40, 3, {"standard": "1011"}, "navy"),
        ],
    ),
    dict(
        id="small-three-way-bed", cat="beds",
        name=T("جای خواب سه‌حالته کوچک", "Small Velvet 3-in-1 Bed", "Küçük Kadife 3 Fonksiyonlu Yatak"),
        models=[("standard", "1070", "38×38×38 cm", 1300000)],
        features=["velvet"],
        variants=[(42, 0, {"standard": "1070"}, "cream")],
    ),
    # ------------------------------------------------------------------ litter
    dict(
        id="travel-litter", cat="litter",
        name=T("ظرف خاک مسافرتی و کیف حمل خاک", "Travel Litter Box & Litter Bag",
               "Seyahat Kum Kabı & Kum Taşıma Çantası"),
        models=[("litterBox", "1052", "40×40×13 cm", 500000), ("litterBag", "1053", "28×40 cm", 200000)],
        features=["waterproofCanvas", "scoopBag"],
        variants=[(42, 1, {"litterBox": "1052", "litterBag": "1053"}, "black")],
    ),
    # ----------------------------------------------------------------- collars
    dict(
        id="elizabeth-collar", cat="collars",
        name=T("قلاده الیزابت بالشتی", "Soft Pillow Elizabethan Collar", "Yastıklı Elizabeth Yakalığı"),
        models=[("large", "1062", "R 37 cm", 410000), ("small", "1061", "R 25 cm", 350000)],
        features=["softFabric", "elastic", "lightweight"],
        variants=[
            (43, 1, {"large": "6201", "small": "6101"}, None),
            (43, 0, {"large": "6202", "small": "6102"}, None),
            (43, 3, {"large": "6204", "small": "6104"}, None),
            (43, 2, {"large": "6205", "small": "6105"}, None),
            (43, 5, {"large": "6208", "small": "6108"}, None),
            (43, 4, {"large": "6209", "small": "6109"}, None),
        ],
    ),
    # -------------------------------------------------------------- scratchers
    dict(
        id="cat-tree", cat="scratchers",
        name=T("درخت گربه", "Cat Tree", "Kedi Ağacı"),
        models=[("tower", "1021", "120×45×45 cm", 6200000), ("tiered", "1035", "120×40×40 cm", 3200000)],
        features=["multiColor"],
        variants=[
            (46, 4, {"tower": "2101"}, "lilac"), (46, 3, {"tower": "2102"}, "turquoise"),
            (46, 2, {"tower": "2103"}, "charcoal"), (46, 1, {"tower": "2104"}, "beige"),
            (46, 0, {"tower": "2105"}, "white"), (46, 8, {"tiered": "3501"}, "brown"),
            (46, 7, {"tiered": "3502"}, "beige"), (46, 6, {"tiered": "3503"}, "lilacpink"),
            (46, 5, {"tiered": "3504"}, "pink"),
        ],
    ),
    dict(
        id="scratcher-post", cat="scratchers",
        name=T("اسکرچر گربه رنگ‌بندی متنوع", "Cat Scratching Post", "Kedi Tırmalama Direği"),
        models=[("triple", "1042", "", 1050000), ("single", "1031", "", 1050000)],
        features=["multiColor"],
        variants=[(45, 0, {"triple": "1042"}, None), (45, 1, {"single": "1031"}, None)],
    ),
    dict(
        id="arch-scratcher", cat="scratchers",
        name=T("اسکرچر قوسی برس‌دار گربه", "Arch Self-Groomer Cat Scratcher", "Kemerli Tımar Fırçalı Tırmalama"),
        models=[("standard", "1018", "", 1160000)],
        features=["multiColor"],
        variants=[(44, 2, {"standard": "1018"}, None)],
    ),
    dict(
        id="cat-toys", cat="scratchers",
        name=T("اسباب‌بازی گربه", "Cat Toys", "Kedi Oyuncakları"),
        models=[("toyA", "1019", "", 145000), ("toyB", "1020", "", 105000)],
        features=["perPiece"],
        variants=[(44, 1, {"toyA": "1019"}, None), (44, 0, {"toyB": "1020"}, None)],
    ),
    # ------------------------------------------------------------------ covers
    dict(
        id="car-seat-cover", cat="covers",
        name=T("کاور صندلی ماشین", "Pet Car Seat Cover", "Evcil Hayvan Araç Koltuk Örtüsü"),
        models=[("classic", "1023", "135×50×60 cm", 2300000), ("quilted", "1012", "135×50×60 cm", None)],
        features=["carWaterproof", "doorCover", "mesh", "carBag"],
        variants=[
            (47, 7, {"classic": "1023"}, "gray"),
            (47, 3, {"quilted": "1201"}, "orange"),
            (47, 6, {"quilted": "1204"}, "red"), (47, 5, {"quilted": "1205"}, "red"),
            (47, 2, {"quilted": "1206"}, "red"), (47, 1, {"quilted": "1207"}, "red"),
            (47, 0, {}, None, "bag"), (47, 4, {}, None, "belt"),
        ],
    ),
]

EXTRA_LABELS = {
    "bag": T("کیف حمل", "Carry bag", "Taşıma çantası"),
    "belt": T("کمربند ایمنی", "Seat belt tether", "Emniyet kemeri"),
}

# --------------------------------------------------------------------------
# Frame detection
# --------------------------------------------------------------------------
def _runs(mask1d, win, dens, minlen):
    d = np.convolve(mask1d.astype(float), np.ones(win) / win, mode="same")
    on = d >= dens
    segs, i, n = [], 0, len(on)
    while i < n:
        if on[i]:
            j = i
            while j < n and on[j]:
                j += 1
            if j - i >= minlen:
                segs.append((i, j))
            i = j
        else:
            i += 1
    return segs


def detect_boxes(arr):
    """Find dashed rectangular frames (pairs of thin dashed vertical lines)."""
    H, W, _ = arr.shape
    mx, mn = arr.max(2), arr.min(2)
    dark = (mx - mn < 30) & (mx < 185)
    bright = mn > 215
    thin = np.zeros_like(dark)
    thin[:, 4:-4] = dark[:, 4:-4] & bright[:, :-8] & bright[:, 8:]
    segs = []
    for x in range(4, W - 4):
        col = thin[:, x]
        if col.sum() < 60:
            continue
        for y1, y2 in _runs(col, 40, 0.3, 120):
            segs.append([x, y1, y2])
    segs.sort()
    merged = []
    for s in segs:
        if not any(abs(m[0] - s[0]) <= 4 and abs(m[1] - s[1]) < 25 and abs(m[2] - s[2]) < 25 for m in merged):
            merged.append(s)
    merged.sort(key=lambda s: s[0])
    used, boxes = set(), []
    for i, s in enumerate(merged):
        if i in used:
            continue
        best = None
        for j, t in enumerate(merged):
            if j == i or j in used or t[0] <= s[0] + 80:
                continue
            if abs(t[1] - s[1]) < 30 and abs(t[2] - s[2]) < 30:
                if best is None or t[0] < merged[best][0]:
                    best = j
        if best is not None:
            t = merged[best]
            used.update((i, best))
            boxes.append([s[0], min(s[1], t[1]), t[0], max(s[2], t[2])])
    boxes.sort(key=lambda b: (b[1] // 60, -b[0]))
    return boxes


def erase_dashes(arr):
    """Paint the thin grey dashed frame lines white so they never leak into crops."""
    arr = arr.copy()
    H, W, _ = arr.shape
    mx, mn = arr.max(2), arr.min(2)
    greyish = (mx - mn < 30) & (mx < 235)
    bright = mn > 215
    thin_h = np.zeros_like(greyish)
    thin_h[4:-4] = greyish[4:-4] & bright[:-8] & bright[8:]
    thin_v = np.zeros_like(greyish)
    thin_v[:, 4:-4] = greyish[:, 4:-4] & bright[:, :-8] & bright[:, 8:]
    kill = np.zeros_like(greyish)
    for y in range(H):
        for a, b in _runs(thin_h[y], 30, 0.3, 40):
            kill[max(y - 1, 0):y + 2, a:b] |= greyish[max(y - 1, 0):y + 2, a:b]
    for x in range(W):
        for a, b in _runs(thin_v[:, x], 30, 0.3, 40):
            kill[a:b, max(x - 1, 0):x + 2] |= greyish[a:b, max(x - 1, 0):x + 2]
    arr[kill] = 255
    return arr


def crop_variant(img, arr, box):
    x1, y1, x2, y2 = box
    x1, y1, x2, y2 = x1 + 6, y1 + 6, x2 - 6, y2 + 2
    sub = arr[y1:y2, x1:x2]
    h = sub.shape[0]
    # The grey code label (#cacaca) overlaps the frame's bottom edge: cut above it.
    label = (np.abs(sub - 202).max(2) <= 4)
    frac = label.mean(1)
    cut = h
    start = int(h * 0.55)
    for y in range(start, h):
        if frac[y] > 0.12 and frac[y:y + 6].min() > 0.08:
            cut = max(start, y - 8)
            break
    sub = sub[:cut]
    # Trim to the photo content.
    nonwhite = sub.min(2) < 232
    rows = np.where(nonwhite.mean(1) > 0.004)[0]
    cols = np.where(nonwhite.mean(0) > 0.004)[0]
    if len(rows) and len(cols):
        ty1, ty2 = max(rows[0] - 6, 0), min(rows[-1] + 7, sub.shape[0])
        tx1, tx2 = max(cols[0] - 6, 0), min(cols[-1] + 7, sub.shape[1])
    else:
        ty1, ty2, tx1, tx2 = 0, sub.shape[0], 0, sub.shape[1]
    out = img.crop((x1 + tx1, y1 + ty1, x1 + tx2, y1 + ty2))
    # Pad to a 4:3 canvas with white so cards line up.
    w, h = out.size
    tw, th = max(w, int(h * 4 / 3)), max(h, int(w * 3 / 4))
    pad = int(max(tw, th) * 0.05)
    canvas = Image.new("RGB", (tw + 2 * pad, th + 2 * pad), (255, 255, 255))
    canvas.paste(out, ((canvas.width - w) // 2, (canvas.height - h) // 2))
    return canvas


def save_webp(im, path, max_w=800, quality=80):
    if im.width > max_w:
        im = im.resize((max_w, round(im.height * max_w / im.width)), Image.LANCZOS)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    im.save(path, "WEBP", quality=quality, method=6)


# --------------------------------------------------------------------------
# Brand assets
# --------------------------------------------------------------------------
def build_brand(old_pages, pages):
    brand = os.path.join(OUT_IMG, "brand")
    os.makedirs(brand, exist_ok=True)
    src = old_pages.get(2)
    if src:
        im = Image.open(src).convert("RGB").crop((1790, 165, 3170, 1035))
    else:  # fall back to the low-resolution catalog
        im = Image.open(pages[48]).convert("RGB").crop((250, 120, 770, 460))
    a = np.asarray(im).astype(float)
    alpha = np.clip((a[..., 0] - a[..., 2] - 40) / 90, 0, 1)
    for name, rgb in (("logo.png", (241, 118, 58)), ("logo-white.png", (255, 255, 255))):
        out = np.zeros(a.shape[:2] + (4,), np.uint8)
        out[..., :3] = rgb
        out[..., 3] = (alpha * 255).astype(np.uint8)
        logo = Image.fromarray(out, "RGBA")
        logo = logo.crop(logo.getbbox())
        logo = logo.resize((560, round(logo.height * 560 / logo.width)), Image.LANCZOS)
        logo.save(os.path.join(brand, name), optimize=True)
        if name == "logo.png":
            logo.save(os.path.join(brand, "logo.webp"), "WEBP", quality=90)
    # Hero: catalog cover without the logo.
    cover = old_pages.get(1)
    if cover:
        c = Image.open(cover).convert("RGB")
        c = c.crop((0, int(c.height * 0.215), c.width, c.height))
    else:
        c = Image.open(pages[1]).convert("RGB")
        c = c.crop((0, int(c.height * 0.215), c.width, c.height))
    save_webp(c, os.path.join(brand, "hero.webp"), max_w=1000, quality=82)
    c.resize((1200, round(c.height * 1200 / c.width))).crop((0, 0, 1200, 630)).save(
        os.path.join(brand, "og-image.jpg"), quality=82)

    # Category tiles from the transparent product cut-outs in pic/.
    cat_dir = os.path.join(OUT_IMG, "categories")
    os.makedirs(cat_dir, exist_ok=True)
    tiles = {
        "carriers": "pic/koole/3.png", "beds": "pic/bed/3.png", "collars": "pic/Elizabeth/1.png",
        "scratchers": "pic/Skara/2.png", "front": "pic/Harnesses/1.png", "trolley": "pic/koole/1.png",
        "bed-u": "pic/bed/1.png", "bag": "pic/shulder/1.png",
    }
    for key, rel in tiles.items():
        p = os.path.join(ROOT, rel)
        if not os.path.exists(p):
            continue
        t = Image.open(p).convert("RGBA")
        t = t.crop(t.getbbox())
        t.thumbnail((640, 640), Image.LANCZOS)
        t.save(os.path.join(cat_dir, key + ".webp"), "WEBP", quality=85)


# --------------------------------------------------------------------------
def extract_pages(pdf, tmp, prefix, first=None, last=None):
    cmd = ["pdfimages", "-j"]
    if first:
        cmd += ["-f", str(first), "-l", str(last)]
    subprocess.run(cmd + [pdf, os.path.join(tmp, prefix)], check=True)
    files = sorted(f for f in os.listdir(tmp) if f.startswith(prefix + "-"))
    start = first or 1
    return {start + i: os.path.join(tmp, f) for i, f in enumerate(files)}


def main():
    if not shutil.which("pdfimages"):
        sys.exit("pdfimages (poppler-utils) is required")
    tmp = tempfile.mkdtemp(prefix="liliet-")
    try:
        pages = extract_pages(CATALOG, tmp, "p")
        old_pages = {}
        if os.path.exists(OLD_CATALOG):
            old_pages.update(extract_pages(OLD_CATALOG, tmp, "c", 1, 2))
        build_brand(old_pages, pages)

        cache = {}
        out_products = []
        prod_dir = os.path.join(OUT_IMG, "products")
        shutil.rmtree(prod_dir, ignore_errors=True)
        for p in PRODUCTS:
            variants = []
            for n, v in enumerate(p["variants"]):
                page, box, codes, color = v[:4]
                extra = v[4] if len(v) > 4 else None
                if page not in cache:
                    arr = np.asarray(Image.open(pages[page]).convert("RGB")).astype(int)
                    boxes = detect_boxes(arr)
                    arr = erase_dashes(arr)
                    img = Image.fromarray(arr.astype(np.uint8), "RGB")
                    cache[page] = (img, arr, boxes)
                img, arr, boxes = cache[page]
                rect = box if isinstance(box, list) else boxes[box]
                first_code = next((c for c in codes.values() if c), None)
                fname = (first_code or extra or str(n)) + ".webp"
                rel = "assets/img/products/%s/%s" % (p["id"], fname)
                save_webp(crop_variant(img, arr, rect), os.path.join(ROOT, rel))
                item = {"img": rel, "codes": codes}
                if color:
                    fa, en, tr = COLORS[color]
                    if extra == "striped":
                        fa, en, tr = fa + " " + STRIPED[0], STRIPED[1] + " " + en, tr + " " + STRIPED[2]
                    item["color"] = {"fa": fa, "en": en, "tr": tr}
                elif extra in EXTRA_LABELS:
                    item["label"] = EXTRA_LABELS[extra]
                variants.append(item)
            out_products.append({
                "id": p["id"], "cat": p["cat"], "name": p["name"],
                "models": [{"key": k, "code": c, "size": s, "price": pr} for k, c, s, pr in p["models"]],
                "features": p["features"], "variants": variants,
            })
        with open(OUT_JS, "w", encoding="utf-8") as f:
            f.write("/* Generated by tools/build_catalog.py from Liliet05.pdf - do not edit by hand. */\n")
            f.write("window.LILIET_PRODUCTS = ")
            json.dump(out_products, f, ensure_ascii=False, indent=1)
            f.write(";\n")
        n = sum(len(p["variants"]) for p in out_products)
        print("products: %d, variant images: %d" % (len(out_products), n))
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


if __name__ == "__main__":
    main()
