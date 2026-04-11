export const articles = [
  {
    id: 1,
    slug: "national-ayush-mission",
    title: "National AYUSH Mission (NAM): Strengthening Traditional Healthcare Nationwide",
    excerpt: "A flagship, centrally sponsored scheme expanding AYUSH services, education, drug quality and medicinal plant support across India.",

    // ✅ FIXED DATE FORMAT
    date: "2026-04-10",

    author: "AYUSH Policy Analyst",
    

    // ✅ Clean image URL (no query params better for RSS)
    image: "https://res.cloudinary.com/dtarufspt/image/upload/v1775816593/photo-1512621776951-a57141f2eefd_uxpe0t.jpg",

    tag: "Policy",
    featured: true,

  
    toc: [
      "Mission Overview",
      "Key Components",
      "State Implementation",
      "Budget Allocation",
      "Impact Assessment"
    ],

    related: [2, 3, 4],

    content: [
      {
        type: "intro",
        text: "The National AYUSH Mission is a centrally sponsored scheme that aims to provide cost-effective AYUSH services, strengthening educational systems and quality control of ASU & H drugs while facilitating cultivation of medicinal plants.",
      },
      {
        type: "section",
        heading: "Mission Overview",
        body: "Launched in 2014, NAM operates through state governments to integrate AYUSH into the national healthcare system. It focuses on upgrading AYUSH hospitals, dispensaries, and educational institutions while promoting the rich heritage of traditional Indian medicine.",
      }
    ]
  }
  {
    "id": 2,
    "slug": "digital-health-ayurveda-integration",
    "title": "Digital Health & Ayurveda: The Tech-Driven Transformation of Traditional Medicine",
    "excerpt": "Exploring how AI, wearable technology, and the Ayush Grid are modernizing Ayurvedic diagnostics and personalized wellness.",
    
    // ✅ FIXED DATE FORMAT
    "date": "2026-04-11",
    
    "author": "Health-Tech Strategist",
    
    // ✅ Clean image URL
    "image": "https://res.cloudinary.com/dtarufspt/image/upload/v1775897492/images_thdvdb.jpg",
    
    "tag": "Innovation",
    "featured": true,
    
    "toc": [
      "The Rise of Ayush Grid",
      "AI in Prakriti Analysis",
      "Tele-Ayurveda Expansion",
      "Wearable Tech Integration",
      "Future Outlook"
    ],
    
    "related": [1, 5, 8],
    
    "content": [
      {
        "type": "intro",
        "text": "The fusion of ancient wisdom with modern technology is no longer a concept of the future. Digital Health integration in Ayurveda is revolutionizing patient care, making traditional treatments more accessible, data-driven, and globally standardized."
      },
      {
        "type": "section",
        "heading": "The Rise of Ayush Grid",
        "body": "The Ayush Grid project serves as the backbone of this transformation, connecting hospitals, laboratories, and research councils on a single digital platform. This initiative ensures seamless data exchange and enhances the delivery of healthcare services across the AYUSH sector."
      }
    ]
}
];