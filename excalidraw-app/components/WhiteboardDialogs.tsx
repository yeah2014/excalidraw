import { atom, useAtom } from "../app-jotai";
import { SaveWhiteboardDialog } from "./SaveWhiteboardDialog";
import { WhiteboardHistoryDialog } from "./WhiteboardHistoryDialog";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

export const saveWhiteboardDialogStateAtom = atom<boolean>(false);
export const whiteboardHistoryDialogStateAtom = atom<boolean>(false);

export const WhiteboardDialogs = ({
  excalidrawAPI,
  onLoadWhiteboard,
}: {
  excalidrawAPI: ExcalidrawImperativeAPI | null;
  onLoadWhiteboard?: (id: string) => Promise<void>;
}) => {
  const [saveWhiteboardDialogOpen, setSaveWhiteboardDialogOpen] = useAtom(
    saveWhiteboardDialogStateAtom,
  );
  const [whiteboardHistoryDialogOpen, setWhiteboardHistoryDialogOpen] = useAtom(
    whiteboardHistoryDialogStateAtom,
  );

  return (
    <>
      {saveWhiteboardDialogOpen && (
        <SaveWhiteboardDialog
          excalidrawAPI={excalidrawAPI}
          handleClose={() => setSaveWhiteboardDialogOpen(false)}
          onSaveSuccess={() => {
            // 可以在这里刷新历史白板列表
          }}
        />
      )}
      {whiteboardHistoryDialogOpen && (
        <WhiteboardHistoryDialog
          excalidrawAPI={excalidrawAPI}
          handleClose={() => setWhiteboardHistoryDialogOpen(false)}
          onLoadSuccess={() => {
            // 加载成功后的回调
          }}
          onLoadWhiteboard={onLoadWhiteboard}
        />
      )}
    </>
  );
};
