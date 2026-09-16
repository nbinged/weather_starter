import { themes, useTheme, type ThemeId } from '../theme';

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();

  return (
    <label className="theme-selector">
      <span className="theme-selector__label">Theme</span>
      <select
        value={theme}
        onChange={(event) => setTheme(event.target.value as ThemeId)}
        aria-label="Choose visual theme"
        className="theme-selector__control"
      >
        {themes.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
    </label>
  );
}
