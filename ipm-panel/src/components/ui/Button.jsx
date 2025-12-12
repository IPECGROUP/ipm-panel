export const LinkBtn = ({ to, children, className = "", variant = "ghost", ...props }) => {
  const base =
    "block text-center rounded-2xl px-3 py-2 border transition focus:outline-none focus:ring-2";
  const v =
    variant === "primary"
      ? "bg-white text-zinc-900 border-white/20 hover:bg-transparent hover:text-white hover:border-white/40 focus:ring-white/30"
      : "border-white/10 text-white bg-white/5 hover:bg-white/10 focus:ring-white/20";

  return (
    <Link to={to} {...props} className={`${base} ${v} ${className}`}>
      {children}
    </Link>
  );
};
