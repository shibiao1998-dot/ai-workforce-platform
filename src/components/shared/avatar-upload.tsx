"use client";

import { useRef } from "react";
import { AiAvatar } from "@/components/shared/ai-avatar";
import { Camera } from "lucide-react";

interface AvatarUploadProps {
  employeeId: string;
  team: string;
  avatar: string | null;
  name: string;
  size?: "sm" | "md" | "lg";
  onUpload: (dataUrl: string) => Promise<void>;
  editable?: boolean;
}

export function AvatarUpload({
  employeeId,
  team,
  avatar,
  name,
  size = "lg",
  onUpload,
  editable = true,
}: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleClick() {
    if (editable) inputRef.current?.click();
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        onUpload(reader.result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  return (
    <div className="relative group cursor-pointer" onClick={handleClick}>
      <AiAvatar
        employeeId={employeeId}
        team={team}
        avatar={avatar}
        name={name}
        size={size}
      />
      {editable && (
        <div className="absolute inset-0 flex items-center justify-center rounded-[20%] bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
          <Camera className="h-5 w-5 text-white" />
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
}
