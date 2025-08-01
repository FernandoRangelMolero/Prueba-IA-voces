const RecordIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={className || "w-6 h-6"}
    fill="currentColor"
    viewBox="0 0 16 16"
  >
    <path d="M8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm0 1A5 5 0 1 1 8 3a5 5 0 0 1 0 10z" />
    <path d="M10 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0z" />
  </svg>
);

export default RecordIcon;