// server.ts
import "dotenv/config";
import express from "express";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import multer from "multer";
import { put } from "@vercel/blob";
import { createServer as createViteServer } from "vite";

// src/types/store.ts
var ALL_PRODUCT_CATEGORIES = [
  "Body Splash",
  "Batom",
  "Gloss",
  "Cosm\xE9ticos",
  "M\xE1scaras",
  "Bases",
  "Hidratantes",
  "Cestas",
  "Bon\xE9s",
  "Acess\xF3rios"
];

// src/data/seedCatalog.ts
var GENERATED_IMAGES = {
  heroEditorial: "/src/assets/images/hero_beauty_editorial_1794666450438.jpg",
  glossCharm: "/src/assets/images/prod_gloss_charm_1794666450618.jpg",
  bodySplash: "/src/assets/images/prod_body_splash_1794666452189.jpg",
  batomVelvet: "/src/assets/images/prod_batom_velvet_1794666452287.jpg",
  cestaPresente: "/src/assets/images/prod_cesta_presente_1794666452579.jpg",
  boneCosmeticos: "/src/assets/images/prod_bone_cosmeticos_1794666455674.jpg",
  cosmeticos: "/src/assets/images/cat_cosmeticos_paleta_1794669305587.jpg",
  mascaras: "/src/assets/images/cat_mascaras_facial_1794669305757.jpg",
  bases: "/src/assets/images/cat_bases_serum_1794669307157.jpg",
  hidratantes: "/src/assets/images/cat_hidratantes_creme_1794669306993.jpg",
  acessorios: "/src/assets/images/cat_acessorios_pinceis_1794669306823.jpg"
};
var OFFICIAL_LOGO_URL = "https://i.postimg.cc/6QDbnC50/Logo-Bella-Menina-em-Rosa-Metalico.png";
var CATEGORY_IMAGES = {
  "Body Splash": GENERATED_IMAGES.bodySplash,
  Batom: GENERATED_IMAGES.batomVelvet,
  Gloss: GENERATED_IMAGES.glossCharm,
  Cosm\u00E9ticos: GENERATED_IMAGES.cosmeticos,
  M\u00E1scaras: GENERATED_IMAGES.mascaras,
  Bases: GENERATED_IMAGES.bases,
  Hidratantes: GENERATED_IMAGES.hidratantes,
  Cestas: GENERATED_IMAGES.cestaPresente,
  Bon\u00E9s: GENERATED_IMAGES.boneCosmeticos,
  Acess\u00F3rios: GENERATED_IMAGES.acessorios
};
function slugifyCategory(name) {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
var INITIAL_CATEGORIES = ALL_PRODUCT_CATEGORIES.map((name, idx) => ({
  id: `cat-${slugifyCategory(name)}`,
  name,
  imageUrl: CATEGORY_IMAGES[name] || "",
  order: idx,
  createdAt: "2026-11-01T09:00:00.000Z",
  updatedAt: "2026-11-01T09:00:00.000Z"
}));
var INITIAL_SETTINGS = {
  storeName: "Bella Menina Makeup",
  slogan: "Tudo para real\xE7ar sua beleza!",
  whatsappNumber: "5562999994321",
  whatsappWelcome: "Oi, linda! Bem-vinda \xE0 Bella Menina Makeup. Como podemos real\xE7ar sua beleza hoje?",
  whatsappOrderTemplate: "Ol\xE1, Bella Menina Makeup! Quero finalizar meu pedido pelo WhatsApp:",
  instagramUrl: "https://instagram.com/bellameninamakeup_",
  tiktokUrl: "https://tiktok.com/@bellameninamakeup",
  facebookUrl: "https://facebook.com/bellameninamakeup",
  businessHours: "Seg a S\xE1b \xB7 09h \xE0s 19h (Alameda Higino Pires Martins, Solar Ville \u2013 Goi\xE2nia/GO)",
  footerText: "Bella Menina Makeup \xB7 Makes a partir de R$ 5,00 em Goi\xE2nia \u2013 GO e para todo o Brasil.",
  heroBannerUrl: GENERATED_IMAGES.heroEditorial,
  secondaryBannerUrl: GENERATED_IMAGES.cestaPresente,
  seoTitle: "Bella Menina Makeup \u2013 Tudo para real\xE7ar sua beleza!",
  seoDescription: "Maquiagem e cosm\xE9ticos a partir de R$ 5,00 em Goi\xE2nia \u2013 GO. Body splash, batons, glosses com charms, m\xE1scaras, bases, hidratantes, cestas e bon\xE9s com entrega r\xE1pida e Correios.",
  primaryColor: "#FF2D6F",
  logoUrl: OFFICIAL_LOGO_URL,
  shippingConfig: {
    originCep: "74470538",
    goianiaExpressFee: 12,
    freeShippingMinSubtotal: 199,
    enableGoianiaExpress: true,
    enableStorePickup: true,
    enableCorreiosPac: true,
    enableCorreiosSedex: true,
    extraHandlingDays: 0
  },
  paymentConfig: {
    enablePix: true,
    pixKey: "bellameninamakeup@pix.com.br",
    pixDiscountPercent: 5,
    enableCreditCard: true,
    maxInstallments: 6,
    enableDebitCard: true,
    enableCashOnDelivery: true
  },
  updatedAt: "2026-11-14T09:00:00.000Z"
};
var INITIAL_PRODUCTS = [
  {
    id: "prod-gloss-charm-cereja",
    name: "Gloss Glow com Charm Cereja & Soda",
    description: "Brilho labial espelhado enriquecido com \xF3leo de jojoba e vitamina E. Acompanha pingente colecion\xE1vel banhado a dourado (Cereja ou Soda Pop) preso \xE0 tampa para levar na bolsa ou celular.",
    price: 24.9,
    promoPrice: 18.9,
    stock: 28,
    sku: "BM-GLS-001",
    category: "Gloss",
    brand: "Bella Menina Exclusive",
    tags: ["gloss", "charms", "novidade", "cereja"],
    weightGrams: 75,
    images: [GENERATED_IMAGES.glossCharm, GENERATED_IMAGES.heroEditorial],
    swatches: [
      { name: "Cereja Fizz", hex: "#E11D48" },
      { name: "Soda Pop Pink", hex: "#FF2D6F" },
      { name: "Morango Cristal", hex: "#FB7185" }
    ],
    status: "active",
    isNew: true,
    salesCount: 164,
    createdAt: "2026-11-01T10:00:00.000Z",
    updatedAt: "2026-11-12T14:00:00.000Z"
  },
  {
    id: "prod-body-splash-rose",
    name: "Body Splash Ros\xE9 Lumi\xE8re 200ml",
    description: "Bruma corporal perfumada com notas de p\xE9talas de rosa damascena, framboesa fresca e baunilha suave. Fixa\xE7\xE3o delicada de longa dura\xE7\xE3o para o dia inteiro.",
    price: 54.9,
    promoPrice: 44.9,
    stock: 19,
    sku: "BM-BSP-002",
    category: "Body Splash",
    brand: "Bella Menina Atelier",
    tags: ["body splash", "perfumaria", "presente"],
    weightGrams: 290,
    images: [GENERATED_IMAGES.bodySplash, GENERATED_IMAGES.heroEditorial],
    swatches: [
      { name: "Ros\xE9 Floral", hex: "#F472B6" },
      { name: "Morango Chantilly", hex: "#FF2D6F" }
    ],
    status: "active",
    isNew: true,
    salesCount: 132,
    createdAt: "2026-11-02T10:00:00.000Z",
    updatedAt: "2026-11-13T10:00:00.000Z"
  },
  {
    id: "prod-batom-velvet-couture",
    name: "Batom Velvet Matte Alta Pigmenta\xE7\xE3o",
    description: "Textura aveludada que desliza sem ressecar os l\xE1bios, com acabamento soft-matte e \xE1cido hialur\xF4nico. Cores pensadas para todos os tons de pele.",
    price: 22.9,
    promoPrice: 14.9,
    stock: 34,
    sku: "BM-BTM-003",
    category: "Batom",
    brand: "Bella Menina",
    tags: ["batom", "matte", "swatch"],
    weightGrams: 60,
    images: [GENERATED_IMAGES.batomVelvet, GENERATED_IMAGES.heroEditorial],
    swatches: [
      { name: "Nude Goi\xE2nia", hex: "#C06C76" },
      { name: "Rosa Malva", hex: "#B95479" },
      { name: "Vinho Cereja", hex: "#7F1D3A" }
    ],
    status: "active",
    isNew: false,
    salesCount: 148,
    createdAt: "2026-10-20T10:00:00.000Z",
    updatedAt: "2026-11-10T10:00:00.000Z"
  },
  {
    id: "prod-lip-balm-cinco",
    name: "Creme Hidratante Cloud & Lip Balm Frutinhas",
    description: "Hidratante facial e labial di\xE1rio com manteiga de karit\xE9 e cheirinho irresist\xEDvel de morango. Nosso queridinho de entrada a partir de R$ 5,00 para deixar sempre na n\xE9cessaire.",
    price: 7,
    promoPrice: 5,
    stock: 6,
    sku: "BM-ACH-005",
    category: "Hidratantes",
    brand: "Bella Menina Pop",
    tags: ["a partir de 5", "achadinho", "hidratante"],
    weightGrams: 40,
    images: [GENERATED_IMAGES.hidratantes],
    swatches: [
      { name: "Morango", hex: "#FF4D79" },
      { name: "Melancia", hex: "#FB7185" }
    ],
    status: "active",
    isNew: true,
    salesCount: 215,
    createdAt: "2026-10-15T10:00:00.000Z",
    updatedAt: "2026-11-14T08:00:00.000Z"
  },
  {
    id: "prod-cesta-encanto",
    name: "Cesta Presente Encanto Rosa Completo",
    description: "Cesta artesanal com la\xE7o de cetim ros\xE9 contendo 2 glosses glow, hidratante facial de rosas, 2 m\xE1scaras faciais coreanas e rolinho massageador de quartzo rosa.",
    price: 139.9,
    promoPrice: 119.9,
    stock: 7,
    sku: "BM-CST-004",
    category: "Cestas",
    brand: "Bella Menina Gift",
    tags: ["cesta", "presente", "skincare", "luxo"],
    weightGrams: 850,
    images: [GENERATED_IMAGES.cestaPresente],
    swatches: [{ name: "Edi\xE7\xE3o Ros\xE9 Cetim", hex: "#F9A8D4" }],
    status: "active",
    isNew: true,
    salesCount: 64,
    createdAt: "2026-11-04T10:00:00.000Z",
    updatedAt: "2026-11-12T10:00:00.000Z"
  },
  {
    id: "prod-bone-kit-glow",
    name: "Bon\xE9 Pastel Ros\xE9 + Duo Blush & Hidratante",
    description: "Bon\xE9 estruturado em sarja 100% algod\xE3o com regulagem traseira combinado com hidratante facial Glow Dew e paleta de blush iluminador com espelho.",
    price: 69.9,
    promoPrice: 54.9,
    stock: 14,
    sku: "BM-BON-006",
    category: "Bon\xE9s",
    brand: "Bella Menina Street",
    tags: ["bon\xE9", "acess\xF3rios", "blush"],
    weightGrams: 340,
    images: [GENERATED_IMAGES.boneCosmeticos],
    swatches: [
      { name: "Rosa Beb\xEA", hex: "#FBCFE8" },
      { name: "Pink Vibrante", hex: "#FF2D6F" }
    ],
    status: "active",
    isNew: false,
    salesCount: 53,
    createdAt: "2026-10-28T10:00:00.000Z",
    updatedAt: "2026-11-11T10:00:00.000Z"
  },
  {
    id: "prod-base-hidratante-matte",
    name: "Base S\xE9rum Soft Glow Alta Cobertura",
    description: "Cobertura m\xE9dia constru\xEDvel com efeito segunda pele, controle de oleosidade e niacinamida. Ideal para o clima quente de Goi\xE2nia sem craquelar.",
    price: 36.9,
    promoPrice: 29.9,
    stock: 22,
    sku: "BM-BAS-007",
    category: "Bases",
    brand: "Bella Menina Pro",
    tags: ["base", "pele", "matte", "niacinamida"],
    weightGrams: 130,
    images: [GENERATED_IMAGES.bases, GENERATED_IMAGES.heroEditorial],
    swatches: [
      { name: "Claro 01", hex: "#F3D2C1" },
      { name: "M\xE9dio 03", hex: "#DDA982" },
      { name: "Escuro 06", hex: "#8D5524" }
    ],
    status: "active",
    isNew: false,
    salesCount: 92,
    createdAt: "2026-10-22T10:00:00.000Z",
    updatedAt: "2026-11-09T10:00:00.000Z"
  },
  {
    id: "prod-mascara-rosa-mosqueta",
    name: "M\xE1scara Facial Rosa Mosqueta + Esponja",
    description: "Combo skincare express a partir de precinhos irresist\xEDveis: m\xE1scara em tecido calmante com extrato de rosas + mini esponja macia para aplica\xE7\xE3o de corretivo.",
    price: 9.9,
    promoPrice: 6.5,
    stock: 4,
    sku: "BM-MSK-008",
    category: "M\xE1scaras",
    brand: "Bella Menina Care",
    tags: ["m\xE1scara", "esponja", "achadinho"],
    weightGrams: 65,
    images: [GENERATED_IMAGES.mascaras],
    swatches: [{ name: "Rosa Mosqueta", hex: "#F43F5E" }],
    status: "active",
    isNew: true,
    salesCount: 162,
    createdAt: "2026-11-06T10:00:00.000Z",
    updatedAt: "2026-11-14T07:00:00.000Z"
  },
  {
    id: "prod-paleta-blush-iluminador",
    name: "Paleta Trio Blush & Iluminador Ros\xE9",
    description: "Tr\xEAs tons micronizados com microp\xE9rolas iluminadoras e sombras cintilantes para bochechas coradas e radiantes o dia todo.",
    price: 34.9,
    promoPrice: 27.9,
    stock: 15,
    sku: "BM-COS-009",
    category: "Cosm\xE9ticos",
    brand: "Bella Menina Pro",
    tags: ["blush", "iluminador", "paleta"],
    weightGrams: 110,
    images: [GENERATED_IMAGES.cosmeticos, GENERATED_IMAGES.heroEditorial],
    swatches: [{ name: "Ros\xE9 Champagne", hex: "#F472B6" }],
    status: "active",
    isNew: true,
    salesCount: 84,
    createdAt: "2026-11-07T10:00:00.000Z",
    updatedAt: "2026-11-13T15:00:00.000Z"
  },
  {
    id: "prod-kit-pinceis-cetim",
    name: "Kit Mini Pinc\xE9is & Espelho Pocket Pink",
    description: "Acess\xF3rios essenciais para retoques r\xE1pidos na bolsa: pinc\xE9is macios sint\xE9ticos rosa e champagne gold + espelho pocket rosa pink + esponja gota.",
    price: 29.9,
    promoPrice: 24.9,
    stock: 0,
    sku: "BM-ACS-010",
    category: "Acess\xF3rios",
    brand: "Bella Menina",
    tags: ["acess\xF3rios", "pinc\xE9is", "espelho"],
    weightGrams: 120,
    images: [GENERATED_IMAGES.acessorios],
    swatches: [{ name: "Pink Pearl", hex: "#FF2D6F" }],
    status: "active",
    isNew: false,
    salesCount: 71,
    createdAt: "2026-10-18T10:00:00.000Z",
    updatedAt: "2026-11-10T10:00:00.000Z"
  }
];
var INITIAL_COUPONS = [
  {
    id: "cup-bella10",
    code: "BELLA10",
    type: "percent",
    value: 10,
    minPurchase: 30,
    maxUses: 500,
    usedCount: 18,
    expiresAt: "2027-12-31T23:59:59.000Z",
    active: true,
    createdAt: "2026-11-01T10:00:00.000Z",
    updatedAt: "2026-11-01T10:00:00.000Z"
  },
  {
    id: "cup-goiania5",
    code: "BEMVINDA5",
    type: "fixed",
    value: 5,
    minPurchase: 25,
    maxUses: 300,
    usedCount: 9,
    expiresAt: "2027-12-31T23:59:59.000Z",
    active: true,
    createdAt: "2026-11-01T10:00:00.000Z",
    updatedAt: "2026-11-01T10:00:00.000Z"
  }
];
var INITIAL_CUSTOMERS = [
  {
    id: "cust-mariana",
    name: "Mariana Oliveira Silva",
    email: "mariana@bellacliente.com",
    cpf: "123.456.789-01",
    birthDate: "1998-05-14",
    phone: "(62) 99812-4410",
    secondaryPhone: "(62) 3251-1190",
    role: "customer",
    blocked: false,
    addresses: [
      {
        id: "addr-1",
        label: "Casa (Setor Marista)",
        recipientName: "Mariana Oliveira Silva",
        cep: "74150-050",
        street: "Rua 135",
        number: "412",
        complement: "Apto 802",
        neighborhood: "Setor Marista",
        city: "Goi\xE2nia",
        state: "GO",
        isDefault: true
      }
    ],
    createdAt: "2026-10-12T10:00:00.000Z",
    updatedAt: "2026-11-10T10:00:00.000Z"
  },
  {
    id: "cust-larissa",
    name: "Larissa Mendon\xE7a Costa",
    email: "larissa@bellacliente.com",
    cpf: "456.789.123-22",
    birthDate: "1995-09-23",
    phone: "(11) 98234-9901",
    role: "customer",
    blocked: false,
    addresses: [
      {
        id: "addr-2",
        label: "Trabalho (Paulista)",
        recipientName: "Larissa Mendon\xE7a Costa",
        cep: "01310-100",
        street: "Avenida Paulista",
        number: "1500",
        complement: "Conjunto 42",
        neighborhood: "Bela Vista",
        city: "S\xE3o Paulo",
        state: "SP",
        isDefault: true
      }
    ],
    createdAt: "2026-10-28T15:00:00.000Z",
    updatedAt: "2026-11-12T11:00:00.000Z"
  },
  {
    id: "cust-camila",
    name: "Camila Ferreira Rocha",
    email: "camila@bellacliente.com",
    cpf: "789.321.654-09",
    birthDate: "2001-02-08",
    phone: "(62) 99145-8821",
    role: "customer",
    blocked: false,
    addresses: [
      {
        id: "addr-3",
        label: "Resid\xEAncia Solar Ville",
        recipientName: "Camila Ferreira Rocha",
        cep: "74470-538",
        street: "Alameda Higino Pires Martins",
        number: "118",
        neighborhood: "Residencial Solar Ville",
        city: "Goi\xE2nia",
        state: "GO",
        isDefault: true
      }
    ],
    createdAt: "2026-11-01T09:00:00.000Z",
    updatedAt: "2026-11-13T16:00:00.000Z"
  }
];
var INITIAL_WAITLIST = [
  {
    id: "wl-1",
    customerId: "cust-mariana",
    customerEmail: "mariana@bellacliente.com",
    productId: "prod-kit-pinceis-cetim",
    productName: "Kit Mini Pinc\xE9is & Espelho Pocket Pink",
    productImage: GENERATED_IMAGES.cestaPresente,
    productPrice: 24.9,
    createdAt: "2026-11-13T12:00:00.000Z"
  }
];
var INITIAL_ORDERS = [
  {
    id: "ord-1041",
    orderNumber: "BM-1041",
    customerId: "cust-mariana",
    customerName: "Mariana Oliveira Silva",
    customerEmail: "mariana@bellacliente.com",
    customerPhone: "(62) 99812-4410",
    address: {
      cep: "74150-050",
      street: "Rua 135",
      number: "412",
      complement: "Apto 802",
      neighborhood: "Setor Marista",
      city: "Goi\xE2nia",
      state: "GO"
    },
    items: [
      {
        productId: "prod-gloss-charm-cereja",
        name: "Gloss Glow com Charm Cereja & Soda",
        sku: "BM-GLS-001",
        unitPrice: 18.9,
        quantity: 2,
        swatchName: "Cereja Fizz"
      },
      {
        productId: "prod-body-splash-rose",
        name: "Body Splash Ros\xE9 Lumi\xE8re 200ml",
        sku: "BM-BSP-002",
        unitPrice: 44.9,
        quantity: 1,
        swatchName: "Ros\xE9 Floral"
      }
    ],
    subtotal: 82.7,
    discount: 8.27,
    shippingCost: 12,
    shippingMethod: "Entrega Expressa Goi\xE2nia & Regi\xE3o",
    trackingCode: "GYN-EXP-1041",
    couponCode: "BELLA10",
    total: 86.43,
    origin: "site",
    paymentMethod: "Pix",
    status: "delivered",
    createdAt: new Date(Date.now() - 2 * 864e5).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 864e5).toISOString()
  },
  {
    id: "ord-1042",
    orderNumber: "BM-1042",
    customerId: "cust-camila",
    customerName: "Camila Ferreira Rocha",
    customerEmail: "camila@bellacliente.com",
    customerPhone: "(62) 99145-8821",
    items: [
      {
        productId: "prod-cesta-encanto",
        name: "Cesta Presente Encanto Rosa Completo",
        sku: "BM-CST-004",
        unitPrice: 119.9,
        quantity: 1
      }
    ],
    subtotal: 119.9,
    discount: 0,
    shippingCost: 0,
    shippingMethod: "Retirada Balc\xE3o \u2013 Solar Ville",
    total: 119.9,
    origin: "balcao",
    paymentMethod: "Cart\xE3o de Cr\xE9dito",
    status: "delivered",
    createdAt: new Date(Date.now() - 1 * 864e5).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 864e5).toISOString()
  },
  {
    id: "ord-1043",
    orderNumber: "BM-1043",
    customerId: "cust-larissa",
    customerName: "Larissa Mendon\xE7a Costa",
    customerEmail: "larissa@bellacliente.com",
    customerPhone: "(11) 98234-9901",
    address: {
      cep: "01310-100",
      street: "Avenida Paulista",
      number: "1500",
      complement: "Conjunto 42",
      neighborhood: "Bela Vista",
      city: "S\xE3o Paulo",
      state: "SP"
    },
    items: [
      {
        productId: "prod-batom-velvet-couture",
        name: "Batom Velvet Matte Alta Pigmenta\xE7\xE3o",
        sku: "BM-BTM-003",
        unitPrice: 14.9,
        quantity: 3,
        swatchName: "Rosa Malva"
      },
      {
        productId: "prod-lip-balm-cinco",
        name: "Lip Balm Hidratante Frutinhas (Achadinho)",
        sku: "BM-ACH-005",
        unitPrice: 5,
        quantity: 2
      }
    ],
    subtotal: 54.7,
    discount: 0,
    shippingCost: 25.4,
    shippingMethod: "Correios PAC",
    trackingCode: "BR884129301GO",
    total: 80.1,
    origin: "whatsapp",
    paymentMethod: "Pix via WhatsApp",
    status: "shipped",
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  }
];
var INITIAL_FEEDBACKS = [
  {
    id: "fb-1",
    customerName: "Isabela Costa",
    neighborhood: "Setor Bueno \xB7 Goi\xE2nia/GO",
    rating: 5,
    comment: "O gloss com charm de cereja chegou no mesmo dia aqui no Bueno! Embalagem cheirosa, brilho perfeito e nada pegajoso.",
    productName: "Gloss Glow com Charm Cereja & Soda",
    approved: true,
    createdAt: "2026-11-10T14:20:00.000Z"
  },
  {
    id: "fb-2",
    customerName: "Beatriz Almeida",
    neighborhood: "Residencial Solar Ville \xB7 Goi\xE2nia/GO",
    rating: 5,
    comment: "Sempre compro meus achadinhos a partir de R$ 5,00 e o Body Splash Ros\xE9 fixa o dia inteiro. Atendimento impec\xE1vel!",
    productName: "Body Splash Ros\xE9 Lumi\xE8re 200ml",
    approved: true,
    createdAt: "2026-11-11T16:45:00.000Z"
  },
  {
    id: "fb-3",
    customerName: "Rafaela Tavares",
    neighborhood: "Moema \xB7 S\xE3o Paulo/SP",
    rating: 5,
    comment: "Pedi a Cesta Encanto Rosa pelo site com c\xE1lculo do SEDEX autom\xE1tico. Chegou super bem protegida para presente!",
    productName: "Cesta Presente Encanto Rosa Completo",
    approved: true,
    createdAt: "2026-11-12T11:10:00.000Z"
  }
];
var INITIAL_ADMIN_LOGS = [
  {
    id: "log-1",
    actorEmail: "admin@x.com",
    action: "Sistema inicializado",
    entityType: "settings",
    details: "Loja Bella Menina Makeup configurada com cat\xE1logo inicial e Correios.",
    createdAt: "2026-11-14T08:30:00.000Z"
  },
  {
    id: "log-2",
    actorEmail: "admin@x.com",
    action: "C\xF3digo de rastreio atualizado",
    entityType: "order",
    entityId: "ord-1043",
    details: "Pedido #BM-1043 marcado como Enviado (BR884129301GO).",
    createdAt: "2026-11-14T09:15:00.000Z"
  }
];

