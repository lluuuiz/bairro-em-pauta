import { NavLink, Outlet } from "react-router-dom";
import { Icon } from "./Icon";

const ITEMS = [
  { to: "/", label: "Início", icon: "home" },
  { to: "/mapa", label: "Mapa", icon: "pin" },
  { to: "/agenda", label: "Agenda", icon: "calendar" },
  { to: "/relatos", label: "Relatos", icon: "chat" },
] as const;

export default function Layout() {
  return (
    <div className="app">
      <Outlet />
      <nav className="nav" aria-label="Navegação principal">
        {ITEMS.map((i) => (
          <NavLink key={i.to} to={i.to} end={i.to === "/"} className={({ isActive }) => (isActive ? "active" : "")}>
            <Icon name={i.icon} className="" />
            {i.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
