// ==================== بخش چند زبانه ====================

// آبجکت حاوی تمام ترجمه‌ها
const translations = {
    en: {
        title: "Lilietpet.com | Online Pet Products Store",
        nav_home: "Home",
        nav_products: "Products",
        nav_catalog: "Catalog",
        nav_contact: "Contact",
        hero_title: "Quality and Variety for Your Pet",
        hero_subtitle: "Find the best products for your little friend at Lilietpet.com.",
        hero_button: "View All Products",
        catalog_title: "Smart Product Catalog",
        catalog_desc: "View and download our latest product collection in a comprehensive PDF file.",
        catalog_button: "📥 Download PDF Catalog",
        products_title: "Product Catalog",
        product1_name: "Adult Dry Dog Food",
        product1_brand: "Brand: Royal Canin",
        product2_name: "Fish-shaped Cat Toy",
        product2_brand: "For energetic cats",
        product3_name: "Large Bird Cage",
        product3_brand: "Modern and safe design",
        product4_name: "Desktop Glass Aquarium",
        product4_brand: "Includes full equipment",
        contact_title: "Get in Touch",
        contact_desc: "Contact us for wholesale orders or to get a consultation.",
        contact_phone: "Phone:",
        contact_email: "Email:",
        contact_address: "Address:",
        footer_text: "© 2025 Lilietpet.com. All rights reserved."
    },
    fa: {
        title: "Lilietpet.com | فروشگاه آنلاین محصولات حیوانات خانگی",
        nav_home: "خانه",
        nav_products: "محصولات",
        nav_catalog: "کاتالوگ",
        nav_contact: "تماس با ما",
        hero_title: "کیفیت و تنوع برای حیوان خانگی شما",
        hero_subtitle: "در Lilietpet.com بهترین محصولات را برای دوست کوچک خود پیدا کنید.",
        hero_button: "مشاهده همه محصولات",
        catalog_title: "کاتالوگ هوشمند محصولات",
        catalog_desc: "آخرین مجموعه محصولات ما را در قالب یک فایل PDF جامع مشاهده و دانلود کنید.",
        catalog_button: "📥 دانلود کاتالوگ PDF",
        products_title: "کاتالوگ محصولات",
        product1_name: "غذای خشک سگ بالغ",
        product1_brand: "برند: رویال کنین",
        product2_name: "اسباب بازی گربه مدل ماهی",
        product2_brand: "مخصوص گربه‌های پرانرژی",
        product3_name: "قفس پرنده بزرگ",
        product3_brand: "طراحی مدرن و ایمن",
        product4_name: "آکواریوم شیشه‌ای رومیزی",
        product4_brand: "به همراه تجهیزات کامل",
        contact_title: "با ما در ارتباط باشید",
        contact_desc: "برای سفارشات عمده و یا دریافت مشاوره با ما تماس بگیرید.",
        contact_phone: "تلفن:",
        contact_email: "ایمیل:",
        contact_address: "آدرس:",
        footer_text: "© 2025 Lilietpet.com. تمام حقوق محفوظ است."
    },
    tr: {
        title: "Lilietpet.com | Online Evcil Hayvan Ürünleri Mağazası",
        nav_home: "Anasayfa",
        nav_products: "Ürünler",
        nav_catalog: "Katalog",
        nav_contact: "İletişim",
        hero_title: "Evcil Hayvanınız İçin Kalite ve Çeşitlilik",
        hero_subtitle: "Küçük dostunuz için en iyi ürünleri Lilietpet.com'da bulun.",
        hero_button: "Tüm Ürünleri Görüntüle",
        catalog_title: "Akıllı Ürün Kataloğu",
        catalog_desc: "En son ürün koleksiyonumuzu kapsamlı bir PDF dosyasında görüntüleyin ve indirin.",
        catalog_button: "📥 PDF Kataloğu İndir",
        products_title: "Ürün Kataloğu",
        product1_name: "Yetişkin Kuru Köpek Maması",
        product1_brand: "Marka: Royal Canin",
        product2_name: "Balık Şeklinde Kedi Oyuncağı",
        product2_brand: "Enerjik kediler için",
        product3_name: "Büyük Kuş Kafesi",
        product3_brand: "Modern ve güvenli tasarım",
        product4_name: "Masaüstü Cam Akvaryum",
        product4_brand: "Tüm ekipmanlar dahil",
        contact_title: "İletişime Geçin",
        contact_desc: "Toptan siparişler veya danışmanlık için bizimle iletişime geçin.",
        contact_phone: "Telefon:",
        contact_email: "E-posta:",
        contact_address: "Adres:",
        footer_text: "© 2025 Lilietpet.com. Tüm hakları saklıdır."
    }
};

// تابع برای تغییر زبان
function changeLanguage(lang) {
    if (lang === 'fa') {
        document.documentElement.setAttribute('dir', 'rtl');
    } else {
        document.documentElement.setAttribute('dir', 'ltr');
    }
    document.documentElement.setAttribute('lang', lang);

    const elements = document.querySelectorAll('[data-lang]');
    elements.forEach(element => {
        const key = element.getAttribute('data-lang');
        if (translations[lang][key]) {
            element.textContent = translations[lang][key];
        }
    });
}

// ==================== بخش منوی موبایل ====================

document.addEventListener('DOMContentLoaded', () => {
    // تنظیم زبان پیش‌فرض
    changeLanguage('fa'); 

    const mobileMenuIcon = document.querySelector('.mobile-menu-icon');
    const navLinks = document.querySelector('.nav-links');

    // باز و بسته کردن منو با کلیک روی آیکون
    mobileMenuIcon.addEventListener('click', () => {
        navLinks.classList.toggle('active');
    });

    // بستن منو با کلیک روی هر یک از لینک‌ها
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', () => {
            navLinks.classList.remove('active');
        });
    });
});