import { cn } from "@/lib/utils";
import { memo } from "react";

interface ToolBtnProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

function ToolBtn({ active, onClick, icon, label }: ToolBtnProps) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={cn(
        "h-8 w-8 flex items-center justify-center rounded-md transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-secondary hover:text-foreground",
      )}
    >
      {icon}
    </button>
  );
}

export default memo(ToolBtn);
