import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface NavItem {
  path: string;
  icon: string;
  label: string;
  labelKey: string;
}

interface BottomNavProps {
  items: NavItem[];
}

export function BottomNav({ items }: BottomNavProps) {
  const { t } = useTranslation();

  return (
    <nav className="flex justify-around items-center h-16 px-2">
      {items.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center flex-1 h-full text-xs ${
              isActive
                ? 'text-indigo-600 font-semibold'
                : 'text-gray-500 hover:text-gray-700'
            }`
          }
        >
          <span className="text-2xl mb-1">{item.icon}</span>
          <span>{t(item.labelKey)}</span>
        </NavLink>
      ))}
    </nav>
  );
}


