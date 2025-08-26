# Terapotik Web

The modern web interface for the Terapotik MCP system, built with the latest web technologies.

## 🚀 **Tech Stack**

- **Next.js 15** - React framework with App Router
- **React 19** - Latest React with concurrent features
- **Tailwind CSS 4** - Modern utility-first CSS framework
- **TypeScript 5** - Type safety and developer experience
- **Next-Auth 5 (Beta)** - Authentication and session management

## 🛠️ **Development**

```bash
# Start development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Lint code
pnpm lint
```

## 📁 **Project Structure**

```
src/
├── app/                    # Next.js App Router
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # Reusable UI components
├── config/               # Configuration files
│   └── auth.config.ts    # NextAuth configuration
└── lib/                  # Utility functions
```

## 🔐 **Authentication**

This package uses NextAuth v5 (beta) for authentication with support for:
- OAuth providers (Google, GitHub, etc.)
- Custom authentication flows
- Session management
- JWT tokens

## 🌐 **Features**

- **Server-Side Rendering** - Fast initial page loads
- **Modern UI Components** - Built with Radix UI and shadcn/ui
- **Responsive Design** - Mobile-first approach
- **Dark Mode Support** - System and manual theme switching
- **Type Safety** - Full TypeScript integration

## 🔗 **Integration**

The web interface connects to:
- **Terapotik API** (`@terapotik/api`) - Backend services
- **Shared Package** (`@terapotik/shared`) - Common types and utilities
- **MCP Server** (`@terapotik/mcp-server`) - Model Context Protocol integration

## 📚 **Learn More**

- [Next.js Documentation](https://nextjs.org/docs)
- [React 19 Documentation](https://react.dev)
- [Tailwind CSS v4](https://tailwindcss.com/docs/v4-beta)
- [NextAuth.js](https://authjs.dev)