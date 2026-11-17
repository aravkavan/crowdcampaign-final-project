import { useState } from 'react';

// Long text shown as one line, with a button to see all of it (keeps pages calm).
export default function ShortText({ text, className = '', more = 'Show all', less = 'Show less' }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="short-text">
      <p className={`${className} ${open ? '' : 'clamp-1'}`}>{text}</p>
      <button type="button" className="text-button" aria-expanded={open} onClick={() => setOpen(!open)}>
        {open ? less : more}
      </button>
    </div>
  );
}
