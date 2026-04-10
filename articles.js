export const articles = [
  {
    id: 1,
    slug: "national-ayush-mission",
    title: "National AYUSH Mission (NAM): Strengthening Traditional Healthcare Nationwide",
    excerpt: "A flagship, centrally sponsored scheme expanding AYUSH services, education, drug quality and medicinal plant support across India.",

    // ✅ FIXED DATE FORMAT
    date: "2026-04-010",

    author: "AYUSH Policy Analyst",

    // ✅ Clean image URL (no query params better for RSS)
    image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd",

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
];