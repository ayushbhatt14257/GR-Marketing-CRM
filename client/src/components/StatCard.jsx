import { motion } from 'framer-motion';

export default function StatCard({ icon: Icon, label, value, color = 'brand', suffix = '' }) {
  return (
    <motion.div whileHover={{ y: -3 }} className="card p-4 md:p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl bg-${color}-50 dark:bg-${color}-500/10 text-${color}-600 dark:text-${color}-300 flex items-center justify-center shrink-0`}>
        {Icon && <Icon size={20} />}
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-extrabold tracking-tight truncate">{value}{suffix}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{label}</p>
      </div>
    </motion.div>
  );
}
