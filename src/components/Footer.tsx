export default function Footer() {
  return (
    <footer className="mt-20 sm:mt-32 border-t border-black/10 dark:border-white/10">
      <div className="mx-auto max-w-6xl px-5 sm:px-6 md:px-10 py-8 sm:py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 sm:gap-4 text-[11px] sm:text-[12px] tracking-widest2 uppercase opacity-60">
        <span>© {new Date().getFullYear()} Dirty_Sheep · All photographs reserved</span>
        <span className="font-serif italic normal-case tracking-normal text-[13px]">
          "摄影是按下快门的瞬间,把时间钉在墙上。"
        </span>
      </div>
    </footer>
  );
}
