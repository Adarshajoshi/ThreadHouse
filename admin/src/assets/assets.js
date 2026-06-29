const svg = (markup) =>
  'data:image/svg+xml;utf8,' + encodeURIComponent(markup)

const logo = svg(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 40" width="180" height="40">
     <text x="0" y="28" font-family="Helvetica, Arial, sans-serif" font-weight="700"
           font-size="24" fill="#0f766e">ThreadHouse</text>
   </svg>`
)

const add_icon = svg(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"
        fill="none" stroke="#0f766e" stroke-width="2" stroke-linecap="round"
        stroke-linejoin="round">
     <circle cx="12" cy="12" r="10"/>
     <line x1="12" y1="8" x2="12" y2="16"/>
     <line x1="8" y1="12" x2="16" y2="12"/>
   </svg>`
)

const order_icon = svg(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"
        fill="none" stroke="#0f766e" stroke-width="2" stroke-linecap="round"
        stroke-linejoin="round">
     <path d="M9 11h6M9 15h6M7 4h10l2 4v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V8z"/>
   </svg>`
)

const parcel_icon = svg(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"
        fill="none" stroke="#0f766e" stroke-width="2" stroke-linecap="round"
        stroke-linejoin="round">
     <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
     <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
     <line x1="12" y1="22.08" x2="12" y2="12"/>
   </svg>`
)

const upload_area = svg(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"
        fill="none" stroke="#94a3b8" stroke-width="2.5" stroke-linecap="round"
        stroke-linejoin="round">
     <rect x="6" y="14" width="52" height="40" rx="4"/>
     <path d="M14 46l12-12 10 10 6-6 8 8"/>
     <circle cx="22" cy="26" r="3"/>
   </svg>`
)

export const assets = {
  logo,
  add_icon,
  order_icon,
  parcel_icon,
  upload_area,
}

export default assets
