/* ==========================================================================
   UMBRELLA CAFE — real business profile (sourced from Google Maps listing,
   Tripadvisor, Instagram & Facebook provided by the cafe)
   Edit everything here: phone, WhatsApp, hours, socials, service charge.
   ========================================================================== */
(function (global) {
  'use strict';

  global.UC_CONFIG = {
    name: 'Umbrella Cafe',
    legalName: 'The Umbrella Ella · Roti & Kottu Hub',
    tagline: 'Experience the taste of mountains',

    /* ---- contact ---- */
    phone: '+94 71 205 4801',
    phoneDisplay: '+94 71 205 4801',
    phoneAlt: '+94 76 022 9717',
    whatsapp: '94712054801',          // digits only, international format
    email: 'umbrellacafeella@gmail.com',

    /* ---- location ---- */
    address: {
      street: 'Passara Road, 3rd Mile Post',
      city: 'Ella',
      postal: '90090',
      region: 'Uva Province',
      country: 'Sri Lanka'
    },
    addressLine: 'Passara Road, 3rd Mile Post, Ella 90090, Uva Province, Sri Lanka',
    geo: { lat: 6.872309, lng: 81.05567 },
    timezone: 'Asia/Colombo',
    utcOffsetHours: 5.5,

    /* ---- social & listings ---- */
    social: {
      instagram: 'https://www.instagram.com/cafe_umbrella_',
      facebook: 'https://www.facebook.com/profile.php?id=61573828236464',
      google: 'https://share.google/cYiIixkUGF5D3pMt7',
      tripadvisor: 'https://www.tripadvisor.com/Restaurant_Review-g616035-d21064844-Reviews-Umbrella_Cafe-Ella_Uva_Province.html',
      whatsappChat: 'https://wa.me/94712054801'
    },

    /* ---- opening hours (24h, cafe local time) ---- */
    hours: {
      mon: ['09:00', '21:00'],
      tue: ['09:00', '21:00'],
      wed: ['09:00', '21:00'],
      thu: ['09:00', '21:00'],
      fri: ['09:00', '21:00'],
      sat: ['09:00', '18:00'],
      sun: ['09:00', '21:00']
    },
    hoursOrder: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],

    /* ---- ratings ---- */
    ratings: {
      google: { value: 4.6, count: '400+' },
      tripadvisor: { value: 4.8, count: '19' }
    },

    /* ---- commerce rules ---- */
    serviceCharge: 0.10,          // 10 % service charge added to the bill
    currency: 'LKR',
    currencySymbol: 'Rs.',
    delivery: {
      enabled: true,
      radiusKm: 6,
      note: 'Ella town, Passara Road & 3rd Mile area'
    },
    booking: { maxGuests: 20, holdMinutes: 15 },

    /* ---- admin web panel ---- */
    admin: {
      url: 'admin.html',
      defaultPin: '2024'          // change it inside the panel (Settings → PIN)
    },

    /* ---- kitchen defaults used by the ordering flow ---- */
    orderTypes: ['dineIn', 'takeaway', 'delivery'],

    /* ---- theme (green · blue · yellow · white) ---- */
    theme: {
      green: '#12805c',
      greenDeep: '#0a4d38',
      blue: '#0f6fb3',
      blueDeep: '#0a3f66',
      yellow: '#ffc21f',
      yellowSoft: '#ffe38a',
      white: '#ffffff'
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