// src/utils/commerce.ts
var STORE_ORIGIN_CEP = "74470538";
var DEFAULT_SHIPPING_CONFIG = {
  originCep: STORE_ORIGIN_CEP,
  goianiaExpressFee: 12,
  freeShippingMinSubtotal: 199,
  enableGoianiaExpress: true,
  enableStorePickup: true,
  enableCorreiosPac: true,
  enableCorreiosSedex: true,
  extraHandlingDays: 0
};
function sanitizeDigits(input) {
  return (input || "").replace(/\D/g, "");
}
function computeCorreiosRatesByCep(destCepRaw, weightGrams, city, state, config = DEFAULT_SHIPPING_CONFIG, subtotal = 0) {
  const cep = sanitizeDigits(destCepRaw);
  const weightKg = Math.max(0.3, weightGrams / 1e3);
  const extraKgSteps = Math.max(0, Math.ceil(weightKg - 1));
  const prefix1 = Number(cep[0] || 7);
  const prefix2 = Number(cep.slice(0, 2) || 74);
  const extraDays = Math.max(0, Number(config.extraHandlingDays || 0));
  const isGoianiaMetro = prefix2 === 74 || prefix2 === 75 || (city ? /goi[aâ]nia|aparecida de goi[aâ]nia|senador canedo|trindade/i.test(city) : false);
  let pacBase = 24.9;
  let pacDays = 6;
  let sedexBase = 41.5;
  let sedexDays = 3;
  if (prefix2 >= 70 && prefix2 <= 76) {
    pacBase = isGoianiaMetro ? 15.9 : 19.9;
    pacDays = isGoianiaMetro ? 2 : 4;
    sedexBase = isGoianiaMetro ? 21.9 : 29.9;
    sedexDays = isGoianiaMetro ? 1 : 2;
  } else if (prefix1 === 0 || prefix1 === 1 || prefix1 === 2 || prefix1 === 3) {
    pacBase = 25.4;
    pacDays = 6;
    sedexBase = 44.9;
    sedexDays = 3;
  } else if (prefix1 === 8 || prefix1 === 9) {
    pacBase = 28.9;
    pacDays = 7;
    sedexBase = 51.9;
    sedexDays = 3;
  } else if (prefix1 === 4 || prefix1 === 5) {
    pacBase = 34.5;
    pacDays = 9;
    sedexBase = 62.9;
    sedexDays = 4;
  } else {
    pacBase = 38.9;
    pacDays = 10;
    sedexBase = 69.9;
    sedexDays = 5;
  }
  const qualifiesFree = config.freeShippingMinSubtotal > 0 && subtotal >= config.freeShippingMinSubtotal;
  const pacPrice = qualifiesFree ? 0 : Math.round((pacBase + extraKgSteps * 5.8) * 100) / 100;
  const sedexPrice = Math.round((sedexBase + extraKgSteps * 9.5) * 100) / 100;
  const options = [];
  if (config.enableGoianiaExpress && (isGoianiaMetro || state === "GO" && /goi/i.test(city || ""))) {
    options.push({
      code: "GOIANIA_EXPRESS",
      service: "MOTOBOY_GOIANIA",
      label: "Entrega Expressa Goi\xE2nia & Regi\xE3o",
      price: qualifiesFree ? 0 : Number(config.goianiaExpressFee ?? 12),
      deliveryDays: 1,
      estimateText: qualifiesFree ? "Frete Gr\xE1tis \xB7 Hoje ou at\xE9 1 dia \xFAtil (Motoboy)" : "Hoje ou at\xE9 1 dia \xFAtil (Motoboy)",
      providerSource: "local-goiania"
    });
  }
  if (config.enableCorreiosPac) {
    const totalPacDays = pacDays + extraDays;
    options.push({
      code: "03298",
      service: "PAC",
      label: "Correios PAC",
      price: pacPrice,
      deliveryDays: totalPacDays,
      estimateText: qualifiesFree ? `Frete Gr\xE1tis \xB7 Entrega em at\xE9 ${totalPacDays} dias \xFAteis` : `Entrega em at\xE9 ${totalPacDays} dias \xFAteis`,
      providerSource: "tabela-correios"
    });
  }
  if (config.enableCorreiosSedex) {
    const totalSedexDays = sedexDays + extraDays;
    options.push({
      code: "03220",
      service: "SEDEX",
      label: "Correios SEDEX",
      price: sedexPrice,
      deliveryDays: totalSedexDays,
      estimateText: `Entrega em at\xE9 ${totalSedexDays} dias \xFAteis`,
      providerSource: "tabela-correios"
    });
  }
  if (config.enableStorePickup && isGoianiaMetro) {
    options.push({
      code: "RETIRADA_SOLAR_VILLE",
      service: "RETIRADA",
      label: "Retirar na Loja (Solar Ville \u2013 Goi\xE2nia)",
      price: 0,
      deliveryDays: 0,
      estimateText: "Dispon\xEDvel hoje ap\xF3s confirma\xE7\xE3o",
      providerSource: "local-goiania"
    });
  }
  return options;
}

