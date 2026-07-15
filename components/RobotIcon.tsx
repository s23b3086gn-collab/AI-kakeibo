// AI関連の表示で絵文字🤖の代わりに使う共通アイコン（public/icons/ai-robot.png）
export function RobotIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <img
      src="/icons/ai-robot.png"
      alt=""
      aria-hidden
      className={`inline-block shrink-0 align-middle ${className}`}
    />
  );
}
