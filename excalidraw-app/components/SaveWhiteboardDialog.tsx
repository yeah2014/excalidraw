import { useState, useRef } from "react";
import { KEYS } from "@excalidraw/excalidraw/keys";
import { Dialog } from "@excalidraw/excalidraw/components/Dialog";
import { TextField } from "@excalidraw/excalidraw/components/TextField";
import { FilledButton } from "@excalidraw/excalidraw/components/FilledButton";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { serializeAsJSON } from "@excalidraw/excalidraw/data/json";

import { getEnvVar } from "../utils/env";

const HTTP_STORAGE_BACKEND_URL = getEnvVar(
  "VITE_APP_HTTP_STORAGE_BACKEND_URL",
  "",
);

export type SaveWhiteboardDialogProps = {
  excalidrawAPI: ExcalidrawImperativeAPI | null;
  handleClose: () => void;
  onSaveSuccess?: () => void;
};

export const SaveWhiteboardDialog = ({
  excalidrawAPI,
  handleClose,
  onSaveSuccess,
}: SaveWhiteboardDialogProps) => {
  const [name, setName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSave = async () => {
    if (isSaving) {
      return; // 防止重复点击
    }

    if (!name.trim()) {
      setError("请输入白板名称");
      return;
    }

    if (!excalidrawAPI) {
      setError("无法获取白板数据");
      return;
    }

    if (!HTTP_STORAGE_BACKEND_URL) {
      setError("后端服务未配置");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      // 获取当前白板数据
      const elements = excalidrawAPI.getSceneElements();
      const appState = excalidrawAPI.getAppState();
      const files = excalidrawAPI.getFiles();

      // 序列化为 JSON
      const jsonData = serializeAsJSON(elements, appState, files, "local");

      // 转换为 base64
      const base64Data = btoa(unescape(encodeURIComponent(jsonData)));

      // 发送到后端
      const response = await fetch(`${HTTP_STORAGE_BACKEND_URL}/whiteboards`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          data: base64Data,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "保存失败");
      }

      await response.json();

      if (onSaveSuccess) {
        onSaveSuccess();
      }

      handleClose();

      // 显示成功提示
      if (excalidrawAPI) {
        excalidrawAPI.setToast({
          message: `白板 "${name}" 保存成功`,
        });
      }
    } catch (err: any) {
      setError(err.message || "保存失败，请重试");
      console.error("保存白板失败:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog size="small" onCloseRequest={handleClose} title="保存白板">
      <div style={{ padding: "1rem", minWidth: "300px" }}>
        <TextField
          ref={inputRef}
          label="白板名称"
          value={name}
          onChange={(value) => {
            setName(value);
            setError(null);
          }}
          onKeyDown={(event) => {
            if (event.key === KEYS.ENTER && !event.shiftKey) {
              event.preventDefault();
              handleSave();
            }
          }}
          placeholder="请输入白板名称"
        />

        {error && (
          <div
            style={{
              color: "var(--color-danger)",
              marginTop: "0.5rem",
              fontSize: "0.875rem",
            }}
          >
            {error}
          </div>
        )}

        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            justifyContent: "flex-end",
            marginTop: "1.5rem",
          }}
        >
          <FilledButton
            size="large"
            variant="outlined"
            label="取消"
            onClick={handleClose}
          />
          <FilledButton
            size="large"
            label={isSaving ? "保存中..." : "保存"}
            onClick={handleSave}
          />
        </div>
      </div>
    </Dialog>
  );
};
