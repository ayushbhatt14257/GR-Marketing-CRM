// Flex-based icon input — deliberately NOT using absolute-positioned icons
// over padded text (that approach broke in production: icon and placeholder
// text visually overlapped). This lays icon + input side by side in a flex
// row inside one bordered container, so there's no padding math to get wrong.
export default function IconInput({ icon: Icon, className = '', inputClassName = '', ...props }) {
  return (
    <div className={`flex items-center gap-2.5 rounded-xl border border-gray-200 dark:border-ink-700 bg-white dark:bg-ink-800 px-3.5 focus-within:ring-2 focus-within:ring-brand-500/50 focus-within:border-brand-500 transition-all ${className}`}>
      {Icon && <Icon size={16} className="text-gray-400 shrink-0" />}
      <input
        {...props}
        className={`flex-1 min-w-0 bg-transparent py-2.5 text-sm placeholder:text-gray-400 focus:outline-none ${inputClassName}`}
      />
    </div>
  );
}
