import type { ReactNode } from "react";

const P: Record<string, ReactNode> = {
  check: <path d="M5 12l5 5 9-10" />,
  shield: <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />,
  clock: (<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>),
  thumb: <path d="M7 11v9H4v-9zM7 11l4-7c2 0 2 2 2 3v3h6l-1 8H7" />,
  speaker: <path d="M4 9v6h4l5 4V5L8 9zM16 9a4 4 0 0 1 0 6" />,
  flag: <path d="M5 21V4h11l-2 4 2 4H5" />,
  bell: <path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 21h4" />,
  camera: (<><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></>),
  back: <path d="M15 5l-7 7 7 7" />,
  image: (<><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 16l5-5 4 4 3-3 6 6" /></>),
  home: <path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  pin: (<><path d="M12 21s7-6.2 7-11a7 7 0 0 0-14 0c0 4.8 7 11 7 11z" /><circle cx="12" cy="10" r="2.5" /></>),
  calendar: (<><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>),
  chat: <path d="M4 5h16v11H9l-5 4z" />,
};

export function Icon({ name, className = "ic" }: { name: keyof typeof P; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      {P[name]}
    </svg>
  );
}
