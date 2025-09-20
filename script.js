// آبجکت حاوی تمام ترجمه‌ها
const translations = {
    en: {
        title: "Happy Pet Shop | Your Pet's Home",
        logo: "🐾 Happy Pet Shop",
        nav_home: "Home",
        nav_services: "Services",
        nav_products: "Products",
        nav_contact: "Contact",
        hero_title: "The Best For Your Best Friend",
        hero_subtitle: "Quality products, expert services, and endless love for your pets.",
        hero_button: "View Products",
        services_title: "Our Services",
        service1_title: "Veterinary Clinic",
        service1_desc: "Periodic check-ups, vaccinations, and expert consultations by top veterinarians.",
        service2_title: "Grooming",
        service2_desc: "Professional grooming, washing, and styling services with standard products.",
        service3_title: "Nutrition Counseling",
        service3_desc: "Providing diet plans tailored to your pet's breed, age, and health condition.",
        products_title: "Featured Products",
        product1_name: "Dry Dog Food",
        product1_brand: "Brand: Royal Canin",
        product2_name: "Cat Toy",
        product2_brand: "For energetic cats",
        product3_name: "Bird Cage",
        product3_brand: "Modern and safe design",
        contact_title: "Get in Touch",
        contact_desc: "Contact us for a free consultation or to ask your questions.",
        contact_phone: "Phone:",
        contact_email: "Email:",
        contact_address: "Address:",
        footer_text: "© 2025 Happy Pet Shop. All rights reserved."
    },
    fa: {
        title: "پت شاپ شاد | خانه حیوانات خانگی شما",
        logo: "🐾 پت شاپ شاد",
        nav_home: "خانه",
        nav_services: "خدمات",
        nav_products: "محصولات",
        nav_contact: "تماس با ما",
        hero_title: "بهترین‌ها برای بهترین دوست شما",
        hero_subtitle: "محصولات با کیفیت، خدمات تخصصی و عشق بی‌پایان برای حیوانات خانگی شما.",
        hero_button: "مشاهده محصولات",
        services_title: "خدمات ما",
        service1_title: "کلینیک دامپزشکی",
        service1_desc: "چکاپ‌های دوره‌ای، واکسیناسیون و مشاوره‌های تخصصی توسط بهترین دامپزشکان.",
        service2_title: "آرایش و پیرایش",
        service2_desc: "خدمات حرفه‌ای کوتاهی مو، شستشو و آرایش حیوانات خانگی با محصولات استاندارد.",
        service3_title: "مشاوره تغذیه",
        service3_desc: "ارائه برنامه‌های غذایی متناسب با نژاد، سن و وضعیت سلامتی حیوان شما.",
        products_title: "محصولات منتخب",
        product1_name: "غذای خشک سگ",
        product1_brand: "برند: رویال کنین",
        product2_name: "اسباب بازی گربه",
        product2_brand: "مخصوص گربه‌های پرانرژی",
        product3_name: "قفس پرنده",
        product3_brand: "طراحی مدرن و ایمن",
        contact_title: "با ما در ارتباط باشید",
        contact_desc: "برای دریافت مشاوره رایگان یا پرسیدن سوالات خود، با ما تماس بگیرید.",
        contact_phone: "تلفن:",
        contact_email: "ایمیل:",
        contact_address: "آدرس:",
        footer_text: "© 2025 پت شاپ شاد. تمام حقوق محفوظ است."
    },
    tr: {
        title: "Mutlu Pet Shop | Evcil Hayvanınızın Evi",
        logo: "🐾 Mutlu Pet Shop",
        nav_home: "Anasayfa",
        nav_services: "Hizmetler",
        nav_products: "Ürünler",
        nav_contact: "İletişim",
        hero_title: "En İyi Dostunuz İçin En İyisi",
        hero_subtitle: "Kaliteli ürünler, uzman hizmetler ve evcil hayvanlarınız için sonsuz sevgi.",
        hero_button: "Ürünleri Görüntüle",
        services_title: "Hizmetlerimiz",
        service1_title: "Veteriner Kliniği",
        service1_desc: "En iyi veterinerler tarafından periyodik kontroller, aşılamalar ve uzman danışmanlık.",
        service2_title: "Tüy Bakımı",
        service2_desc: "Standart ürünlerle profesyonel tüy kesimi, yıkama ve stil hizmetleri.",
        service3_title: "Beslenme Danışmanlığı",
        service3_desc: "Evcil hayvanınızın cinsine, yaşına ve sağlık durumuna uygun diyet planları sunma.",
        products_title: "Öne Çıkan Ürünler",
        product1_name: "Kuru Köpek Maması",
        product1_brand: "Marka: Royal Canin",
        product2_name: "Kedi Oyuncağı",
        product2_brand: "Enerjik kediler için",
        product3_name: "Kuş Kafesi",
        product3_brand: "Modern ve güvenli tasarım",
        contact_title: "İletişime Geçin",
        contact_desc: "Ücretsiz danışmanlık veya sorularınız için bizimle iletişime geçin.",
        contact_phone: "Telefon:",
        contact_email: "E-posta:",
        contact_address: "Adres:",
        footer_text: "© 2025 Mutlu Pet Shop. Tüm hakları saklıdır."
    }
};

// تابع برای تغییر زبان
function changeLanguage(lang) {
    // تغییر جهت و زبان صفحه برای فارسی
    if (lang === 'fa') {
        document.documentElement.setAttribute('lang', 'fa');
        document.documentElement.setAttribute('dir', 'rtl');
    } else {
        document.documentElement.setAttribute('lang', lang);
        document.documentElement.setAttribute('dir', 'ltr');
    }

    // انتخاب تمام المنت‌هایی که نیاز به ترجمه دارند
    const elements = document.querySelectorAll('[data-lang]');
    
    // جایگزینی متن‌ها با ترجمه مناسب
    elements.forEach(element => {
        const key = element.getAttribute('data-lang');
        if (translations[lang][key]) {
            element.textContent = translations[lang][key];
        }
    });
}

// تنظیم زبان پیش‌فرض هنگام بارگذاری صفحه
document.addEventListener('DOMContentLoaded', () => {
    changeLanguage('fa'); // زبان پیش‌فرض فارسی
});