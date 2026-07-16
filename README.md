# ⚡ Kodefy Tech — SaaS Platform

Plataforma SaaS multitenant para la digitalización de negocios. Soluciones tecnológicas integrales: punto de venta, gestión de inventario, reportes en tiempo real y más.

## 🛠️ Tech Stack

- **Framework:** Next.js 16 + React 19
- **Base de datos:** Supabase (PostgreSQL + Auth + RLS)
- **Estilos:** Tailwind CSS 4
- **Animaciones:** Framer Motion + GSAP
- **UI Icons:** Lucide React
- **Charts:** Recharts
- **Maps:** Leaflet + React Leaflet
- **Deployment:** Vercel

## 🚀 Inicio Rápido

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env.local

# Iniciar servidor de desarrollo
npm run dev
```

## 📁 Estructura del Proyecto

```
├── src/
│   ├── app/          # Rutas y páginas (App Router)
│   ├── components/   # Componentes reutilizables
│   ├── contexts/     # Contextos de React
│   ├── hooks/        # Custom hooks
│   ├── lib/          # Utilidades y configuraciones
│   └── services/     # Servicios y lógica de negocio
├── sql/              # Scripts SQL para la base de datos
├── supabase/         # Configuración de Supabase
├── public/           # Archivos estáticos
└── docs/             # Documentación técnica
```

## 🗃️ Base de Datos

El esquema multitenant se encuentra en `supabase_schema_multitenant.sql` y los scripts auxiliares en la carpeta `sql/`. La arquitectura utiliza Row Level Security (RLS) para aislamiento de datos entre tenants.

## 📄 Licencia

Proyecto privado — © Kodefy Tech. Todos los derechos reservados.
