import { useRef, useCallback, useEffect } from "react";
import { debounce } from "@excalidraw/excalidraw/utils";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { serializeAsJSON } from "@excalidraw/excalidraw/data/json";

const HTTP_STORAGE_BACKEND_URL =
  import.meta.env.VITE_APP_HTTP_STORAGE_BACKEND_URL || "";

export const useWhiteboardAutoSave = (
  excalidrawAPI: ExcalidrawImperativeAPI | null,
  whiteboardId: string | null,
) => {
  const isSavingRef = useRef(false);
  const lastSaveTimeRef = useRef<number>(0);
  const debouncedSaveRef = useRef<ReturnType<typeof debounce> | null>(null);
  // 使用 ref 存储最新的 whiteboardId，确保防抖函数执行时总是使用最新值
  const whiteboardIdRef = useRef<string | null>(whiteboardId);
  const excalidrawAPIRef = useRef<ExcalidrawImperativeAPI | null>(
    excalidrawAPI,
  );

  // 更新 ref
  useEffect(() => {
    console.log(
      "更新 whiteboardIdRef:",
      whiteboardId,
      "旧值:",
      whiteboardIdRef.current,
    );
    whiteboardIdRef.current = whiteboardId;
    excalidrawAPIRef.current = excalidrawAPI;
  }, [whiteboardId, excalidrawAPI]);

  const saveWhiteboard = useCallback(
    async (
      elements: any,
      appState: any,
      files: any,
      options?: { skipFrequencyCheck?: boolean; throwOnError?: boolean },
    ) => {
      // 从 ref 获取最新的值（每次执行时都重新获取，确保是最新的）
      const currentWhiteboardId = whiteboardIdRef.current;
      const currentAPI = excalidrawAPIRef.current;

      console.log(
        "saveWhiteboard 被调用，当前 whiteboardId:",
        currentWhiteboardId,
      );

      if (!currentWhiteboardId || !currentAPI || !HTTP_STORAGE_BACKEND_URL) {
        console.log("跳过保存:", {
          whiteboardId: currentWhiteboardId,
          hasAPI: !!currentAPI,
          hasURL: !!HTTP_STORAGE_BACKEND_URL,
        });
        if (options?.throwOnError) {
          throw new Error("保存条件不满足");
        }
        return false;
      }

      // 防止重复保存
      if (isSavingRef.current) {
        console.log("正在保存中，跳过");
        if (options?.throwOnError) {
          throw new Error("正在保存中");
        }
        return false;
      }

      // 限制保存频率（至少间隔1秒），除非跳过频率检查
      if (!options?.skipFrequencyCheck) {
        const now = Date.now();
        if (now - lastSaveTimeRef.current < 1000) {
          console.log("保存频率限制，跳过");
          if (options?.throwOnError) {
            throw new Error("保存频率限制");
          }
          return false;
        }
      }

      isSavingRef.current = true;
      lastSaveTimeRef.current = Date.now();

      try {
        // 再次从 ref 获取最新的值，确保在保存时使用的是最新的 whiteboardId
        // 这里不比较是否改变，而是直接使用最新的值
        const finalWhiteboardId = whiteboardIdRef.current;

        if (!finalWhiteboardId) {
          console.log("白板ID为空，取消保存");
          isSavingRef.current = false;
          if (options?.throwOnError) {
            throw new Error("白板ID为空");
          }
          return false;
        }

        // 如果 finalWhiteboardId 和 currentWhiteboardId 不同，说明在保存过程中 whiteboardId 已改变
        // 这种情况下，我们应该使用最新的 finalWhiteboardId，而不是取消保存
        if (finalWhiteboardId !== currentWhiteboardId) {
          console.log("警告: 保存过程中 whiteboardId 已改变，使用最新的值:", {
            original: currentWhiteboardId,
            current: finalWhiteboardId,
          });
        }

        console.log("开始保存白板:", finalWhiteboardId);

        // 序列化为 JSON
        const jsonData = serializeAsJSON(elements, appState, files, "local");

        // 转换为 base64
        const base64Data = btoa(unescape(encodeURIComponent(jsonData)));

        // 发送到后端（使用 finalWhiteboardId）
        const response = await fetch(
          `${HTTP_STORAGE_BACKEND_URL}/whiteboards/${finalWhiteboardId}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              data: base64Data,
            }),
          },
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error("保存白板失败:", response.status, errorText);
          if (options?.throwOnError) {
            throw new Error(`保存白板失败: ${response.status} ${errorText}`);
          }
          return false;
        }
        console.log("白板保存成功:", finalWhiteboardId);
        return true;
      } catch (error) {
        console.error("保存白板失败:", error);
        if (options?.throwOnError) {
          throw error;
        }
        return false;
      } finally {
        isSavingRef.current = false;
      }
    },
    [], // 不依赖任何外部变量，总是使用 ref 中的最新值
  );

  // 当 whiteboardId 改变时，重新创建 debounced 函数
  useEffect(() => {
    console.log(
      "useWhiteboardAutoSave: useEffect 执行，whiteboardId:",
      whiteboardId,
      "类型:",
      typeof whiteboardId,
      "是否为真:",
      !!whiteboardId,
    );

    // 取消之前的 debounced 函数
    if (debouncedSaveRef.current) {
      console.log("取消旧的防抖函数");
      debouncedSaveRef.current.cancel();
      debouncedSaveRef.current = null;
    }

    // 如果 whiteboardId 为空，不创建防抖函数
    if (!whiteboardId) {
      console.log("whiteboardId 为空，不创建防抖函数");
      return;
    }

    // 创建新的 debounced 函数
    console.log("开始创建新的防抖函数，whiteboardId:", whiteboardId);
    try {
      const debouncedFn = debounce(
        (elements: any, appState: any, files: any) => {
          console.log(
            "防抖函数执行，当前 whiteboardIdRef:",
            whiteboardIdRef.current,
          );
          saveWhiteboard(elements, appState, files);
        },
        2000,
      );
      debouncedSaveRef.current = debouncedFn;
      console.log(
        "✓ 防抖函数已创建并赋值，whiteboardId:",
        whiteboardId,
        "防抖函数存在:",
        !!debouncedSaveRef.current,
      );
    } catch (error) {
      console.error("创建防抖函数失败:", error);
    }

    // 清理函数
    return () => {
      console.log("清理防抖函数，whiteboardId:", whiteboardId);
      if (debouncedSaveRef.current) {
        debouncedSaveRef.current.cancel();
        debouncedSaveRef.current = null;
      }
    };
  }, [whiteboardId, saveWhiteboard]);

  // 返回 debounced 函数和取消函数
  const save = useCallback((elements: any, appState: any, files: any) => {
    // 在执行保存前，再次检查 whiteboardId 是否有效
    const currentWhiteboardId = whiteboardIdRef.current;
    if (!currentWhiteboardId) {
      console.log("跳过保存: whiteboardId 为空");
      return;
    }

    // 确保防抖函数存在
    if (!debouncedSaveRef.current) {
      console.log(
        "跳过保存: 防抖函数不存在，当前 whiteboardId:",
        currentWhiteboardId,
      );
      return;
    }

    console.log(
      "触发自动保存，当前白板ID:",
      currentWhiteboardId,
      "防抖函数存在:",
      !!debouncedSaveRef.current,
    );

    // 直接调用 saveWhiteboard，而不是通过防抖函数
    // 这样可以确保每次都使用最新的 whiteboardId
    // 但我们仍然使用防抖来限制调用频率
    debouncedSaveRef.current(elements, appState, files);
  }, []);

  const cancel = useCallback(() => {
    if (debouncedSaveRef.current) {
      console.log("取消自动保存任务");
      debouncedSaveRef.current.cancel();
      debouncedSaveRef.current = null;
    }
  }, []);

  // 立即保存函数（不使用防抖，不检查频率限制）
  const saveImmediately = useCallback(async () => {
    const currentWhiteboardId = whiteboardIdRef.current;
    const currentAPI = excalidrawAPIRef.current;

    if (!currentWhiteboardId || !currentAPI || !HTTP_STORAGE_BACKEND_URL) {
      console.log("跳过立即保存:", {
        whiteboardId: currentWhiteboardId,
        hasAPI: !!currentAPI,
        hasURL: !!HTTP_STORAGE_BACKEND_URL,
      });
      return false;
    }

    // 如果正在保存，等待完成
    if (isSavingRef.current) {
      console.log("正在保存中，等待完成...");
      // 等待最多5秒
      const maxWait = 5000;
      const startTime = Date.now();
      while (isSavingRef.current && Date.now() - startTime < maxWait) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      if (isSavingRef.current) {
        console.error("保存超时");
        return false;
      }
    }

    // 获取当前白板数据
    const elements = currentAPI.getSceneElements();
    const appState = currentAPI.getAppState();
    const files = currentAPI.getFiles();

    // 直接调用 saveWhiteboard（不使用防抖，跳过频率检查，抛出错误）
    const result = await saveWhiteboard(elements, appState, files, {
      skipFrequencyCheck: true,
      throwOnError: false,
    });
    return result === true;
  }, [saveWhiteboard]);

  return { save, cancel, saveImmediately };
};
