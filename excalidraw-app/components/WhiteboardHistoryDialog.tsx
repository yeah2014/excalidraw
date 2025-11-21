import { useState, useEffect } from "react";
import { Dialog } from "@excalidraw/excalidraw/components/Dialog";
import { FilledButton } from "@excalidraw/excalidraw/components/FilledButton";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { loadFromBlob } from "@excalidraw/excalidraw/data/blob";
import { getEnvVar } from "../utils/env";

const HTTP_STORAGE_BACKEND_URL = getEnvVar("VITE_APP_HTTP_STORAGE_BACKEND_URL", "");

interface Whiteboard {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export type WhiteboardHistoryDialogProps = {
  excalidrawAPI: ExcalidrawImperativeAPI | null;
  handleClose: () => void;
  onLoadSuccess?: () => void;
  onLoadWhiteboard?: (id: string) => Promise<void>;
};

export const WhiteboardHistoryDialog = ({
  excalidrawAPI,
  handleClose,
  onLoadSuccess,
  onLoadWhiteboard,
}: WhiteboardHistoryDialogProps) => {
  const [whiteboards, setWhiteboards] = useState<Whiteboard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingWhiteboard, setIsLoadingWhiteboard] = useState<string | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadWhiteboards();
  }, []);

  const loadWhiteboards = async () => {
    if (!HTTP_STORAGE_BACKEND_URL) {
      setError("后端服务未配置");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${HTTP_STORAGE_BACKEND_URL}/whiteboards`);

      if (!response.ok) {
        throw new Error("获取白板列表失败");
      }

      const data = await response.json();
      setWhiteboards(data.whiteboards || []);
    } catch (err: any) {
      setError(err.message || "获取白板列表失败");
      console.error("获取白板列表失败:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadWhiteboard = async (id: string) => {
    if (!excalidrawAPI) {
      setError("无法加载白板");
      return;
    }

    if (!HTTP_STORAGE_BACKEND_URL) {
      setError("后端服务未配置");
      return;
    }

    setIsLoadingWhiteboard(id);
    setError(null);

    try {
      // 如果提供了 onLoadWhiteboard 回调，使用它来处理切换白板的逻辑
      if (onLoadWhiteboard) {
        await onLoadWhiteboard(id);
        if (onLoadSuccess) {
          onLoadSuccess();
        }
        handleClose();
        const whiteboard = whiteboards.find((wb) => wb.id === id);
        excalidrawAPI.setToast({
          message: `已加载白板 "${whiteboard?.name || id}"，已开启自动保存`,
        });
        return;
      }

      // 否则使用旧的逻辑（向后兼容）
      const response = await fetch(
        `${HTTP_STORAGE_BACKEND_URL}/whiteboards/${id}`,
      );

      if (!response.ok) {
        throw new Error("加载白板失败");
      }

      // 获取二进制数据
      const arrayBuffer = await response.arrayBuffer();

      // 将 ArrayBuffer 转换为 Blob
      const blob = new Blob([arrayBuffer], {
        type: "application/octet-stream",
      });

      // 从 blob 加载数据
      const currentAppState = excalidrawAPI.getAppState();
      const currentElements = excalidrawAPI.getSceneElements();
      const data = await loadFromBlob(blob, currentAppState, currentElements);

      // 更新场景
      excalidrawAPI.updateScene({
        elements: data.elements,
        appState: data.appState,
      });

      // 如果有文件，添加文件
      if (data.files) {
        excalidrawAPI.addFiles(Object.values(data.files));
      }

      if (onLoadSuccess) {
        onLoadSuccess();
      }

      handleClose();

      // 显示成功提示
      const whiteboard = whiteboards.find((wb) => wb.id === id);
      excalidrawAPI.setToast({
        message: `已加载白板 "${whiteboard?.name || id}"`,
      });
    } catch (err: any) {
      setError(err.message || "加载白板失败");
      console.error("加载白板失败:", err);
    } finally {
      setIsLoadingWhiteboard(null);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  return (
    <Dialog size="small" onCloseRequest={handleClose} title="我的历史白板">
      <div style={{ padding: "1rem", minWidth: "400px", maxHeight: "500px" }}>
        {isLoading ? (
          <div style={{ textAlign: "center", padding: "2rem" }}>加载中...</div>
        ) : error ? (
          <div
            style={{
              color: "var(--color-danger)",
              textAlign: "center",
              padding: "1rem",
            }}
          >
            {error}
            <div style={{ marginTop: "1rem" }}>
              <FilledButton
                size="large"
                label="重试"
                onClick={loadWhiteboards}
              />
            </div>
          </div>
        ) : whiteboards.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2rem" }}>
            暂无保存的白板
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
              maxHeight: "400px",
              overflowY: "auto",
            }}
          >
            {whiteboards.map((whiteboard) => (
              <div
                key={whiteboard.id}
                style={{
                  padding: "0.75rem",
                  border: "1px solid var(--color-border)",
                  borderRadius: "0.5rem",
                  cursor:
                    isLoadingWhiteboard === whiteboard.id ? "wait" : "pointer",
                  opacity: isLoadingWhiteboard === whiteboard.id ? 0.6 : 1,
                  transition: "all 0.2s",
                }}
                onClick={() => {
                  if (isLoadingWhiteboard !== whiteboard.id) {
                    loadWhiteboard(whiteboard.id);
                  }
                }}
                onMouseEnter={(e) => {
                  if (isLoadingWhiteboard !== whiteboard.id) {
                    e.currentTarget.style.backgroundColor =
                      "var(--color-surface-low)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                <div
                  style={{
                    fontWeight: "500",
                    marginBottom: "0.25rem",
                  }}
                >
                  {whiteboard.name}
                </div>
                <div
                  style={{
                    fontSize: "0.875rem",
                    color: "var(--color-text-secondary)",
                  }}
                >
                  更新于: {formatDate(whiteboard.updatedAt)}
                </div>
                {isLoadingWhiteboard === whiteboard.id && (
                  <div
                    style={{
                      marginTop: "0.5rem",
                      fontSize: "0.875rem",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    加载中...
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginTop: "1rem",
            paddingTop: "1rem",
            borderTop: "1px solid var(--color-border)",
          }}
        >
          <FilledButton
            size="large"
            variant="outlined"
            label="关闭"
            onClick={handleClose}
          />
        </div>
      </div>
    </Dialog>
  );
};
