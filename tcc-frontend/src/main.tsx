import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { createBrowserRouter, RouterProvider } from 'react-router';

const router = createBrowserRouter([
  {
    path: "/",
    Component: App,
  },
  {
    path: "/dispositivos",
    Component: App,
  },
  {
    path: "/sub-redes",
    Component: App,
  },
  {
    path: "/topologia",
    Component: App,
  },
]);


createRoot(document.getElementById('root')!).render(
  <StrictMode>
     <RouterProvider router={router} />
  </StrictMode>,
)