// server.ts
var PORT = 3e3;
var ROOT_DIR = process.cwd();
var UPLOADS_DIR = path.join(ROOT_DIR, "uploads");
var DATA_DIR = path.join(ROOT_DIR, "data");
var DB_FILE = path.join(DATA_DIR, "store-db.json");
var ADMIN_EMAIL = "admin@x.com";
var ADMIN_PASS = "admin4321";
var ALLOWED_ADMIN_GOOGLE = "nonhu2490@gmail.com";
var SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || "bella-menina-makeup-goiania-secret-2026";
fs.mkdirSync(UPLOADS_DIR, { recursive: true });
fs.mkdirSync(DATA_DIR, { recursive: true });
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}
function verifyPassword(password, stored) {
  if (!stored || !stored.includes(":")) return false;
  const [salt, keyHex] = stored.split(":");
  const keyBuf = Buffer.from(keyHex, "hex");
  const derived = crypto.scryptSync(password, salt, 64);
  if (keyBuf.length !== derived.length) return false;
  return crypto.timingSafeEqual(keyBuf, derived);
}
function toPublicCustomer(c) {
  const { passwordHash: _ph, ...safe } = c;
  return safe;
}
function loadDB() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
      if (parsed && Array.isArray(parsed.products) && parsed.settings) {
        return {
          categories: Array.isArray(parsed.categories) && parsed.categories.length > 0 ? parsed.categories : INITIAL_CATEGORIES,
          products: parsed.products,
          orders: Array.isArray(parsed.orders) ? parsed.orders : INITIAL_ORDERS,
          coupons: Array.isArray(parsed.coupons) ? parsed.coupons : INITIAL_COUPONS,
          settings: {
            ...INITIAL_SETTINGS,
            ...parsed.settings,
            logoUrl: parsed.settings.logoUrl || INITIAL_SETTINGS.logoUrl,
            shippingConfig: {
              ...INITIAL_SETTINGS.shippingConfig,
              ...parsed.settings.shippingConfig || {}
            },
            paymentConfig: {
              ...INITIAL_SETTINGS.paymentConfig,
              ...parsed.settings.paymentConfig || {}
            }
          },
          feedbacks: Array.isArray(parsed.feedbacks) ? parsed.feedbacks : INITIAL_FEEDBACKS,
          customers: Array.isArray(parsed.customers) ? parsed.customers : INITIAL_CUSTOMERS.map((c) => ({ ...c, passwordHash: hashPassword("cliente123") })),
          waitlist: Array.isArray(parsed.waitlist) ? parsed.waitlist : INITIAL_WAITLIST,
          adminLogs: Array.isArray(parsed.adminLogs) ? parsed.adminLogs : INITIAL_ADMIN_LOGS
        };
      }
    }
  } catch {
  }
  const initial = {
    categories: INITIAL_CATEGORIES,
    products: INITIAL_PRODUCTS,
    orders: INITIAL_ORDERS,
    coupons: INITIAL_COUPONS,
    settings: INITIAL_SETTINGS,
    feedbacks: INITIAL_FEEDBACKS,
    customers: INITIAL_CUSTOMERS.map((c) => ({ ...c, passwordHash: hashPassword("cliente123") })),
    waitlist: INITIAL_WAITLIST,
    adminLogs: INITIAL_ADMIN_LOGS
  };
  fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), "utf8");
  return initial;
}
var dbState = loadDB();
var sseClients = /* @__PURE__ */ new Set();
function saveAndBroadcast() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(dbState, null, 2), "utf8");
  } catch (err) {
    console.error("Failed to persist store-db.json:", err);
  }
  const payload = `data: ${JSON.stringify({ type: "sync", updatedAt: Date.now() })}

`;
  for (const res of sseClients) {
    try {
      res.write(payload);
    } catch {
      sseClients.delete(res);
    }
  }
}
function appendAdminLog(actorEmail, action, entityType, details, entityId) {
  const entry = {
    id: `log-${Date.now()}-${Math.floor(Math.random() * 1e3)}`,
    actorEmail,
    action,
    entityType,
    ...entityId ? { entityId } : {},
    details,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  dbState.adminLogs = [entry, ...dbState.adminLogs].slice(0, 200);
}
function signSessionToken(user) {
  const exp = Date.now() + 7 * 24 * 60 * 60 * 1e3;
  const body = Buffer.from(JSON.stringify({ ...user, exp })).toString("base64url");
  const sig = crypto.createHmac("sha256", SESSION_SECRET).update(body).digest("base64url");
  return `${body}.${sig}`;
}
function verifyToken(token) {
  if (!token || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  const expected = crypto.createHmac("sha256", SESSION_SECRET).update(body).digest("base64url");
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (data.exp && Date.now() > data.exp) return null;
    if (!data.email || data.role !== "admin" && data.role !== "customer") return null;
    return data;
  } catch {
    return null;
  }
}
function parseCookies(cookieHeader) {
  const map = {};
  if (!cookieHeader) return map;
  for (const pair of cookieHeader.split(";")) {
    const idx = pair.indexOf("=");
    if (idx > -1) {
      const k = pair.slice(0, idx).trim();
      const v = pair.slice(idx + 1).trim();
      map[k] = decodeURIComponent(v);
    }
  }
  return map;
}
function getSessionFromReq(req) {
  const cookies = parseCookies(req.headers.cookie);
  const authHeader = req.headers.authorization;
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : void 0;
  return verifyToken(bearer || cookies["bm_session"] || cookies["bm_admin_session"]);
}
function setSessionCookie(res, token) {
  res.setHeader("Set-Cookie", [
    `bm_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`,
    `bm_admin_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`
  ]);
}
function clearSessionCookies(res) {
  res.setHeader("Set-Cookie", [
    "bm_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
    "bm_admin_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0"
  ]);
}
function requireAdmin(req, res, next) {
  const verified = getSessionFromReq(req);
  if (!verified || verified.role !== "admin") {
    return res.status(401).json({ error: "Acesso restrito a administradores." });
  }
  req.sessionUser = verified;
  next();
}
function requireAuth(req, res, next) {
  const verified = getSessionFromReq(req);
  if (!verified) {
    return res.status(401).json({ error: "Fa\xE7a login para continuar." });
  }
  req.sessionUser = verified;
  next();
}
var upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }
});
async function fetchWithTimeout(url, init, timeoutMs = 4500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}
async function queryLiveCorreiosRates(destCep, weightGrams, city, state, subtotal = 0) {
  const shippingConfig = dbState.settings.shippingConfig || DEFAULT_SHIPPING_CONFIG;
  const originCep = sanitizeDigits(shippingConfig.originCep || STORE_ORIGIN_CEP) || STORE_ORIGIN_CEP;
  const safeWeightKg = Math.max(0.3, Math.round(weightGrams / 1e3 * 100) / 100);
  const safeWeightGr = Math.max(300, Math.round(weightGrams));
  const localBase = computeCorreiosRatesByCep(
    destCep,
    weightGrams,
    city,
    state,
    shippingConfig,
    subtotal
  );
  if (process.env.CORREIOS_USER && process.env.CORREIOS_PASSWORD) {
    try {
      const basic = Buffer.from(
        `${process.env.CORREIOS_USER}:${process.env.CORREIOS_PASSWORD}`
      ).toString("base64");
      const tokenRes = await fetchWithTimeout("https://api.correios.com.br/token/v1/autentica", {
        method: "POST",
        headers: { Authorization: `Basic ${basic}` }
      });
      if (tokenRes.ok) {
        const tokenData = await tokenRes.json();
        if (tokenData.token) {
          const [pacRes, sedexRes] = await Promise.all([
            fetchWithTimeout(
              `https://api.correios.com.br/preco/v1/nacional/03298?cepOrigem=${originCep}&cepDestino=${destCep}&psObjeto=${safeWeightGr}`,
              { headers: { Authorization: `Bearer ${tokenData.token}` } }
            ),
            fetchWithTimeout(
              `https://api.correios.com.br/preco/v1/nacional/03220?cepOrigem=${originCep}&cepDestino=${destCep}&psObjeto=${safeWeightGr}`,
              { headers: { Authorization: `Bearer ${tokenData.token}` } }
            )
          ]);
          if (pacRes.ok && sedexRes.ok) {
            const pacData = await pacRes.json();
            const sedexData = await sedexRes.json();
            const pacVal = Number(String(pacData.pcFinal || "0").replace(",", "."));
            const sedexVal = Number(String(sedexData.pcFinal || "0").replace(",", "."));
            if (pacVal > 0 && sedexVal > 0) {
              return localBase.map((opt) => {
                if (opt.service === "PAC") {
                  return { ...opt, price: opt.price === 0 ? 0 : pacVal, providerSource: "correios-api" };
                }
                if (opt.service === "SEDEX") {
                  return { ...opt, price: sedexVal, providerSource: "correios-api" };
                }
                return opt;
              });
            }
          }
        }
      }
    } catch {
    }
  }
  try {
    const cepCertoPromise = (async () => {
      const cepCertoUrl = `https://www.cepcerto.com/ws/json-frete/${originCep}/${destCep}/${safeWeightGr}/12/16/20`;
      const res = await fetchWithTimeout(cepCertoUrl, void 0, 2200);
      if (!res.ok) throw new Error("cepcerto-not-ok");
      const data = await res.json();
      const pacPrice = Number(String(data.valorpac || "").replace(",", "."));
      const sedexPrice = Number(String(data.valorsedex || "").replace(",", "."));
      const pacDays = Number(data.prazopac || 0);
      const sedexDays = Number(data.prazosedex || 0);
      if (pacPrice <= 0 || sedexPrice <= 0) throw new Error("cepcerto-empty");
      return localBase.map((opt) => {
        if (opt.service === "PAC") {
          const days = (pacDays || opt.deliveryDays) + (shippingConfig.extraHandlingDays || 0);
          return {
            ...opt,
            price: opt.price === 0 ? 0 : Math.round(pacPrice * 100) / 100,
            deliveryDays: days,
            estimateText: opt.price === 0 ? `Frete Gr\xE1tis \xB7 Entrega em at\xE9 ${days} dias \xFAteis` : `Entrega em at\xE9 ${days} dias \xFAteis`,
            providerSource: "cepcerto-api"
          };
        }
        if (opt.service === "SEDEX") {
          const days = (sedexDays || opt.deliveryDays) + (shippingConfig.extraHandlingDays || 0);
          return {
            ...opt,
            price: Math.round(sedexPrice * 100) / 100,
            deliveryDays: days,
            estimateText: `Entrega em at\xE9 ${days} dias \xFAteis`,
            providerSource: "cepcerto-api"
          };
        }
        return opt;
      });
    })();
    const xmlPromise = (async () => {
      const xmlUrl = `http://ws.correios.com.br/calculador/CalcPrecoPrazo.asmx/CalcPrecoPrazo?nCdEmpresa=&sDsSenha=&nCdServico=04510,04014&sCepOrigem=${originCep}&sCepDestino=${destCep}&nVlPeso=${safeWeightKg}&nCdFormato=1&nVlComprimento=20&nVlAltura=12&nVlLargura=16&nVlDiametro=0&sCdMaoPropria=n&nVlValorDeclarado=0&sCdAvisoRecebimento=n&StrRetorno=xml`;
      const xmlRes = await fetchWithTimeout(xmlUrl, void 0, 2200);
      if (!xmlRes.ok) throw new Error("xml-not-ok");
      const xml = await xmlRes.text();
      const blocks = xml.match(/<cServico>[\s\S]*?<\/cServico>/g) || [];
      const parsedRates = {};
      for (const block of blocks) {
        const code = block.match(/<Codigo>(\d+)<\/Codigo>/)?.[1];
        const valor = Number(
          (block.match(/<Valor>([\d.,]+)<\/Valor>/)?.[1] || "0").replace(".", "").replace(",", ".")
        );
        const prazo = Number(block.match(/<PrazoEntrega>(\d+)<\/PrazoEntrega>/)?.[1] || "0");
        if (code === "04510" && valor > 0) parsedRates.PAC = { price: valor, days: prazo || 6 };
        if (code === "04014" && valor > 0) parsedRates.SEDEX = { price: valor, days: prazo || 3 };
      }
      if (!parsedRates.PAC || !parsedRates.SEDEX) throw new Error("xml-empty");
      return localBase.map((opt) => {
        if (opt.service === "PAC" && parsedRates.PAC) {
          const days = parsedRates.PAC.days + (shippingConfig.extraHandlingDays || 0);
          return {
            ...opt,
            code: "04510",
            price: opt.price === 0 ? 0 : parsedRates.PAC.price,
            deliveryDays: days,
            estimateText: opt.price === 0 ? `Frete Gr\xE1tis \xB7 Entrega em at\xE9 ${days} dias \xFAteis` : `Entrega em at\xE9 ${days} dias \xFAteis`,
            providerSource: "correios-api"
          };
        }
        if (opt.service === "SEDEX" && parsedRates.SEDEX) {
          const days = parsedRates.SEDEX.days + (shippingConfig.extraHandlingDays || 0);
          return {
            ...opt,
            code: "04014",
            price: parsedRates.SEDEX.price,
            deliveryDays: days,
            estimateText: `Entrega em at\xE9 ${days} dias \xFAteis`,
            providerSource: "correios-api"
          };
        }
        return opt;
      });
    })();
    return await Promise.any([cepCertoPromise, xmlPromise]);
  } catch {
  }
  return localBase;
}
async function startServer() {
  const app = express();
  app.use(express.json({ limit: "6mb" }));
  app.use("/uploads", express.static(UPLOADS_DIR));
  app.use("/src/assets", express.static(path.join(ROOT_DIR, "src/assets")));
  app.get("/api/store/stream", (req, res) => {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive"
    });
    res.write(`data: ${JSON.stringify({ type: "connected" })}

`);
    sseClients.add(res);
    req.on("close", () => {
      sseClients.delete(res);
    });
  });
  app.get("/api/store/state", (req, res) => {
    const session = getSessionFromReq(req);
    const isAdminUser = session?.role === "admin";
    const isCustomerUser = session?.role === "customer";
    let customerProfile = null;
    let customerOrders = [];
    let customerWaitlist = [];
    if (isCustomerUser && session) {
      const found = dbState.customers.find(
        (c) => c.id === session.id || c.email.toLowerCase() === session.email.toLowerCase()
      );
      if (found && !found.blocked) {
        customerProfile = toPublicCustomer(found);
        customerOrders = dbState.orders.filter(
          (o) => o.customerId === found.id || o.customerEmail && o.customerEmail.toLowerCase() === found.email.toLowerCase()
        );
        customerWaitlist = dbState.waitlist.filter((w) => w.customerId === found.id);
      }
    }
    res.json({
      categories: [...dbState.categories].sort((a, b) => a.order - b.order),
      products: dbState.products,
      coupons: dbState.coupons,
      settings: dbState.settings,
      feedbacks: dbState.feedbacks,
      orders: isAdminUser ? dbState.orders : customerOrders,
      customers: isAdminUser ? dbState.customers.map(toPublicCustomer) : [],
      adminLogs: isAdminUser ? dbState.adminLogs : [],
      customerProfile,
      customerWaitlist
    });
  });
  app.post("/api/auth/login", (req, res) => {
    const cleanEmail = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    if (!cleanEmail || !password) {
      return res.status(400).json({ error: "Informe e-mail e senha." });
    }
    if (cleanEmail === ADMIN_EMAIL) {
      if (password !== ADMIN_PASS) {
        return res.status(401).json({ error: "Senha de administrador incorreta." });
      }
      const user2 = {
        id: "admin-root",
        email: ADMIN_EMAIL,
        name: "Administradora Bella Menina",
        role: "admin"
      };
      const token2 = signSessionToken(user2);
      setSessionCookie(res, token2);
      appendAdminLog(ADMIN_EMAIL, "Login administrativo realizado", "auth", "Sess\xE3o iniciada via login \xFAnico.");
      saveAndBroadcast();
      return res.json({ authenticated: true, user: user2, token: token2 });
    }
    const customer = dbState.customers.find((c) => c.email.toLowerCase() === cleanEmail);
    if (!customer || !verifyPassword(password, customer.passwordHash)) {
      return res.status(401).json({ error: "E-mail ou senha inv\xE1lidos." });
    }
    if (customer.blocked) {
      return res.status(403).json({
        error: "Sua conta est\xE1 temporariamente bloqueada. Entre em contato pelo WhatsApp da loja."
      });
    }
    const user = {
      id: customer.id,
      email: customer.email,
      name: customer.name,
      role: "customer"
    };
    const token = signSessionToken(user);
    setSessionCookie(res, token);
    return res.json({
      authenticated: true,
      user,
      profile: toPublicCustomer(customer),
      token
    });
  });
  app.post("/api/auth/register", (req, res) => {
    const { name, email, password, phone, cpf, birthDate } = req.body || {};
    const cleanEmail = String(email || "").trim().toLowerCase();
    const cleanName = String(name || "").trim();
    const cleanPhone = String(phone || "").trim();
    if (!cleanName || !cleanEmail.includes("@") || String(password || "").length < 6) {
      return res.status(400).json({ error: "Preencha nome completo, e-mail v\xE1lido e senha com no m\xEDnimo 6 caracteres." });
    }
    if (cleanEmail === ADMIN_EMAIL || cleanEmail === ALLOWED_ADMIN_GOOGLE) {
      return res.status(403).json({ error: "Este e-mail \xE9 reservado \xE0 administra\xE7\xE3o." });
    }
    if (dbState.customers.some((c) => c.email.toLowerCase() === cleanEmail)) {
      return res.status(409).json({ error: "J\xE1 existe uma conta cadastrada com este e-mail." });
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const newCustomer = {
      id: `cust-${Date.now()}`,
      name: cleanName,
      email: cleanEmail,
      cpf: cpf ? String(cpf).trim() : "",
      birthDate: birthDate ? String(birthDate).trim() : "",
      phone: cleanPhone || "(62) 99999-0000",
      role: "customer",
      blocked: false,
      addresses: [],
      passwordHash: hashPassword(String(password)),
      createdAt: now,
      updatedAt: now
    };
    dbState.customers.unshift(newCustomer);
    saveAndBroadcast();
    const user = {
      id: newCustomer.id,
      email: newCustomer.email,
      name: newCustomer.name,
      role: "customer"
    };
    const token = signSessionToken(user);
    setSessionCookie(res, token);
    return res.status(201).json({
      authenticated: true,
      user,
      profile: toPublicCustomer(newCustomer),
      token
    });
  });
  app.post("/api/auth/google-sync", (req, res) => {
    const cleanEmail = String(req.body?.email || "").trim().toLowerCase();
    const cleanName = String(req.body?.name || "").trim() || "Cliente Bella Menina";
    const uid = String(req.body?.uid || "").trim();
    if (!cleanEmail) {
      return res.status(400).json({ error: "E-mail Google inv\xE1lido." });
    }
    if (cleanEmail === ALLOWED_ADMIN_GOOGLE || cleanEmail === ADMIN_EMAIL) {
      const user2 = {
        id: uid || "admin-google",
        email: cleanEmail,
        name: cleanName,
        role: "admin"
      };
      const token2 = signSessionToken(user2);
      setSessionCookie(res, token2);
      appendAdminLog(cleanEmail, "Login Google administrativo", "auth", "Autenticado via Google Firebase.");
      saveAndBroadcast();
      return res.json({ authenticated: true, user: user2, token: token2 });
    }
    let customer = dbState.customers.find((c) => c.email.toLowerCase() === cleanEmail);
    if (!customer) {
      const now = (/* @__PURE__ */ new Date()).toISOString();
      customer = {
        id: uid || `cust-${Date.now()}`,
        name: cleanName,
        email: cleanEmail,
        phone: "(62) 99999-0000",
        role: "customer",
        blocked: false,
        addresses: [],
        createdAt: now,
        updatedAt: now
      };
      dbState.customers.unshift(customer);
      saveAndBroadcast();
    } else if (customer.blocked) {
      return res.status(403).json({
        error: "Sua conta est\xE1 bloqueada pela administra\xE7\xE3o."
      });
    }
    const user = {
      id: customer.id,
      email: customer.email,
      name: customer.name,
      role: "customer"
    };
    const token = signSessionToken(user);
    setSessionCookie(res, token);
    return res.json({
      authenticated: true,
      user,
      profile: toPublicCustomer(customer),
      token
    });
  });
  app.get("/api/auth/session", (req, res) => {
    const verified = getSessionFromReq(req);
    if (!verified) {
      return res.json({ authenticated: false, user: null });
    }
    if (verified.role === "customer") {
      const c = dbState.customers.find((item) => item.id === verified.id);
      if (!c || c.blocked) {
        clearSessionCookies(res);
        return res.json({ authenticated: false, user: null });
      }
      return res.json({
        authenticated: true,
        user: { id: c.id, email: c.email, name: c.name, role: "customer" },
        profile: toPublicCustomer(c)
      });
    }
    return res.json({
      authenticated: true,
      user: { id: verified.id, email: verified.email, name: verified.name, role: verified.role }
    });
  });
  app.post("/api/auth/logout", (_req, res) => {
    clearSessionCookies(res);
    res.json({ ok: true });
  });
  app.post("/api/admin/login", (req, res) => {
    const cleanEmail = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    if (cleanEmail === ADMIN_EMAIL && password === ADMIN_PASS) {
      const user = {
        id: "admin-root",
        email: ADMIN_EMAIL,
        name: "Administradora Bella Menina",
        role: "admin"
      };
      const token = signSessionToken(user);
      setSessionCookie(res, token);
      return res.json({ authenticated: true, user, token });
    }
    return res.status(401).json({ error: "E-mail ou senha inv\xE1lidos." });
  });
  app.get("/api/admin/session", (req, res) => {
    const verified = getSessionFromReq(req);
    if (!verified || verified.role !== "admin") {
      return res.json({ authenticated: false });
    }
    return res.json({ authenticated: true, user: verified });
  });
  app.post("/api/admin/logout", (_req, res) => {
    clearSessionCookies(res);
    res.json({ ok: true });
  });
  app.put("/api/customer/profile", requireAuth, (req, res) => {
    const session = req.sessionUser;
    if (session.role !== "customer") {
      return res.status(403).json({ error: "Perfil exclusivo de clientes." });
    }
    const idx = dbState.customers.findIndex((c) => c.id === session.id);
    if (idx < 0) return res.status(404).json({ error: "Cliente n\xE3o encontrado." });
    const { name, email, cpf, birthDate, phone, secondaryPhone, addresses } = req.body || {};
    const current = dbState.customers[idx];
    const updated = {
      ...current,
      name: typeof name === "string" && name.trim().length >= 2 ? name.trim() : current.name,
      email: typeof email === "string" && email.includes("@") ? email.trim().toLowerCase() : current.email,
      cpf: typeof cpf === "string" ? cpf.trim() : current.cpf,
      birthDate: typeof birthDate === "string" ? birthDate.trim() : current.birthDate,
      phone: typeof phone === "string" && phone.trim() ? phone.trim() : current.phone,
      secondaryPhone: typeof secondaryPhone === "string" ? secondaryPhone.trim() : current.secondaryPhone,
      addresses: Array.isArray(addresses) ? addresses.slice(0, 10) : current.addresses,
      role: "customer",
      blocked: current.blocked,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    dbState.customers[idx] = updated;
    saveAndBroadcast();
    res.json(toPublicCustomer(updated));
  });
  app.post("/api/customer/password", requireAuth, (req, res) => {
    const session = req.sessionUser;
    if (session.role !== "customer") {
      return res.status(403).json({ error: "Somente clientes alteram senha por aqui." });
    }
    const idx = dbState.customers.findIndex((c) => c.id === session.id);
    if (idx < 0) return res.status(404).json({ error: "Cliente n\xE3o encontrado." });
    const { currentPassword, newPassword } = req.body || {};
    if (String(newPassword || "").length < 6) {
      return res.status(400).json({ error: "A nova senha deve ter no m\xEDnimo 6 caracteres." });
    }
    const cust = dbState.customers[idx];
    if (cust.passwordHash && !verifyPassword(String(currentPassword || ""), cust.passwordHash)) {
      return res.status(401).json({ error: "Senha atual incorreta." });
    }
    dbState.customers[idx] = {
      ...cust,
      passwordHash: hashPassword(String(newPassword)),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    saveAndBroadcast();
    res.json({ ok: true });
  });
  app.post("/api/customer/waitlist", requireAuth, (req, res) => {
    const session = req.sessionUser;
    const { productId } = req.body || {};
    const prod = dbState.products.find((p) => p.id === productId);
    if (!prod) return res.status(404).json({ error: "Produto n\xE3o encontrado." });
    const exists = dbState.waitlist.find(
      (w) => w.customerId === session.id && w.productId === prod.id
    );
    if (exists) return res.json(exists);
    const entry = {
      id: `wl-${Date.now()}`,
      customerId: session.id,
      customerEmail: session.email,
      productId: prod.id,
      productName: prod.name,
      productImage: prod.images[0] || "",
      productPrice: typeof prod.promoPrice === "number" && prod.promoPrice > 0 ? prod.promoPrice : prod.price,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    dbState.waitlist.unshift(entry);
    saveAndBroadcast();
    res.status(201).json(entry);
  });
  app.delete("/api/customer/waitlist/:productId", requireAuth, (req, res) => {
    const session = req.sessionUser;
    dbState.waitlist = dbState.waitlist.filter(
      (w) => !(w.customerId === session.id && w.productId === req.params.productId)
    );
    saveAndBroadcast();
    res.json({ ok: true });
  });
  app.post("/api/upload", upload.single("file"), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "Nenhum arquivo enviado do dispositivo." });
    }
    const ext = path.extname(req.file.originalname || "") || ".bin";
    const base = path.basename(req.file.originalname || "media", ext).replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 40);
    const filename = `bella-menina/${Date.now()}-${base}${ext}`;
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        const blob = await put(filename, req.file.buffer, {
          access: "public",
          token: process.env.BLOB_READ_WRITE_TOKEN,
          contentType: req.file.mimetype
        });
        return res.json({
          url: blob.url,
          pathname: blob.pathname,
          storage: "vercel-blob"
        });
      } catch (err) {
        console.error("Vercel Blob upload error:", err);
        return res.status(500).json({ error: "Falha ao enviar arquivo para o Vercel Blob." });
      }
    }
    const localName = `${Date.now()}-${base}${ext}`;
    fs.writeFileSync(path.join(UPLOADS_DIR, localName), req.file.buffer);
    return res.json({
      url: `/uploads/${localName}`,
      pathname: localName,
      storage: "local-preview"
    });
  });
  app.get("/api/cep/:cep", async (req, res) => {
    const cep = sanitizeDigits(req.params.cep);
    if (cep.length !== 8) {
      return res.status(400).json({ error: "CEP deve conter 8 d\xEDgitos." });
    }
    try {
      const viaRes = await fetchWithTimeout(`https://viacep.com.br/ws/${cep}/json/`, void 0, 2500);
      if (viaRes.ok) {
        const data = await viaRes.json();
        if (!data.erro && data.localidade) {
          return res.json({
            cep,
            street: data.logradouro || "",
            neighborhood: data.bairro || "",
            city: data.localidade || "",
            state: data.uf || ""
          });
        }
      }
    } catch {
    }
    try {
      const brRes = await fetchWithTimeout(
        `https://brasilapi.com.br/api/cep/v2/${cep}`,
        void 0,
        2500
      );
      if (brRes.ok) {
        const data = await brRes.json();
        if (data.city) {
          return res.json({
            cep,
            street: data.street || "",
            neighborhood: data.neighborhood || "",
            city: data.city || "",
            state: data.state || ""
          });
        }
      }
    } catch {
    }
    const KNOWN_CEPS = {
      "74470538": {
        street: "Alameda Higino Pires Martins",
        neighborhood: "Residencial Solar Ville",
        city: "Goi\xE2nia",
        state: "GO"
      },
      "74150050": {
        street: "Rua 135",
        neighborhood: "Setor Marista",
        city: "Goi\xE2nia",
        state: "GO"
      },
      "74000000": {
        street: "Avenida Goi\xE1s",
        neighborhood: "Setor Central",
        city: "Goi\xE2nia",
        state: "GO"
      },
      "01310100": {
        street: "Avenida Paulista",
        neighborhood: "Bela Vista",
        city: "S\xE3o Paulo",
        state: "SP"
      }
    };
    if (KNOWN_CEPS[cep]) {
      return res.json({ cep, ...KNOWN_CEPS[cep], source: "local-directory" });
    }
    const prefix2 = Number(cep.slice(0, 2));
    if (prefix2 >= 74 && prefix2 <= 76) {
      return res.json({
        cep,
        street: "",
        neighborhood: cep.startsWith("749") ? "Centro" : "Setor Urbano",
        city: cep.startsWith("749") ? "Aparecida de Goi\xE2nia" : "Goi\xE2nia",
        state: "GO",
        source: "postal-prefix"
      });
    }
    if (prefix2 >= 70 && prefix2 <= 73) {
      return res.json({ cep, street: "", neighborhood: "Plano Piloto", city: "Bras\xEDlia", state: "DF", source: "postal-prefix" });
    }
    if (prefix2 >= 1 && prefix2 <= 19) {
      return res.json({ cep, street: "", neighborhood: "Centro", city: "S\xE3o Paulo", state: "SP", source: "postal-prefix" });
    }
    if (prefix2 >= 20 && prefix2 <= 28) {
      return res.json({ cep, street: "", neighborhood: "Centro", city: "Rio de Janeiro", state: "RJ", source: "postal-prefix" });
    }
    if (prefix2 >= 30 && prefix2 <= 39) {
      return res.json({ cep, street: "", neighborhood: "Centro", city: "Belo Horizonte", state: "MG", source: "postal-prefix" });
    }
    if (prefix2 >= 40 && prefix2 <= 48) {
      return res.json({ cep, street: "", neighborhood: "Centro", city: "Salvador", state: "BA", source: "postal-prefix" });
    }
    if (prefix2 >= 50 && prefix2 <= 56) {
      return res.json({ cep, street: "", neighborhood: "Boa Viagem", city: "Recife", state: "PE", source: "postal-prefix" });
    }
    if (prefix2 >= 60 && prefix2 <= 63) {
      return res.json({ cep, street: "", neighborhood: "Aldeota", city: "Fortaleza", state: "CE", source: "postal-prefix" });
    }
    if (prefix2 >= 80 && prefix2 <= 87) {
      return res.json({ cep, street: "", neighborhood: "Batel", city: "Curitiba", state: "PR", source: "postal-prefix" });
    }
    if (prefix2 >= 90 && prefix2 <= 99) {
      return res.json({ cep, street: "", neighborhood: "Moinhos de Vento", city: "Porto Alegre", state: "RS", source: "postal-prefix" });
    }
    return res.json({ cep, street: "", neighborhood: "", city: "Brasil", state: "BR", source: "postal-prefix" });
  });
  app.post("/api/shipping/correios", async (req, res) => {
    const { destCep, weightGrams, city, state, subtotal } = req.body || {};
    const cleanCep = sanitizeDigits(String(destCep || ""));
    if (cleanCep.length !== 8) {
      return res.status(400).json({ error: "Informe um CEP de destino v\xE1lido (8 d\xEDgitos)." });
    }
    const safeWeight = Math.max(300, Number(weightGrams) || 300);
    const safeSubtotal = Math.max(0, Number(subtotal) || 0);
    const options = await queryLiveCorreiosRates(cleanCep, safeWeight, city, state, safeSubtotal);
    const originCep = sanitizeDigits(dbState.settings.shippingConfig?.originCep || STORE_ORIGIN_CEP) || STORE_ORIGIN_CEP;
    res.json({ originCep, destCep: cleanCep, weightGrams: safeWeight, options });
  });
  app.post("/api/orders", (req, res) => {
    const session = getSessionFromReq(req);
    const order = req.body;
    if (!order || !order.customerName || !Array.isArray(order.items) || order.items.length === 0) {
      return res.status(400).json({ error: "Dados do pedido inv\xE1lidos." });
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const saved = {
      ...order,
      id: order.id || `ord-${Date.now()}`,
      orderNumber: order.orderNumber || `BM-${Math.floor(1e3 + Math.random() * 9e3)}`,
      customerId: order.customerId || (session?.role === "customer" ? session.id : void 0),
      customerEmail: order.customerEmail || (session?.role === "customer" ? session.email : void 0),
      createdAt: now,
      updatedAt: now
    };
    dbState.orders.unshift(saved);
    for (const item of saved.items) {
      const prod = dbState.products.find((p) => p.id === item.productId);
      if (prod) {
        prod.stock = Math.max(0, prod.stock - item.quantity);
        prod.salesCount = (prod.salesCount || 0) + item.quantity;
        prod.updatedAt = now;
      }
    }
    if (saved.couponCode) {
      const cup = dbState.coupons.find(
        (c) => c.code.toUpperCase() === saved.couponCode?.toUpperCase()
      );
      if (cup) {
        cup.usedCount += 1;
        cup.updatedAt = now;
      }
    }
    if (session?.role === "admin") {
      appendAdminLog(
        session.email,
        `Pedido #${saved.orderNumber} registrado (${saved.origin})`,
        "order",
        `Total R$ ${saved.total.toFixed(2)} - Cliente: ${saved.customerName}`,
        saved.id
      );
    }
    saveAndBroadcast();
    res.status(201).json(saved);
  });
  app.post("/api/admin/products", requireAdmin, (req, res) => {
    const actor = req.sessionUser.email;
    const body = req.body;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const id = body.id || `prod-${Date.now()}`;
    const existingIdx = dbState.products.findIndex((p) => p.id === id);
    const record = {
      ...body,
      id,
      createdAt: existingIdx >= 0 ? dbState.products[existingIdx].createdAt : now,
      updatedAt: now
    };
    if (existingIdx >= 0) {
      dbState.products[existingIdx] = record;
      appendAdminLog(actor, "Produto atualizado", "product", `${record.name} (${record.sku})`, id);
    } else {
      dbState.products.unshift(record);
      appendAdminLog(actor, "Produto criado", "product", `${record.name} (${record.sku})`, id);
    }
    saveAndBroadcast();
    res.json(record);
  });
  app.delete("/api/admin/products/:id", requireAdmin, (req, res) => {
    const actor = req.sessionUser.email;
    const target = dbState.products.find((p) => p.id === req.params.id);
    dbState.products = dbState.products.filter((p) => p.id !== req.params.id);
    appendAdminLog(
      actor,
      "Produto exclu\xEDdo",
      "product",
      target ? `${target.name} (${target.sku})` : req.params.id,
      req.params.id
    );
    saveAndBroadcast();
    res.json({ ok: true });
  });
  app.patch("/api/admin/stock/:productId", requireAdmin, (req, res) => {
    const actor = req.sessionUser.email;
    const idx = dbState.products.findIndex((p) => p.id === req.params.productId);
    if (idx < 0) return res.status(404).json({ error: "Produto n\xE3o encontrado." });
    const nextStock = Math.max(0, Math.round(Number(req.body?.stock) || 0));
    const prevStock = dbState.products[idx].stock;
    dbState.products[idx] = {
      ...dbState.products[idx],
      stock: nextStock,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    appendAdminLog(
      actor,
      "Estoque ajustado",
      "stock",
      `${dbState.products[idx].sku}: ${prevStock} -> ${nextStock} un.`,
      dbState.products[idx].id
    );
    saveAndBroadcast();
    res.json(dbState.products[idx]);
  });
  app.post("/api/admin/categories", requireAdmin, (req, res) => {
    const actor = req.sessionUser.email;
    const rawName = String(req.body?.name || "").trim();
    if (rawName.length < 2 || rawName.length > 60) {
      return res.status(400).json({ error: "Nome da categoria deve ter entre 2 e 60 caracteres." });
    }
    const duplicate = dbState.categories.find(
      (c) => c.name.toLowerCase() === rawName.toLowerCase()
    );
    if (duplicate) {
      return res.status(409).json({ error: "J\xE1 existe uma categoria com esse nome." });
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const maxOrder = dbState.categories.reduce((max, c) => Math.max(max, c.order), -1);
    const id = String(req.body?.id || "").trim() || `cat-${Date.now()}`;
    const record = {
      id,
      name: rawName,
      imageUrl: typeof req.body?.imageUrl === "string" ? req.body.imageUrl.trim() : "",
      order: typeof req.body?.order === "number" && Number.isFinite(req.body.order) ? Math.max(0, Math.round(req.body.order)) : maxOrder + 1,
      createdAt: now,
      updatedAt: now
    };
    dbState.categories.push(record);
    dbState.categories.sort((a, b) => a.order - b.order);
    appendAdminLog(actor, "Categoria criada", "category", `${record.name}`, record.id);
    saveAndBroadcast();
    res.status(201).json(record);
  });
  app.put("/api/admin/categories/:id", requireAdmin, (req, res) => {
    const actor = req.sessionUser.email;
    const idx = dbState.categories.findIndex((c) => c.id === req.params.id);
    if (idx < 0) return res.status(404).json({ error: "Categoria n\xE3o encontrada." });
    const current = dbState.categories[idx];
    const nextName = req.body?.name !== void 0 ? String(req.body.name).trim() : current.name;
    if (nextName.length < 2 || nextName.length > 60) {
      return res.status(400).json({ error: "Nome da categoria deve ter entre 2 e 60 caracteres." });
    }
    const duplicate = dbState.categories.find(
      (c) => c.id !== current.id && c.name.toLowerCase() === nextName.toLowerCase()
    );
    if (duplicate) {
      return res.status(409).json({ error: "J\xE1 existe outra categoria com esse nome." });
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const updated = {
      ...current,
      name: nextName,
      imageUrl: req.body?.imageUrl !== void 0 ? String(req.body.imageUrl || "").trim() : current.imageUrl,
      order: typeof req.body?.order === "number" && Number.isFinite(req.body.order) ? Math.max(0, Math.round(req.body.order)) : current.order,
      updatedAt: now
    };
    dbState.categories[idx] = updated;
    dbState.categories.sort((a, b) => a.order - b.order);
    let renamedCount = 0;
    if (current.name !== updated.name) {
      dbState.products = dbState.products.map((p) => {
        if (p.category === current.name) {
          renamedCount += 1;
          return { ...p, category: updated.name, updatedAt: now };
        }
        return p;
      });
    }
    appendAdminLog(
      actor,
      "Categoria atualizada",
      "category",
      current.name !== updated.name ? `${current.name} -> ${updated.name} (${renamedCount} itens atualizados)` : `${updated.name}`,
      updated.id
    );
    saveAndBroadcast();
    res.json(updated);
  });
  app.delete("/api/admin/categories/:id", requireAdmin, (req, res) => {
    const actor = req.sessionUser.email;
    const target = dbState.categories.find((c) => c.id === req.params.id);
    if (!target) return res.status(404).json({ error: "Categoria n\xE3o encontrada." });
    const reassignTo = typeof req.body?.reassignTo === "string" ? req.body.reassignTo.trim() : typeof req.query?.reassignTo === "string" ? String(req.query.reassignTo).trim() : "";
    const now = (/* @__PURE__ */ new Date()).toISOString();
    let affected = 0;
    if (reassignTo && reassignTo !== target.name) {
      dbState.products = dbState.products.map((p) => {
        if (p.category === target.name) {
          affected += 1;
          return { ...p, category: reassignTo, updatedAt: now };
        }
        return p;
      });
    }
    dbState.categories = dbState.categories.filter((c) => c.id !== req.params.id);
    appendAdminLog(
      actor,
      "Categoria exclu\xEDda",
      "category",
      reassignTo ? `${target.name} (${affected} itens movidos para ${reassignTo})` : `${target.name}`,
      req.params.id
    );
    saveAndBroadcast();
    res.json({ ok: true });
  });
  app.post("/api/admin/coupons", requireAdmin, (req, res) => {
    const actor = req.sessionUser.email;
    const body = req.body;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const id = body.id || `cup-${Date.now()}`;
    const existingIdx = dbState.coupons.findIndex((c) => c.id === id);
    const record = {
      ...body,
      id,
      code: body.code.toUpperCase().trim(),
      createdAt: existingIdx >= 0 ? dbState.coupons[existingIdx].createdAt : now,
      updatedAt: now
    };
    if (existingIdx >= 0) {
      dbState.coupons[existingIdx] = record;
      appendAdminLog(actor, "Cupom atualizado", "coupon", `${record.code} (Ativo: ${record.active})`, id);
    } else {
      dbState.coupons.unshift(record);
      appendAdminLog(actor, "Cupom criado", "coupon", `${record.code}`, id);
    }
    saveAndBroadcast();
    res.json(record);
  });
  app.delete("/api/admin/coupons/:id", requireAdmin, (req, res) => {
    const actor = req.sessionUser.email;
    const target = dbState.coupons.find((c) => c.id === req.params.id);
    dbState.coupons = dbState.coupons.filter((c) => c.id !== req.params.id);
    appendAdminLog(actor, "Cupom exclu\xEDdo", "coupon", target?.code || req.params.id, req.params.id);
    saveAndBroadcast();
    res.json({ ok: true });
  });
  app.patch("/api/admin/orders/:id", requireAdmin, (req, res) => {
    const actor = req.sessionUser.email;
    const idx = dbState.orders.findIndex((o) => o.id === req.params.id);
    if (idx < 0) return res.status(404).json({ error: "Pedido n\xE3o encontrado." });
    const prev = dbState.orders[idx];
    const nextStatus = req.body?.status ?? prev.status;
    const nextTracking = req.body?.trackingCode !== void 0 ? String(req.body.trackingCode).trim() : prev.trackingCode;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    if (prev.status !== "cancelled" && nextStatus === "cancelled") {
      for (const item of prev.items) {
        const prod = dbState.products.find((p) => p.id === item.productId);
        if (prod) {
          prod.stock += item.quantity;
          prod.updatedAt = now;
        }
      }
    }
    dbState.orders[idx] = {
      ...prev,
      ...req.body,
      status: nextStatus,
      trackingCode: nextTracking,
      updatedAt: now
    };
    appendAdminLog(
      actor,
      "Pedido atualizado",
      "order",
      `#${prev.orderNumber} -> Status: ${nextStatus}${nextTracking ? ` \xB7 Rastreio: ${nextTracking}` : ""}`,
      prev.id
    );
    saveAndBroadcast();
    res.json(dbState.orders[idx]);
  });
  app.get("/api/admin/customers", requireAdmin, (_req, res) => {
    res.json(dbState.customers.map(toPublicCustomer));
  });
  app.post("/api/admin/customers", requireAdmin, (req, res) => {
    const actor = req.sessionUser.email;
    const body = req.body;
    const cleanEmail = String(body.email || "").trim().toLowerCase();
    if (!body.name || !cleanEmail.includes("@")) {
      return res.status(400).json({ error: "Nome e e-mail v\xE1lido s\xE3o obrigat\xF3rios." });
    }
    if (dbState.customers.some((c) => c.email.toLowerCase() === cleanEmail)) {
      return res.status(409).json({ error: "J\xE1 existe cliente com este e-mail." });
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const record = {
      id: `cust-${Date.now()}`,
      name: body.name.trim(),
      email: cleanEmail,
      cpf: body.cpf || "",
      birthDate: body.birthDate || "",
      phone: body.phone || "(62) 99999-0000",
      secondaryPhone: body.secondaryPhone || "",
      role: "customer",
      blocked: Boolean(body.blocked),
      addresses: Array.isArray(body.addresses) ? body.addresses : [],
      passwordHash: hashPassword(body.password || "cliente123"),
      createdAt: now,
      updatedAt: now
    };
    dbState.customers.unshift(record);
    appendAdminLog(actor, "Cliente cadastrado", "customer", `${record.name} (${record.email})`, record.id);
    saveAndBroadcast();
    res.status(201).json(toPublicCustomer(record));
  });
  app.put("/api/admin/customers/:id", requireAdmin, (req, res) => {
    const actor = req.sessionUser.email;
    const idx = dbState.customers.findIndex((c) => c.id === req.params.id);
    if (idx < 0) return res.status(404).json({ error: "Cliente n\xE3o encontrado." });
    const current = dbState.customers[idx];
    const body = req.body;
    const updated = {
      ...current,
      name: body.name !== void 0 ? String(body.name).trim() : current.name,
      email: body.email !== void 0 ? String(body.email).trim().toLowerCase() : current.email,
      cpf: body.cpf !== void 0 ? String(body.cpf).trim() : current.cpf,
      birthDate: body.birthDate !== void 0 ? String(body.birthDate).trim() : current.birthDate,
      phone: body.phone !== void 0 ? String(body.phone).trim() : current.phone,
      secondaryPhone: body.secondaryPhone !== void 0 ? String(body.secondaryPhone).trim() : current.secondaryPhone,
      blocked: body.blocked !== void 0 ? Boolean(body.blocked) : current.blocked,
      addresses: Array.isArray(body.addresses) ? body.addresses : current.addresses,
      role: "customer",
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    dbState.customers[idx] = updated;
    appendAdminLog(
      actor,
      updated.blocked !== current.blocked ? updated.blocked ? "Cliente bloqueado" : "Cliente desbloqueado" : "Cadastro de cliente editado",
      "customer",
      `${updated.name} (${updated.email})`,
      updated.id
    );
    saveAndBroadcast();
    res.json(toPublicCustomer(updated));
  });
  app.delete("/api/admin/customers/:id", requireAdmin, (req, res) => {
    const actor = req.sessionUser.email;
    const target = dbState.customers.find((c) => c.id === req.params.id);
    dbState.customers = dbState.customers.filter((c) => c.id !== req.params.id);
    dbState.waitlist = dbState.waitlist.filter((w) => w.customerId !== req.params.id);
    appendAdminLog(
      actor,
      "Cliente exclu\xEDdo",
      "customer",
      target ? `${target.name} (${target.email})` : req.params.id,
      req.params.id
    );
    saveAndBroadcast();
    res.json({ ok: true });
  });
  app.put("/api/admin/settings", requireAdmin, (req, res) => {
    const actor = req.sessionUser.email;
    dbState.settings = {
      ...dbState.settings,
      ...req.body,
      shippingConfig: {
        ...dbState.settings.shippingConfig || INITIAL_SETTINGS.shippingConfig,
        ...req.body?.shippingConfig || {}
      },
      paymentConfig: {
        ...dbState.settings.paymentConfig || INITIAL_SETTINGS.paymentConfig,
        ...req.body?.paymentConfig || {}
      },
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    appendAdminLog(actor, "Configura\xE7\xF5es atualizadas", "settings", "Altera\xE7\xF5es salvas e publicadas.");
    saveAndBroadcast();
    res.json(dbState.settings);
  });
  app.get("/api/admin/logs", requireAdmin, (_req, res) => {
    res.json(dbState.adminLogs);
  });
  app.get("/api/admin/backup", requireAdmin, (req, res) => {
    const actor = req.sessionUser.email;
    appendAdminLog(actor, "Backup exportado", "settings", "Download de backup completo em JSON.");
    saveAndBroadcast();
    res.setHeader("Content-Type", "application/json");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="bella-menina-backup-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.json"`
    );
    res.json({
      exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
      store: "Bella Menina Makeup",
      categories: dbState.categories,
      products: dbState.products,
      orders: dbState.orders,
      coupons: dbState.coupons,
      customers: dbState.customers.map(toPublicCustomer),
      waitlist: dbState.waitlist,
      settings: dbState.settings,
      feedbacks: dbState.feedbacks,
      adminLogs: dbState.adminLogs
    });
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(ROOT_DIR, "dist");
    app.use(express.static(distDir));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distDir, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Bella Menina Makeup server running on http://localhost:${PORT}`);
  });
}
startServer().catch((err) => {
  console.error("Server failed to start:", err);
  process.exit(1);
});
