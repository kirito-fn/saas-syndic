import { createContext, useContext, useState, type ReactNode } from "react";
import { Outlet } from "react-router-dom";

interface PreviewContextType {
  previewBuildingId: number | null;
  setPreviewBuildingId: (id: number | null) => void;
}

const PreviewContext = createContext<PreviewContextType | null>(null);

export function PreviewProvider({ children }: { children?: ReactNode }) {
  const [previewBuildingId, setPreviewBuildingId] = useState<number | null>(null);

  return (
    <PreviewContext.Provider value={{ previewBuildingId, setPreviewBuildingId }}>
      {children || <Outlet />}
    </PreviewContext.Provider>
  );
}

export function usePreview() {
  const ctx = useContext(PreviewContext);
  if (!ctx) throw new Error("usePreview must be used within PreviewProvider");
  return ctx;
}
