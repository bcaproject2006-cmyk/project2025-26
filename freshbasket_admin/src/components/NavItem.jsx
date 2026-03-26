import { NavLink } from "react-router-dom";

const NavItem = ({ to, children }) => {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        isActive ? "nav-item nav-active" : "nav-item"
      }
    >
      {children}
    </NavLink>
  );
};

export default NavItem;