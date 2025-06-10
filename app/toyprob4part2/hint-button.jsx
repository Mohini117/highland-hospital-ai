// We MUST add "use client" to make this interactive.
"use client";

import { useState } from "react";
//PascalCase
export default function HintButton({ hintText }) {
  // 'useState' is a hook that tracks state.It works on the client.
  const [showHint, setShowHint] = useState(false);

  function handleClick() {
    // This log runs in the BROWSER's developer console.
    console.log("Button clicked in the BROWSER!");
    setShowHint(true);
  }
  console.log("console log inside the body of the client compoenet");
  return (
    <div>
      <button
        onClick={handleClick}
        className="ml-2.5 cursor-pointer px-2.5 py-1"
      >
        Show Hint
      </button>
      {showHint && <p className="mt-2 text-green-600">Hint: {hintText}</p>}
    </div>
  );
}
