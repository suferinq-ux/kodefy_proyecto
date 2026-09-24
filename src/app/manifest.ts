import { MetadataRoute } from 'next'
 
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Kodefy POS',
    short_name: 'Kodefy POS',
    description: 'Sistema de Punto de Venta Kodefy',
    start_url: '/',
    display: 'standalone',
    background_color: '#f4f2ee',
    theme_color: '#0f172a',
    orientation: 'portrait',
    icons: [
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
