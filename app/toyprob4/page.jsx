// This file is a Server Component by default.
// It runs on the server to generate the initial HTML for the browser.

// This data is defined on the server. It's part of the component's code.
const learningTopics = [
  "What is a Server Component?",
  "What is a Client Component?",
  "How do they work together?",
];

export default function ThingsToLearnPage() {
  // This console.log runs in your TERMINAL, not the browser console.
  // This proves the component was executed on the server!
  console.log("Rendering the static topic list on the SERVER...");

  return (
    <div className="p-5 font-sans">
      <h1 className="text-2xl font-bold mb-4">Things to Learn</h1>
      <p className="mb-4">
        This list was pre-rendered into HTML on the server.
      </p>

      {/* The simplified list styling is here */}
      <ul className="pl-5">
        {learningTopics.map((topic) => (
          <li key={topic} className="my-2">
            {topic}
          </li>
        ))}
      </ul>
    </div>
  );
}
