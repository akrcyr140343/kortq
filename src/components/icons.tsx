import type { ReactNode } from "react";

/**
 * Rounded line icons, drawn on a 24px grid with soft caps so they match the
 * Mitr/Fredoka letterforms. Decorative by default (aria-hidden) — every icon
 * sits next to a text label or inside a control with its own aria-label.
 */
function Svg({ className = "h-5 w-5", children, fill = "none" }: { className?: string; children: ReactNode; fill?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill={fill}
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

type P = { className?: string };

export const IconHistory = ({ className }: P) => (
  <Svg className={className}>
    <path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1" />
    <path d="M3.5 4.5V8h3.5" />
    <path d="M12 7.8v4.4l3 1.9" />
  </Svg>
);

export const IconPower = ({ className }: P) => (
  <Svg className={className}>
    <path d="M12 3.5v7.5" />
    <path d="M7.4 6.4a7.2 7.2 0 1 0 9.2 0" />
  </Svg>
);

export const IconLock = ({ className }: P) => (
  <Svg className={className}>
    <rect x="4.5" y="10.5" width="15" height="10" rx="3" />
    <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
    <path d="M12 14.6v2" />
  </Svg>
);

export const IconKey = ({ className }: P) => (
  <Svg className={className}>
    <circle cx="8" cy="15" r="4.2" />
    <path d="M11.2 12.2 19.5 4M16.5 7l2.4 2.4M14.4 9.1l1.8 1.8" />
  </Svg>
);

export const IconCrown = ({ className }: P) => (
  <Svg className={className} fill="currentColor">
    <path
      d="M4 8.5 8 12l4-6 4 6 4-3.5-1.6 9.2a1.6 1.6 0 0 1-1.6 1.3H7.2a1.6 1.6 0 0 1-1.6-1.3L4 8.5Z"
      strokeWidth={1.6}
    />
  </Svg>
);

export const IconCourt = ({ className }: P) => (
  <Svg className={className}>
    <rect x="3.5" y="4" width="17" height="16" rx="3.2" />
    <path d="M3.5 12h17M12 4v16" />
  </Svg>
);

export const IconPeople = ({ className }: P) => (
  <Svg className={className}>
    <circle cx="8.5" cy="8.5" r="2.8" />
    <circle cx="16.5" cy="9.5" r="2.3" />
    <path d="M3.5 19c.5-3.2 2.4-5 5-5s4.5 1.8 5 5" />
    <path d="M14.6 14.3c.6-.2 1.2-.3 1.9-.3 2.2 0 3.7 1.6 4 4.6" />
  </Svg>
);

export const IconPlus = ({ className }: P) => (
  <Svg className={className}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);

export const IconX = ({ className }: P) => (
  <Svg className={className}>
    <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
  </Svg>
);

export const IconTrash = ({ className }: P) => (
  <Svg className={className}>
    <path d="M5 7h14M9.5 7V5.2h5V7" />
    <path d="M7 7l.9 11.6a1.6 1.6 0 0 0 1.6 1.4h5a1.6 1.6 0 0 0 1.6-1.4L17 7" />
    <path d="M10.5 11v5M13.5 11v5" />
  </Svg>
);

export const IconDice = ({ className }: P) => (
  <Svg className={className}>
    <rect x="4" y="4" width="16" height="16" rx="4" />
    <circle cx="9" cy="9" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="15" cy="9" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="9" cy="15" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="15" cy="15" r="1.1" fill="currentColor" stroke="none" />
  </Svg>
);

export const IconSparkle = ({ className }: P) => (
  <Svg className={className}>
    <path d="M11 3.5c.6 3.9 2.6 5.9 6.5 6.5-3.9.6-5.9 2.6-6.5 6.5-.6-3.9-2.6-5.9-6.5-6.5 3.9-.6 5.9-2.6 6.5-6.5Z" />
    <path d="M18 15.5c.3 1.8 1.2 2.7 3 3-1.8.3-2.7 1.2-3 3-.3-1.8-1.2-2.7-3-3 1.8-.3 2.7-1.2 3-3Z" />
  </Svg>
);

export const IconTap = ({ className }: P) => (
  <Svg className={className}>
    <path d="M9.5 11.5V5.8a1.8 1.8 0 0 1 3.6 0v5" />
    <path d="M13.1 10.2a1.8 1.8 0 0 1 3.5.4v1.1a1.8 1.8 0 0 1 3.4.8v2.6a6 6 0 0 1-6 6h-.7a6 6 0 0 1-4.6-2.2l-3-3.7a1.7 1.7 0 0 1 2.5-2.3l1.3 1.2" />
  </Svg>
);

export const IconUserPlus = ({ className }: P) => (
  <Svg className={className}>
    <circle cx="9.5" cy="8" r="3.2" />
    <path d="M3.8 19.5c.6-3.4 2.8-5.4 5.7-5.4s5.1 2 5.7 5.4" />
    <path d="M18 7.5v6M15 10.5h6" />
  </Svg>
);

export const IconPlay = ({ className }: P) => (
  <Svg className={className} fill="currentColor">
    <path d="M8.2 5.3v13.4a1.2 1.2 0 0 0 1.8 1l10.4-6.7a1.2 1.2 0 0 0 0-2L10 4.3a1.2 1.2 0 0 0-1.8 1Z" strokeWidth={1.4} />
  </Svg>
);

export const IconCheck = ({ className }: P) => (
  <Svg className={className}>
    <path d="M5 12.5l4.2 4.2L19 7" />
  </Svg>
);

export const IconSearch = ({ className }: P) => (
  <Svg className={className}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M16 16l4 4" />
  </Svg>
);

export const IconFlag = ({ className }: P) => (
  <Svg className={className}>
    <path d="M5.5 20.5V4" />
    <path d="M5.5 4.5h11.2l-2.2 3.8 2.2 3.8H5.5" />
  </Svg>
);

export const IconMoon = ({ className }: P) => (
  <Svg className={className}>
    <path d="M19.5 14.2A7.8 7.8 0 1 1 9.8 4.5a6.3 6.3 0 0 0 9.7 9.7Z" />
  </Svg>
);

export const IconCoffee = ({ className }: P) => (
  <Svg className={className}>
    <path d="M5 10h11v4.5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5V10Z" />
    <path d="M16 11.5h1.2a2.6 2.6 0 0 1 0 5.2H15.6" />
    <path d="M8.5 3.8c-.8 1 .8 1.8 0 3M12 3.8c-.8 1 .8 1.8 0 3" />
  </Svg>
);

export const IconReturn = ({ className }: P) => (
  <Svg className={className}>
    <path d="M9 7.5 4.5 12 9 16.5" />
    <path d="M4.5 12H15a4.5 4.5 0 0 0 0-9h-1.5" />
  </Svg>
);

export const IconSwap = ({ className }: P) => (
  <Svg className={className}>
    <path d="M7 4.5 4 7.5l3 3M4 7.5h12.5" />
    <path d="M17 13.5l3 3-3 3M20 16.5H7.5" />
  </Svg>
);

export const IconTicket = ({ className }: P) => (
  <Svg className={className}>
    <path d="M3.5 8.2V6.5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2v1.7a2.6 2.6 0 0 0 0 5.2v1.7a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-1.7a2.6 2.6 0 0 0 0-5.2Z" />
    <path d="M14.5 5v2M14.5 10v2M14.5 15v2" />
  </Svg>
);

export const IconTimer = ({ className }: P) => (
  <Svg className={className}>
    <circle cx="12" cy="13.5" r="7" />
    <path d="M12 10v3.5l2.2 1.4M9.5 3h5M19 6.5l1.2-1.2" />
  </Svg>
);

export const IconArrowRight = ({ className }: P) => (
  <Svg className={className}>
    <path d="M5 12h14M13.5 6.5 19 12l-5.5 5.5" />
  </Svg>
);
