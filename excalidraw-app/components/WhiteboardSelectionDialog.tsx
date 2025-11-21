import { useState } from "react";
import { Dialog } from "@excalidraw/excalidraw/components/Dialog";
import { FilledButton } from "@excalidraw/excalidraw/components/FilledButton";
import { TextField } from "@excalidraw/excalidraw/components/TextField";
import { KEYS } from "@excalidraw/excalidraw/keys";
import { LoadIcon, save } from "@excalidraw/excalidraw/components/icons";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

const HTTP_STORAGE_BACKEND_URL =
  import.meta.env.VITE_APP_HTTP_STORAGE_BACKEND_URL || "";

interface Whiteboard {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export type WhiteboardSelectionDialogProps = {
  excalidrawAPI: ExcalidrawImperativeAPI | null;
  onNewWhiteboard: (name: string) => Promise<string>; // 返回白板ID
  onSelectWhiteboard: (id: string) => Promise<void>;
  onClose: () => void;
};

export const WhiteboardSelectionDialog = ({
  excalidrawAPI,
  onNewWhiteboard,
  onSelectWhiteboard,
  onClose,
}: WhiteboardSelectionDialogProps) => {
  const [mode, setMode] = useState<"select" | "new" | "history">("select");
  const [name, setName] = useState("");
  const [whiteboards, setWhiteboards] = useState<Whiteboard[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingWhiteboard, setIsLoadingWhiteboard] = useState<string | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const loadWhiteboards = async () => {
    if (!HTTP_STORAGE_BACKEND_URL) {
      setError("后端服务未配置");
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

  const handleCreateNew = async () => {
    if (!name.trim()) {
      setError("请输入白板名称");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const id = await onNewWhiteboard(name.trim());
      if (id) {
        onClose();
      }
    } catch (err: any) {
      setError(err.message || "创建白板失败");
      console.error("创建白板失败:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectWhiteboard = async (id: string) => {
    setIsLoadingWhiteboard(id);
    setError(null);

    try {
      await onSelectWhiteboard(id);
      onClose();
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

  // 选择模式：新建或历史
  if (mode === "select") {
    return (
      <Dialog size="small" onCloseRequest={onClose} title="选择白板">
        <div style={{ padding: "1rem", minWidth: "300px" }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
            }}
          >
            <FilledButton
              size="large"
              label="创建新白板"
              icon={save}
              onClick={() => setMode("new")}
            />
            <FilledButton
              size="large"
              variant="outlined"
              label="从历史白板中选择"
              icon={LoadIcon}
              onClick={() => {
                setMode("history");
                loadWhiteboards();
              }}
            />
          </div>
        </div>
      </Dialog>
    );
  }

  // 新建白板模式
  if (mode === "new") {
    return (
      <Dialog
        size="small"
        onCloseRequest={() => {
          setMode("select");
          setName("");
          setError(null);
        }}
        title="创建新白板"
      >
        <div style={{ padding: "1rem", minWidth: "300px" }}>
          <TextField
            label="白板名称"
            value={name}
            onChange={(value) => {
              setName(value);
              setError(null);
            }}
            onKeyDown={(event) => {
              if (event.key === KEYS.ENTER && !event.shiftKey) {
                event.preventDefault();
                handleCreateNew();
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
              label="返回"
              onClick={() => {
                setMode("select");
                setName("");
                setError(null);
              }}
            />
            <FilledButton
              size="large"
              label={isLoading ? "创建中..." : "创建"}
              onClick={handleCreateNew}
            />
          </div>
        </div>
      </Dialog>
    );
  }

  // 历史白板选择模式
  return (
    <Dialog
      size="small"
      onCloseRequest={() => {
        setMode("select");
        setError(null);
      }}
      title="选择历史白板"
    >
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
                    handleSelectWhiteboard(whiteboard.id);
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
            label="返回"
            onClick={() => {
              setMode("select");
              setError(null);
            }}
          />
        </div>
      </div>
    </Dialog>
  );
};
