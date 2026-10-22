import { PresetTabs } from './PresetTabs';

type HeaderProps = {
  activePreset: string | null;
  onSelectPreset: (id: string) => void;
};

export function Header({ activePreset, onSelectPreset }: HeaderProps) {
  return (
    <header className="topbar">
      <div className="title-row">
        <div className="brand">
          <svg className="logo" viewBox="0 0 32 32" aria-hidden="true">
            <rect x="1" y="1" width="13" height="13" rx="3" />
            <rect x="18" y="1" width="13" height="13" rx="3" />
            <rect x="1" y="18" width="13" height="13" rx="3" />
            <rect x="18" y="18" width="13" height="13" rx="3" />
          </svg>
          <div>
            <h1>CSS Grid Concepts</h1>
            <p>Learn with engaging visual lessons</p>
          </div>
        </div>
        <p className="tag">HTML &amp; CSS</p>
      </div>
      <PresetTabs activeId={activePreset} onSelect={onSelectPreset} />
    </header>
  );
}
